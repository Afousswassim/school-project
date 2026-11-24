const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { chromium, request } = require('playwright-core')

const frontendUrl = `http://localhost:${process.env.FRONTEND_HTTP_PORT || 8080}`
const apiUrl = 'http://localhost:8000/api'
const analyzeUrl = `${apiUrl}/discipline-reports/analyze`
const reportsUrl = `${apiUrl}/discipline-reports`
const late = 'L’élève est arrivé en retard de dix minutes'
const negation = 'L’élève n’a porté aucun coup et a repris le cours'
const bertTitle = 'BERT + mots-clés'
const mlTitle = 'TF-IDF + régression logistique'
const unavailable = 'Cette méthode est momentanément indisponible.'
const percent = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 1 })

async function assertStatus(http, url, options, expected, label) {
  const response = await http.post(url, options)
  assert.equal(response.status(), expected, `${label} ${await response.text()}`)
  console.log(`${label} → HTTP ${expected}`)
}

async function analyze(page, report, expectedBertLevel, missingMethod) {
  await page.getByLabel('Texte du rapport').fill(report)
  const responsePending = page.waitForResponse(
    (response) => response.url() === analyzeUrl && response.request().method() === 'POST',
    { timeout: 150_000 },
  )
  await page.getByRole('button', { name: 'Analyser' }).click()
  const response = await responsePending
  assert.equal(response.status(), 200)
  const { data } = await response.json()
  const bert = page.getByRole('article', { name: bertTitle })
  const ml = page.getByRole('article', { name: mlTitle })
  await bert.waitFor()
  await ml.waitFor()

  if (missingMethod === 'bert') {
    assert.match(await bert.innerText(), new RegExp(unavailable))
  } else {
    assert.ok(data.bert.result, data.bert.error)
    if (expectedBertLevel !== undefined) assert.equal(data.bert.result.disciplinary_level, expectedBertLevel)
    assert.match(await bert.innerText(), /Raison[\s\S]*Sentiment[\s\S]*[1-5]\/5/)
  }
  if (missingMethod === 'ml') {
    assert.match(await ml.innerText(), new RegExp(unavailable))
  } else {
    assert.ok(data.ml.result, data.ml.error)
    const probabilities = Object.values(data.ml.result.probabilities)
    assert.equal(probabilities.length, 3)
    assert.ok(Math.abs(probabilities.reduce((sum, value) => sum + value, 0) - 1) < 1e-6)
    const mlText = await ml.innerText()
    assert.match(mlText, /Probabilités/)
    for (const probability of probabilities) assert.ok(mlText.includes(percent.format(probability)))
    assert.ok(mlText.includes(data.ml.result.incident_type || 'Type indisponible'))
    if (data.ml.result.incident_type_probabilities) {
      const distribution = data.ml.result.incident_type_probabilities
      assert.equal(Object.keys(distribution).length, 10)
      assert.ok(Math.abs(Object.values(distribution).reduce((sum, value) => sum + value, 0) - 1) < 1e-6)
      const label = data.ml.result.incident_type
      const score = percent.format(distribution[label])
      assert.ok(mlText.includes(`${label} (${score})`))
      assert.equal(mlText.includes('Vérification humaine requise'), data.ml.result.requires_human_review)
    }
  }
  console.log(JSON.stringify({ report, bert: await bert.innerText(), ml: await ml.innerText() }))
  return data
}

async function login(page, email) {
  await page.goto(frontendUrl)
  await page.locator('input[type=email]').fill(email)
  await page.locator('input[type=password]').fill('password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByRole('button', { name: 'Logout' }).waitFor()
  const token = await page.evaluate(() => localStorage.getItem('school_token'))
  return { Authorization: `Bearer ${token}` }
}

async function read(http, path, headers, expected = 200) {
  const response = await http.get(apiUrl + path, { headers })
  assert.equal(response.status(), expected, `${path} ${await response.text()}`)
  return (await response.json()).data
}

function assertStoredPredictions(stored, original) {
  const { probabilities, incident_type_probabilities, ...storedLabels } = stored.ml.result
  const { probabilities: originalGravity, incident_type_probabilities: originalTypes, ...originalLabels } = original.ml.result
  assert.deepEqual(stored.bert, original.bert)
  assert.deepEqual(storedLabels, originalLabels)
  // La conversion JSON de MySQL peut modifier le dernier bit d’un score.
  for (const [actual, expected] of [[probabilities, originalGravity], [incident_type_probabilities, originalTypes]]) {
    assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort())
    for (const label of Object.keys(expected)) assert.ok(Math.abs(actual[label] - expected[label]) < 1e-12, label)
  }
}

