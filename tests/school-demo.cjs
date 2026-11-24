const assert = require('node:assert/strict')
const { chromium, request } = require('playwright-core')

const frontend = `http://localhost:${process.env.FRONTEND_HTTP_PORT || 8080}`
const api = 'http://localhost:8000/api'
const groups = [
  {
    className: 'Grade 10 A',
    teacher: 'teacher@school.test',
    students: ['student@school.test', 'mila.demo@school.test', 'yanis.demo@school.test', 'noa.demo@school.test'],
  },
  {
    className: 'Grade 10 B',
    teacher: 'teacher.demo.b@school.test',
    students: ['student.demo.other@school.test', 'hana.demo@school.test', 'ilyes.demo@school.test', 'sara.demo@school.test'],
  },
]
const examples = [
  { group: 0, student: 'student@school.test', text: 'L’élève est arrivé en retard de dix minutes au début du cours.' },
  { group: 0, student: 'mila.demo@school.test', text: 'Pendant le contrôle, l’élève a triché en recopiant les réponses de son voisin.' },
  { group: 1, student: 'hana.demo@school.test', text: 'L’élève a insulté un camarade, mais n’a porté aucun coup et le cours a repris.' },
]

async function read(http, path, headers, expected = 200) {
  const response = await http.get(api + path, { headers })
  assert.equal(response.status(), expected, `${path} ${await response.text()}`)
  return (await response.json()).data
}

async function login(page, email, password = 'password') {
  await page.goto(frontend)
  await page.locator('input[type=email]').fill(email)
  await page.locator('input[type=password]').fill(password)
  const loginRequest = page.waitForResponse((reply) => reply.url() === api + '/auth/login' && reply.request().method() === 'POST')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  const response = await loginRequest
  if (response.status() !== 200) return { status: response.status(), message: (await response.json()).message }
  await page.getByRole('button', { name: 'Logout' }).waitFor()
  const token = await page.evaluate(() => localStorage.getItem('school_token'))
  return { status: 200, headers: { Authorization: `Bearer ${token}` } }
}

async function checkProfile(page, http, headers, email) {
  const profile = await read(http, '/profile', headers)
  assert.equal(profile.email, email)
  await page.getByRole('link', { name: 'Profile', exact: true }).click()
  await page.locator('.profile-identity h2').waitFor()
  await page.waitForFunction(() => {
    const avatars = [...document.querySelectorAll('.profile-avatar img')]
    return avatars.length === 2 && avatars.every((image) => image.complete && image.naturalWidth > 0)
  })
  return profile
}

async function analyze(page, text) {
  await page.getByLabel('Texte du rapport').fill(text)
  const analysis = page.waitForResponse(
    (reply) => reply.url() === api + '/discipline-reports/analyze' && reply.request().method() === 'POST',
    { timeout: 150_000 },
  )
  await page.getByRole('button', { name: 'Analyser', exact: true }).click()
  const response = await analysis
  assert.equal(response.status(), 200)
  const { data } = await response.json()
  const bert = page.getByRole('article', { name: 'BERT + mots-clés' })
  const ml = page.getByRole('article', { name: 'TF-IDF + régression logistique' })
  await bert.waitFor()
  await ml.waitFor()
  assert.ok(data.bert.result, data.bert.error)
  assert.ok(data.ml.result, data.ml.error)
  assert.match(await bert.innerText(), /Score de sentiment BERT/)
  assert.match(await ml.innerText(), /Mineur[\s\S]*Modéré[\s\S]*Grave/)
  assert.ok((await ml.innerText()).includes(data.ml.result.incident_type || 'Type indisponible'))
  console.log(JSON.stringify({ text, bert: data.bert.result, ml: data.ml.result }))
  return { bert: data.bert, ml: data.ml }
}

