const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const { createHash, randomUUID } = require('node:crypto')
const { chromium, request } = require('playwright-core')

const frontend = 'http://localhost:' + (process.env.FRONTEND_HTTP_PORT || 8080)
const api = 'http://localhost:8000/api'
const base = '/discipline-reports'
const marker = randomUUID()
const records = []
const adminPassword = process.env.SCHOOL_DEMO_ADMIN_PASSWORD || 'password'

async function data(response, status = 200) {
  assert.equal(response.status(), status, await response.text())
  return (await response.json()).data
}

async function session(http, email, password = 'password') {
  const result = await data(await http.post(api + '/auth/login', { data: { email, password } }))
  return { Authorization: 'Bearer ' + result.token }
}

async function login(page, email, password = 'password') {
  if (!page.url().startsWith(frontend + '/')) await page.goto(frontend + '/login')
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.getByRole('button', { name: 'Logout', exact: true }).waitFor()
}

async function prepareReport(http, teacher, admin, studentId, name, validate = true) {
  const reportText = 'Rapport fictif de vérification du réexamen (' + name + ' ' + marker + ').'
  const originalType = 'Retard répété'
  const payload = { student_id: studentId, report_text: reportText }
  const analysis = await data(await http.post(api + base + '/analyze', { headers: teacher, data: payload, timeout: 150000 }))
  const id = analysis.analysis_id
  assert.ok(Number.isSafeInteger(id) && id > 0)
  records.push({ id, hash: createHash('sha256').update(reportText).digest('hex') })
  await data(await http.post(api + base + '/submit', { headers: teacher, data: { ...payload, analysis_id: id } }), 201)
  const original = validate ? await data(await http.post(api + base + '/review/' + id, {
    headers: admin, data: { severity: 2, incident_type: originalType },
  })) : null
  return { id, originalType, original, reportText, reference: original?.reference }
}

function cleanup() {
  if (!records.length) return
  const filter = records.map(({ id, hash }) => "(id = " + id + " AND text_hash = '" + hash + "')").join(' OR ')
  const result = spawnSync('docker', ['compose', 'exec', '-T', 'mysql', 'mysql', '-uschool_user', '-pschool_pass', '-N', '-B', 'school_db'], {
    input: 'DELETE FROM discipline_reports WHERE ' + filter + ';\nSELECT ROW_COUNT();\n',
    encoding: 'utf8',
  })
  if (result.error) throw result.error
  assert.equal(result.status, 0, result.stderr)
  assert.equal(Number(result.stdout.trim()), records.length)
  console.log('Rapports fictifs et demandes associées retirés.')
}

function row(page, reference) {
  return page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: reference, exact: true }) })
}

async function submitRequest(page, fixture, reason, checkEmpty) {
  const entry = row(page, fixture.reference)
  await entry.getByRole('button', { name: 'Demander un réexamen', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Demander un réexamen ' + fixture.reference, exact: true })
  const input = dialog.getByLabel('Motif de la demande')
  const submit = dialog.getByRole('button', { name: 'Envoyer la demande' })
  await dialog.getByText(fixture.reportText, { exact: true }).waitFor()
  assert.ok(await dialog.getByText(fixture.originalType, { exact: true }).isVisible())
  assert.ok(await dialog.getByText('Modéré', { exact: true }).isVisible())
  assert.ok(await dialog.locator('time').isVisible())
  if (checkEmpty) {
    await submit.click()
    assert.equal(await input.evaluate((element) => element.validity.valueMissing), true)
    await input.fill('   ')
    await submit.click()
    await dialog.getByRole('alert').getByText('Saisissez le motif de la demande.').waitFor()
  }
  await input.fill(reason)
  await submit.click()
  await entry.getByText('En attente', { exact: true }).waitFor()
  await entry.getByText('Modéré', { exact: true }).waitFor()
  assert.equal(await entry.getByRole('button', { name: 'Demander un réexamen' }).count(), 0)
  await entry.getByRole('button', { name: 'Voir la demande' }).click()
  const pending = page.getByRole('dialog', { name: 'Demande de réexamen' })
  await pending.getByText(reason, { exact: true }).waitFor()
  await pending.getByRole('button', { name: 'Fermer', exact: true }).click()
}

async function resolve(page, fixture, reason, reply, revise) {
  const button = page.getByRole('button', { name: 'Ouvrir le rapport ' + fixture.reference, exact: true })
  await button.locator('xpath=ancestor::tr').getByText('Réexamen en attente', { exact: true }).waitFor()
  await button.click()
  const panel = page.getByRole('region', { name: 'Demande de réexamen' })
  await panel.getByText(reason, { exact: true }).waitFor()
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), await page.evaluate(() => innerWidth))
  assert.ok(await panel.locator('time').isVisible())
  assert.ok(await panel.getByText(fixture.originalType, { exact: true }).isVisible())
  assert.ok(await panel.getByText('Modéré', { exact: true }).isVisible())
  await page.getByRole('article', { name: 'BERT + mots-clés' }).waitFor()
  await page.getByRole('article', { name: 'TF-IDF + régression logistique' }).waitFor()
  await panel.getByLabel('Suite à donner').selectOption(revise ? 'revised' : 'upheld')
  if (revise) {
    assert.equal(await panel.getByLabel('Gravité révisée').inputValue(), '2')
    await panel.getByLabel('Gravité révisée').selectOption('1')
    await panel.getByLabel('Type d’incident (facultatif)').fill(revise)
  }
  const submit = panel.getByRole('button', { name: 'Enregistrer le réexamen' })
  const response = panel.getByLabel('Réponse à l’élève')
  await submit.click()
  assert.equal(await response.evaluate((el) => el.validity.valueMissing), true)
  await response.fill(reply)
  await submit.click()
  await panel.getByRole('status').getByText('Réexamen enregistré.').waitFor()
  assert.ok(await panel.getByText(fixture.originalType, { exact: true }).isVisible())
  assert.equal(await submit.count(), 0)
  await page.getByRole('button', { name: 'Retour à la liste' }).click()
}