async function openSchoolPage(page, label, resource) {
  const loading = page.waitForResponse((response) =>
    response.url().startsWith(`${apiUrl}/${resource}?`) && response.request().method() === 'GET')
  await page.getByRole('link', { name: label, exact: true }).click()
  assert.equal((await loading).status(), 200, label)
  await page.getByRole('heading', { name: label, exact: true }).waitFor()
}

async function analyzeHoldout(page) {
  const csv = readFileSync(path.join(__dirname, '../school-ml/data/rapports_fictifs.csv'), 'utf8')
  const perType = new Map()
  const verification = []
  for (const line of csv.trim().split(/\r?\n/).slice(1)) {
    const [id, split, , type, report] = line.split(';')
    if (split === 'verification') verification.push({ id, report })
    if (split !== 'test') continue
    const cases = perType.get(type) || []
    if (cases.length < 2) cases.push({ id, report })
    perType.set(type, cases)
  }
  const reports = [...perType.values()].flat().concat(verification)
  assert.equal(reports.length, 28)
  let uncertain = 0
  const analysisIds = []
  for (const { id, report } of reports) {
    const { analysis_id, ml } = await analyze(page, report)
    assert.ok(Number.isInteger(analysis_id))
    analysisIds.push(analysis_id)
    assert.ok(ml.result.incident_type_probabilities, id)
    if (ml.result.requires_human_review) uncertain += 1
    if (id.startsWith('verification')) assert.equal(ml.result.requires_human_review, true, id)
  }
  console.log(`${reports.length} nouveaux rapports contrôlés dans React via PHP et Flask, dont ${uncertain} orientés vers une vérification humaine.`)
  console.log('Analyses MySQL : ' + analysisIds.join(','))
}

