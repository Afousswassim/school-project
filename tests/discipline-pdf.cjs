const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const { createHash, randomUUID } = require('node:crypto')
const { mkdirSync, readFileSync } = require('node:fs')
const path = require('node:path')
const { chromium, request } = require('playwright-core')

const frontend = 'http://localhost:' + (process.env.FRONTEND_HTTP_PORT || 8080)
const api = 'http://localhost:8000/api'
const review = '/discipline-reports/review'
const artifacts = path.join(__dirname, 'artifacts', 'discipline-pdf')
const adminPassword = process.env.SCHOOL_DEMO_ADMIN_PASSWORD || 'password'
const fixtures = []

async function data(response, status = 200) {
  const body = await response.json()
  assert.equal(response.status(), status, body.message)
  return body.data
}

async function login(http, email, password = 'password') {
  const { token } = await data(await http.post(api + '/auth/login', { data: { email, password } }))
  return { Authorization: 'Bearer ' + token }
}

async function prepareReport(http, headers, studentId, reportText) {
  const payload = { student_id: studentId, report_text: reportText }
  const analysis = await data(await http.post(api + '/discipline-reports/analyze', { headers, data: payload, timeout: 150_000 }))
  const id = analysis.analysis_id
  assert.ok(Number.isSafeInteger(id) && id > 0)
  fixtures.push({ id, hash: createHash('sha256').update(reportText).digest('hex') })
  assert.ok(analysis.bert.result, analysis.bert.error)
  assert.ok(analysis.ml.result, analysis.ml.error)
  await data(await http.post(api + '/discipline-reports/submit', {
    headers, data: { ...payload, analysis_id: id },
  }), 201)
  return id
}

async function download(page, button, id) {
  const [file] = await Promise.all([page.waitForEvent('download'), button.click()])
  const name = 'rapport-disciplinaire-' + String(id).padStart(3, '0') + '.pdf'
  assert.equal(file.suggestedFilename(), name)
  const dest = path.join(artifacts, name)
  await file.saveAs(dest)
  assert.equal(readFileSync(dest).subarray(0, 5).toString(), '%PDF-')
  console.log(dest)
}

function cleanup() {
  if (fixtures.length === 0) return
  const filter = fixtures.map(({ id, hash }) => "(id = " + id + " AND text_hash = '" + hash + "')").join(' OR ')
  const result = spawnSync('docker', ['compose', 'exec', '-T', 'mysql', 'mysql', '-uschool_user', '-pschool_pass', '-N', '-B', 'school_db'], {
    input: 'DELETE FROM discipline_reports WHERE ' + filter + ';\nSELECT ROW_COUNT();\n',
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(Number(result.stdout.trim()), fixtures.length)
}

async function main() {
  mkdirSync(artifacts, { recursive: true })
  const http = await request.newContext()
  const browser = await chromium.launch({ channel: 'msedge' })
  try {
    const [admin, teacher, student] = await Promise.all([
      login(http, 'admin@school.test', adminPassword), login(http, 'teacher@school.test'), login(http, 'student@school.test'),
    ])
    const profile = await data(await http.get(api + '/profile', { headers: student }))
    const short = await prepareReport(http, teacher, profile.profile_id,
      'Rapport fictif de vérification PDF ' + randomUUID() + '. L’élève est arrivé en retard. Aucun échange n’a perturbé la séance.')
    const longText = Array.from({ length: 59 }, (_, i) =>
      'Observation ' + (i + 1) + '. À l’entrée du cours, l’élève a expliqué son retard et a rejoint sa place. Le récit décrit les faits observés.').join('\n')
      + '\nDernière observation : l’élève a présenté ses excuses à l’enseignant.'
    const long = await prepareReport(http, teacher, profile.profile_id, longText)

    const page = await browser.newPage()
    await page.goto(frontend + '/login')
    await page.getByLabel('Email', { exact: true }).fill('admin@school.test')
    await page.getByLabel('Password', { exact: true }).fill(adminPassword)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.getByRole('button', { name: 'Logout', exact: true }).waitFor()

    const pdfPath = (id) => api + review + '/' + id + '/pdf'
    const pending = await http.get(pdfPath(long), { headers: admin })
    assert.equal(pending.status(), 404)
    await page.goto(frontend + review)
    const { reference } = await data(await http.get(api + review + '/' + long, { headers: admin }))
    const openLong = page.getByRole('button', { name: 'Ouvrir le rapport ' + reference, exact: true })
    await openLong.waitFor()
    assert.equal(await page.getByRole('button', { name: 'Télécharger le PDF du rapport ' + long, exact: true }).count(), 0)
    await openLong.click()
    await page.getByRole('heading', { name: 'Rapport ' + reference, exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Télécharger le PDF', exact: true }).count(), 0)

    for (const id of [short, long]) {
      await data(await http.post(api + review + '/' + id, { headers: admin, data: { severity: 2, incident_type: 'Retard répété' } }))
    }
    await data(await http.post(api + '/discipline-reports/mine/' + long + '/reconsideration', {
      headers: student, data: { reason: 'Le retard est lié à une évacuation annoncée par l’établissement.' },
    }), 201)
    await data(await http.post(api + review + '/' + long + '/reconsideration', {
      headers: admin, data: { outcome: 'revised', severity: 1, incident_type: 'Retard isolé', response: 'Les éléments transmis justifient la révision.' },
    }))

    for (const [headers, status, label] of [[undefined, 401, 'Anonyme'], [teacher, 403, 'Enseignant'], [student, 403, 'Élève']]) {
      const response = await http.get(pdfPath(short), { headers })
      assert.equal(response.status(), status)
      console.log(label + ' → HTTP ' + status)
    }
    assert.equal((await http.get(pdfPath(2147483647), { headers: admin })).status(), 404)
    const response = await http.get(pdfPath(short), { headers: admin })
    assert.equal(response.status(), 200)
    assert.equal(response.headers()['content-type'], 'application/pdf')
    assert.match(response.headers()['cache-control'], /no-store/)

    await page.goto(frontend + review)
    await download(page, page.getByRole('button', { name: 'Télécharger le PDF du rapport ' + short, exact: true }), short)
    await openLong.click()
    await download(page, page.getByRole('button', { name: 'Télécharger le PDF', exact: true }), long)
    console.log('Téléchargements Edge réussis. Rapport en attente et rapport inexistant → HTTP 404.')
  } finally {
    await browser.close()
    await http.dispose()
    cleanup()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