function checkStoredPredictions(stored, observed) {
  assert.deepEqual(stored.bert, observed.bert)
  const { probabilities, ...modelResult } = stored.ml.result
  const { probabilities: observedProbabilities, ...observedModelResult } = observed.ml.result
  assert.deepEqual(modelResult, observedModelResult)
  assert.deepEqual(Object.keys(probabilities).sort(), Object.keys(observedProbabilities).sort())
  for (const [label, probability] of Object.entries(probabilities)) {
    assert.ok(Math.abs(probability - observedProbabilities[label]) < 1e-12, label)
  }
}

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const http = await request.newContext()
  const students = new Map()
  const predictions = new Map()
  try {
    for (const group of groups) {
      for (const email of group.students) {
        const page = await browser.newPage()
        try {
          const session = await login(page, email)
          assert.equal(session.status, 200, `${email} : ${session.message}`)
          const { headers } = session
          const profile = await checkProfile(page, http, headers, email)
          assert.equal(profile.class_info.name, group.className)
          const [grades, attendance, reports] = await Promise.all([
            read(http, '/grades?limit=100', headers),
            read(http, '/attendance?limit=100', headers),
            read(http, '/discipline-reports/mine', headers),
          ])
          assert.ok(new Set(grades.items.map((row) => row.subject_id)).size >= 2)
          assert.ok(new Set(attendance.items.map((row) => row.attendance_date)).size >= 4)
          assert.ok(attendance.items.some((row) => row.status === 'present'))
          assert.ok(attendance.items.some((row) => row.status === 'absent'))
          for (const row of [...grades.items, ...attendance.items]) assert.equal(row.student_id, profile.profile_id)

          await page.getByRole('link', { name: 'My Grades', exact: true }).click()
          await page.getByRole('cell', { name: grades.items[0].exam_name, exact: true }).first().waitFor()
          await page.getByRole('link', { name: 'My Attendance', exact: true }).click()
          await page.getByRole('cell', { name: attendance.items[0].attendance_date, exact: true }).first().waitFor()
          await page.getByRole('link', { name: 'Mes rapports disciplinaires', exact: true }).click()
          if (email === examples[0].student) {
            await page.getByRole('row').filter({ has: page.getByRole('cell', { name: 'Retard', exact: true }) }).waitFor()
            assert.ok(reports.some((row) => row.finalized_type === 'Retard' && row.finalized_severity === 1))
          } else {
            assert.ok(!reports.some((row) => row.finalized_type === 'Retard'))
            assert.equal(await page.getByRole('cell', { name: 'Retard', exact: true }).count(), 0)
          }
          students.set(email, { profile, headers, grades, attendance })
          console.log(`${email} : avatar, ${grades.total} notes, ${attendance.total} présences, ${reports.length} rapport(s) validé(s).`)
        } finally {
          await page.close()
        }
      }
    }

    const first = students.get(examples[0].student)
    const other = students.get(groups[1].students[0])
    const otherGrade = other.grades.items[0]
    const otherAttendance = other.attendance.items[0]
    await read(http, '/grades/' + otherGrade.id, first.headers, 404)
    await read(http, '/attendance/' + otherAttendance.id, first.headers, 404)
    await read(http, '/absences/' + otherAttendance.id, first.headers, 404)
    const search = await read(http, '/grades?search=' + encodeURIComponent(otherGrade.exam_name), first.headers)
    assert.equal(search.total, 0)
    console.log('Recherche et accès direct aux notes et présences d’un autre élève refusés.')

    for (const [index, group] of groups.entries()) {
      const page = await browser.newPage()
      try {
        const session = await login(page, group.teacher)
        assert.equal(session.status, 200, `${group.teacher} : ${session.message}`)
        const { headers } = session
        await page.getByRole('cell', { name: group.className, exact: true }).waitFor()
        const classes = await read(http, '/classes?limit=100', headers)
        assert.ok(!classes.items.some((entry) => entry.name === groups[1 - index].className))
        await checkProfile(page, http, headers, group.teacher)
        await page.route('**/demo/avatars/**', (route) => route.abort())
        await page.reload()
        await page.locator('.profile-identity .profile-avatar span').waitFor()
        await page.unroute('**/demo/avatars/**')

        await page.getByRole('link', { name: 'Rapports disciplinaires', exact: true }).click()
        const reportClasses = await read(http, '/discipline-reports/classes', headers)
        const reportStudents = await read(http, '/discipline-reports/students', headers)
        const selectedClass = reportClasses.find((entry) => entry.name === group.className)
        await page.getByLabel('Classe', { exact: true }).selectOption(String(selectedClass.id))
        const studentSelect = page.getByLabel('Élève', { exact: true })
        for (const email of group.students) {
          const { profile } = students.get(email)
          assert.ok(reportStudents.some((entry) => entry.id === profile.profile_id))
          await studentSelect.locator(`option[value="${profile.profile_id}"]`).waitFor({ state: 'attached' })
        }
        for (const email of groups[1 - index].students) {
          const id = students.get(email).profile.profile_id
          assert.ok(!reportStudents.some((entry) => entry.id === id))
          assert.equal(await studentSelect.locator(`option[value="${id}"]`).count(), 0)
        }
        console.log(`${group.teacher} : ${group.className}, quatre élèves fictifs affectés, avatar et initiales de secours.`)
        for (const example of examples.filter((entry) => entry.group === index)) {
          await studentSelect.selectOption(String(students.get(example.student).profile.profile_id))
          predictions.set(example.text, await analyze(page, example.text))
        }
      } finally {
        await page.close()
      }
    }

    const adminPage = await browser.newPage()
    const admin = await login(adminPage, 'admin@school.test', process.env.SCHOOL_DEMO_ADMIN_PASSWORD ?? 'password')
    if (admin.status !== 200) {
      console.log(`Vérification admin bloquée : HTTP ${admin.status} — ${admin.message}.`)
      process.exitCode = 2
      return
    }
    await adminPage.getByRole('link', { name: /Rapports à examiner/ }).click()
    const review = await read(http, '/discipline-reports/review', admin.headers)
    const reports = await Promise.all(review.map((entry) => read(http, `/discipline-reports/review/${entry.id}`, admin.headers)))
    for (const [index, example] of examples.entries()) {
      const report = reports.find((entry) => entry.report_text === example.text)
      assert.ok(report)
      assert.equal(report.status, index === 0 ? 'validated' : 'pending')
      checkStoredPredictions(report.predictions, predictions.get(example.text))
      if (report.status === 'pending') {
        await adminPage.getByRole('button', { name: `Ouvrir le rapport ${report.id}`, exact: true }).click()
        await adminPage.getByText(example.text, { exact: true }).waitFor()
        await adminPage.getByRole('article', { name: 'BERT + mots-clés' }).waitFor()
        await adminPage.getByRole('article', { name: 'TF-IDF + régression logistique' }).waitFor()
        await adminPage.getByRole('button', { name: 'Retour à la liste', exact: true }).click()
      }
      console.log(`Admin existant : rapport ${report.id}, ${report.status}, prédictions Flask conformes en base et dans l’analyse.`)
    }
  } finally {
    await http.dispose()
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