async function main() {
  const mode = process.argv[2]
  assert.ok([undefined, 'bert', 'ml', 'holdout'].includes(mode), 'Argument attendu : bert, ml ou holdout.')
  const missingMethod = mode === 'holdout' ? undefined : mode
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const http = await request.newContext()
  try {
    const page = await browser.newPage()
    const headers = await login(page, 'teacher@school.test')
    await openSchoolPage(page, 'Grades', 'grades')
    await openSchoolPage(page, 'Attendance', 'attendance')
    await page.getByRole('link', { name: 'Rapports disciplinaires' }).click()
    await page.getByLabel('Classe', { exact: true }).selectOption({ label: 'Grade 10 A (2025-2026)' })
    const student = page.getByLabel('Élève', { exact: true })
    const studentId = Number((await student.selectOption({ label: 'Student User' }))[0])
    assert.ok(studentId > 0)
    if (mode === 'holdout') await analyzeHoldout(page)
    await analyze(page, late, 1, missingMethod)
    if (missingMethod) return

    await analyze(page, negation, 3)
    let requests = 0
    page.on('request', (entry) => {
      if (entry.url() === analyzeUrl && entry.method() === 'POST') requests += 1
    })
    await page.getByLabel('Texte du rapport').fill('')
    await page.getByRole('button', { name: 'Analyser' }).click()
    const validation = page.getByRole('alert').filter({ hasText: 'Saisissez un rapport non vide.' })
    await validation.waitFor()
    assert.equal(await page.getByRole('article').count(), 0)
    assert.equal(requests, 0)
    console.log(`Texte vide dans React → ${await validation.innerText()}`)

    const data = { student_id: studentId, report_text: late }
    await assertStatus(http, analyzeUrl, { data }, 401, 'Sans connexion')
    await assertStatus(http, analyzeUrl, { headers, data: { ...data, report_text: '   ' } }, 422, 'Texte vide dans PHP')
    await assertStatus(http, analyzeUrl, { headers, data: { ...data, student_id: 2147483647 } }, 403, 'Identifiant élève hors de la liste')

    const studentPage = await browser.newPage()
    const studentHeaders = await login(studentPage, 'student@school.test')
    await assertStatus(http, analyzeUrl, { headers: studentHeaders, data }, 403, 'Rôle élève')

    const adminPage = await browser.newPage()
    const paymentRequests = []
    adminPage.on('request', (entry) => {
      if (/\/api\/payments(?:[.?/]|$)/.test(entry.url())) paymentRequests.push(entry.url())
    })
    const adminHeaders = await login(adminPage, 'admin@school.test')
    const dashboardCounter = adminPage.getByRole('link', { name: /Rapports à examiner/i })
    await dashboardCounter.waitFor()
    assert.equal(await adminPage.getByText('Payments Overview', { exact: true }).count(), 0)
    assert.equal(await adminPage.getByRole('link', { name: 'Payments', exact: true }).count(), 0)
    await adminPage.goto(frontendUrl + '/payments')
    await adminPage.waitForURL(frontendUrl + '/')
    await read(http, '/payments', adminHeaders, 404)
    await read(http, '/payments.php', adminHeaders, 404)
    assert.deepEqual(paymentRequests, [])
    await openSchoolPage(adminPage, 'Students', 'students')
    await openSchoolPage(adminPage, 'Teachers', 'teachers')
    await openSchoolPage(adminPage, 'Subjects', 'subjects')
    await adminPage.getByRole('link', { name: 'Settings', exact: true }).click()
    await adminPage.getByRole('heading', { name: 'Saved settings' }).waitFor()
    console.log('Connexion, notes, présences, élèves, enseignants, matières et paramètres vérifiés. Paiements absents, anciennes API HTTP 404.')

    await assertStatus(http, apiUrl + '/auth/register', {
      data: { name: 'Compte fictif', email: 'admin.demo.blocked@school.test', password: 'password', role_id: 1 },
    }, 403, 'Inscription publique avec rôle administrateur')

    const otherEmail = 'student.demo.other@school.test'
    const registration = await http.post(apiUrl + '/auth/register', {
      data: { name: 'Second élève Démo', email: otherEmail, password: 'password' },
    })
    assert.ok([201, 409].includes(registration.status()), await registration.text())
    const otherPage = await browser.newPage()
    const otherHeaders = await login(otherPage, otherEmail)
    const otherUser = await read(http, '/auth/me', otherHeaders)
    const students = await read(http, '/students?limit=100', adminHeaders)
    let otherStudent = students.items.find((entry) => Number(entry.user_id) === Number(otherUser.sub))
    if (!otherStudent) {
      const created = await http.post(apiUrl + '/students', {
        headers: adminHeaders,
        data: { user_id: otherUser.sub, student_number: 'DEMO-DISC-OTHER', first_name: 'Second', last_name: 'Élève Démo', email: otherEmail },
      })
      assert.equal(created.status(), 201, await created.text())
      otherStudent = (await created.json()).data
    }
    await assertStatus(http, analyzeUrl, { headers, data: { ...data, student_id: otherStudent.id } }, 403, 'Élève fictif hors des classes de l’enseignant')

    const submittedText = late + `. Démo fictive ${randomUUID()}.`
    const predictions = await analyze(page, submittedText, 1)
    const before = await read(http, '/dashboard/stats', adminHeaders)
    const studentBefore = await read(http, '/discipline-reports/mine', studentHeaders)
    const otherBefore = await read(http, '/discipline-reports/mine', otherHeaders)
    await read(http, `/discipline-reports/review/${predictions.analysis_id}`, adminHeaders, 404)
    await assertStatus(http, reportsUrl + '/submit', {
      headers,
      data: { student_id: studentId, report_text: submittedText + ' Modifié.', analysis_id: predictions.analysis_id },
    }, 409, 'Transmission avec un texte différent')
    await assertStatus(http, reportsUrl + '/submit', {
      headers: studentHeaders, data: { student_id: studentId, report_text: submittedText, analysis_id: predictions.analysis_id },
    }, 403, 'Transmission tentée par l’élève')
    await page.getByRole('button', { name: 'Envoyer pour examen' }).click()
    await page.getByText('Rapport envoyé pour examen.', { exact: true }).waitFor()
    const reportId = predictions.analysis_id
    await assertStatus(http, reportsUrl + '/submit', {
      headers, data: { student_id: studentId, report_text: submittedText, analysis_id: reportId },
    }, 409, 'Nouvel envoi de la même analyse')
    assert.deepEqual(await read(http, '/discipline-reports/mine', studentHeaders), studentBefore)
    assert.equal((await read(http, '/dashboard/stats', adminHeaders)).pending_discipline_reports, before.pending_discipline_reports + 1)
    const reviewPath = `/discipline-reports/review/${reportId}`
    await read(http, reviewPath, otherHeaders, 403)
    await read(http, reviewPath, headers, 403)
    const pendingReport = await read(http, reviewPath, adminHeaders)
    assert.equal(pendingReport.report_text, submittedText)
    assert.equal(pendingReport.status, 'pending')
    assertStoredPredictions(pendingReport.predictions, predictions)

    await adminPage.getByRole('link', { name: 'Rapports disciplinaires', exact: true }).click()
    await adminPage.getByRole('button', { name: `Ouvrir le rapport ${reportId}`, exact: true }).click()
    await adminPage.getByText(submittedText, { exact: true }).waitFor()
    await adminPage.getByRole('article', { name: bertTitle }).waitFor()
    const reviewedMl = adminPage.getByRole('article', { name: mlTitle })
    await reviewedMl.waitFor()
    assert.ok((await reviewedMl.innerText()).includes(predictions.ml.result.incident_type))
    if (predictions.ml.result.requires_human_review) {
      assert.equal(await adminPage.getByLabel('Gravité retenue').inputValue(), '')
      assert.equal(await adminPage.getByLabel('Type d’incident (facultatif)').inputValue(), '')
    }
    const correctedSeverity = '2'
    const correctedType = 'Retard — démo ' + reportId
    await adminPage.getByLabel('Gravité retenue').selectOption(correctedSeverity)
    await adminPage.getByLabel('Type d’incident (facultatif)').fill(correctedType)
    await adminPage.getByRole('button', { name: 'Valider le rapport' }).click()
    await adminPage.getByText('Rapport validé.', { exact: true }).waitFor()
    const finalized = await read(http, reviewPath, adminHeaders)
    assert.equal(finalized.status, 'validated')
    assert.equal(Number(finalized.finalized_severity), Number(correctedSeverity))
    assert.equal(finalized.finalized_type, correctedType)
    assert.equal(finalized.report_text, pendingReport.report_text)
    assert.deepEqual(finalized.predictions, pendingReport.predictions)
    await assertStatus(http, apiUrl + reviewPath, { headers: adminHeaders, data: { severity: 3 } }, 409, 'Seconde validation')
    assert.equal((await read(http, '/dashboard/stats', adminHeaders)).pending_discipline_reports, before.pending_discipline_reports)

    await studentPage.getByRole('link', { name: 'Mes rapports disciplinaires' }).click()
    const row = studentPage.getByRole('row').filter({ hasText: correctedType })
    await row.waitFor()
    assert.match(await row.innerText(), /Modéré/)
    assert.equal(await studentPage.getByText(submittedText, { exact: true }).count(), 0)
    assert.equal(await studentPage.getByRole('link', { name: 'Rapports disciplinaires', exact: true }).count(), 0)
    const studentReport = (await read(http, '/discipline-reports/mine', studentHeaders)).find((entry) => entry.finalized_type === correctedType)
    assert.deepEqual(Object.keys(studentReport).sort(), ['finalized_severity', 'finalized_type', 'id', 'reconsideration', 'report_date'])
    await otherPage.getByRole('link', { name: 'Mes rapports disciplinaires' }).click()
    await otherPage.getByText('Aucun rapport validé.', { exact: true }).waitFor()
    assert.deepEqual(await read(http, '/discipline-reports/mine', otherHeaders), otherBefore)
    assert.equal(await otherPage.getByText(correctedType, { exact: true }).count(), 0)
    console.log(`Rapport ${reportId} → À examiner → Validé → visible par l’élève concerné (${correctedType}, Modéré), invisible pour l’autre. Compteur ${before.pending_discipline_reports} → ${before.pending_discipline_reports + 1} → ${before.pending_discipline_reports}.`)
  } finally {
    await http.dispose()
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