async function checkReply(page, reference, status, reply, severity) {
  const entry = row(page, reference)
  await entry.getByText(status, { exact: true }).waitFor()
  assert.ok(await entry.getByText(severity, { exact: true }).isVisible())
  await entry.getByRole('button', { name: 'Voir la réponse' }).click()
  const dialog = page.getByRole('dialog', { name: 'Réponse de l’administration' })
  await dialog.getByText(reply, { exact: true }).waitFor()
  await dialog.getByRole('button', { name: 'Fermer', exact: true }).click()
}

async function main() {
  const browser = await chromium.launch({ channel: 'msedge' })
  const http = await request.newContext()
  try {
    const [admin, teacher, student, other] = await Promise.all([
      session(http, 'admin@school.test', adminPassword), session(http, 'teacher@school.test'),
      session(http, 'student@school.test'), session(http, 'student.demo.other@school.test'),
    ])
    const profile = await data(await http.get(api + '/profile', { headers: student }))
    const upheld = await prepareReport(http, teacher, admin, profile.profile_id, 'maintien')
    const revised = await prepareReport(http, teacher, admin, profile.profile_id, 'révision')
    const race = await prepareReport(http, teacher, admin, profile.profile_id, 'concurrence', false)
    const requestPath = (id) => base + '/mine/' + id + '/reconsideration'
    const detailPath = (id) => api + base + '/mine/' + id
    const resolvePath = (id) => base + '/review/' + id + '/reconsideration'
    const post = async (path, headers, payload) => http.post(api + path, { headers, data: payload })
    await data(await post(requestPath(upheld.id), student, { reason: '  \n' }), 422)
    await data(await post(requestPath(upheld.id), other, { reason: 'Tentative hors périmètre' }), 404)
    await data(await post(requestPath(race.id), student, { reason: 'Rapport pas encore validé' }), 404)
    await data(await post(resolvePath(upheld.id), student, { outcome: 'upheld', response: 'Accès refusé' }), 403)
    await data(await post(resolvePath(upheld.id), teacher, { outcome: 'upheld', response: 'Accès refusé' }), 403)
    await data(await post(requestPath(upheld.id), admin, { reason: 'Accès refusé' }), 403)
    const list = await data(await http.get(api + base + '/mine', { headers: student }))
    assert.notEqual(upheld.reference, revised.reference)
    for (const fixture of [upheld, revised]) {
      const { id, reference, reportText } = fixture
      assert.match(reference, new RegExp('^RD-\\d{4}-' + String(id).padStart(4, '0') + '$'))
      const summary = list.find((entry) => entry.id === id)
      assert.equal(summary.reference, reference)
      assert.ok(!('report_text' in summary))
      const detail = await data(await http.get(detailPath(id), { headers: student }))
      assert.equal(detail.reference, reference)
      assert.equal(detail.report_text, reportText)
      assert.equal(detail.teacher_name, fixture.original.teacher_name)
      for (const privateField of ['predictions', 'reviewer_name', 'student_name']) assert.ok(!(privateField in detail))
    }
    await data(await http.get(detailPath(upheld.id), { headers: other }), 404)
    await data(await http.get(detailPath(race.id), { headers: student }), 404)
    await data(await http.get(detailPath(upheld.id), { headers: teacher }), 403)
    await data(await http.get(detailPath(upheld.id)), 401)

    const desktop = { width: 1440, height: 960 }
    const mobile = { width: 390, height: 844 }
    const page = await browser.newPage({ viewport: desktop })
    await login(page, 'student@school.test')
    const studentReports = page.getByRole('link', { name: 'Mes rapports disciplinaires', exact: true })
    await studentReports.click()
    for (const [viewport, fixture] of [[desktop, upheld], [mobile, revised]]) {
      await page.setViewportSize(viewport)
      if (viewport === mobile) {
        await page.getByRole('button', { name: 'Use dark mode' }).click()
        assert.equal(await page.locator('html').getAttribute('data-bs-theme'), 'dark')
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), await page.evaluate(() => innerWidth))
      }
      await row(page, fixture.reference).getByRole('button', { name: 'Voir les détails', exact: true }).click()
      const details = page.getByRole('dialog', { name: 'Détails du rapport ' + fixture.reference, exact: true })
      await details.getByText(fixture.reportText, { exact: true }).waitFor()
      await details.getByText(fixture.original.teacher_name, { exact: true }).waitFor()
      await details.getByRole('button', { name: 'Fermer', exact: true }).click()
    }

    const maintainReason = 'Je souhaite préciser le déroulement de l’incident.'
    const revisionReason = 'L’heure relevée dans le rapport doit être corrigée.'
    const maintainReply = 'Les éléments vérifiés confirment la décision initiale.'
    const revisionReply = 'Le contexte a été vérifié et la gravité a été corrigée.'
    const revisedType = 'Retard corrigé ' + marker
    await page.setViewportSize(desktop)
    await page.getByRole('button', { name: 'Use light mode' }).click()
    await submitRequest(page, upheld, maintainReason, true)
    const untouched = await data(await http.get(detailPath(revised.id), { headers: student }))
    assert.equal(untouched.reconsideration, null)
    await page.setViewportSize(mobile)
    await page.getByRole('button', { name: 'Use dark mode' }).click()
    await submitRequest(page, revised, revisionReason, false)
    await data(await post(requestPath(upheld.id), student, { reason: 'Deuxième demande' }), 409)
    await data(await post(resolvePath(upheld.id), admin, { outcome: 'upheld', response: ' ' }), 422)
    await data(await post(resolvePath(revised.id), admin, { outcome: 'revised', response: 'Gravité invalide', severity: 4 }), 422)
    const pending = await data(await http.get(api + base + '/review/' + revised.id, { headers: admin }))
    assert.equal(pending.status, 'validated')
    assert.equal(pending.finalized_severity, 2)
    assert.equal(pending.reconsideration.status, 'pending')

    await page.setViewportSize(desktop)
    await page.getByRole('button', { name: 'Logout', exact: true }).click()
    await login(page, 'admin@school.test', adminPassword)
    await page.getByRole('link', { name: 'Rapports disciplinaires', exact: true }).click()
    await resolve(page, upheld, maintainReason, maintainReply, null)
    await page.setViewportSize(mobile)
    await resolve(page, revised, revisionReason, revisionReply, revisedType)
    await data(await post(resolvePath(revised.id), admin, { outcome: 'upheld', response: 'Deuxième traitement' }), 409)
    await data(await post(requestPath(revised.id), student, { reason: 'Réouverture' }), 409)

    for (const [fixture, status, severity, type] of [
      [upheld, 'upheld', 2, upheld.originalType], [revised, 'revised', 1, revisedType],
    ]) {
      const report = await data(await http.get(api + base + '/review/' + fixture.id, { headers: admin }))
      assert.equal(report.status, 'validated')
      assert.equal(report.finalized_severity, severity)
      assert.equal(report.finalized_type, type)
      assert.equal(report.reconsideration.status, status)
      assert.equal(report.reconsideration.initial_severity, 2)
      assert.equal(report.reconsideration.initial_type, fixture.originalType)
      assert.ok(report.reconsideration.reviewed_at)
      assert.deepEqual(report.predictions, fixture.original.predictions)
    }
    const otherReports = await data(await http.get(api + base + '/mine', { headers: other }))
    assert.ok(!otherReports.some(({ id }) => id === revised.id || id === upheld.id))
    await page.setViewportSize(desktop)
    await page.getByRole('button', { name: 'Logout', exact: true }).click()
    await login(page, 'student@school.test')
    await studentReports.click()
    await checkReply(page, upheld.reference, 'Décision maintenue', maintainReply, 'Modéré')
    await page.setViewportSize(mobile)
    await checkReply(page, revised.reference, 'Décision révisée', revisionReply, 'Mineur')

    await data(await post(base + '/review/' + race.id, admin, { severity: 2, incident_type: race.originalType }))
    const parallel = await Promise.all(['Premier motif', 'Second motif'].map((reason) => post(requestPath(race.id), student, { reason })))
    assert.deepEqual(parallel.map((res) => res.status()).sort(), [201, 409])
    const parallelResolutions = await Promise.all(['Première réponse', 'Seconde réponse'].map((response) => post(resolvePath(race.id), admin, { response, outcome: 'upheld' })))
    assert.deepEqual(parallelResolutions.map((res) => res.status()).sort(), [200, 409])

    console.log('Edge 1440 × 960 et 390 × 844. Dépôt, maintien, révision, réponses, historique et propositions conservés.')
    console.log('API. Motif et réponse vides, gravité invalide, rapport non validé, accès hors périmètre et concurrence au dépôt et au traitement.')
  } finally {
    try {
      await http.dispose()
      await browser.close()
    } finally {
      cleanup()
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
