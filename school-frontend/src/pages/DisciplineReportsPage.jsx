import { useEffect, useRef, useState } from 'react'
import { FiArrowLeft, FiCheckSquare, FiCpu, FiDownload, FiInfo, FiSend } from 'react-icons/fi'
import api from '../api/client'
import { ReconsiderationBadge, ReconsiderationDialog, ReconsiderationReview } from '../components/DisciplineReconsideration'
import { PageHeading, PageState, StatusBadge } from '../components/WorkspaceUI'
import './DisciplineReportDetail.css'
import './DisciplineReconsideration.css'

const levels = { 1: 'Mineur', 2: 'Modéré', 3: 'Grave' }
const percentage = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 1 })

const severityTones = { 1: 'success', 2: 'warning', 3: 'danger' }

function SeverityBadge({ value }) {
  return <StatusBadge label={levels[value] || 'Indisponible'} tone={severityTones[value]} />
}

function ResultCard({ title, method, children }) {
  return (
    <article className="data-surface prediction-card" aria-label={title}>
      <h3 className="panel-heading">{title}</h3>
      {method?.result ? (
        <>
          <div className="prediction-severity"><strong>Gravité proposée</strong><SeverityBadge value={method.result.disciplinary_level} /></div>
          {children(method.result)}
        </>
      ) : <p className="alert alert-warning mb-0" role="alert">{method?.error || "Cette méthode est momentanément indisponible."}</p>}
    </article>
  )
}

export default function DisciplineReportsPage() {
  const [students, setStudents] = useState(null)
  const [classes, setClasses] = useState(null)
  const [classId, setClassId] = useState('')
  const [loadError, setLoadError] = useState('')
  const [revision, setRevision] = useState(0)
  const [studentId, setStudentId] = useState('')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [pending, setPending] = useState('')
  const resultsHeading = useRef(null)

  useEffect(() => {
    if (result) resultsHeading.current?.focus()
  }, [result])
  const [notice, setNotice] = useState('')
  const classStudents = students?.filter((student) => String(student.class_id) === classId) || []

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      api.get('/discipline-reports/classes', { signal: controller.signal }),
      api.get('/discipline-reports/students', { signal: controller.signal }),
    ])
      .then(([classesResponse, studentsResponse]) => {
        setClasses(classesResponse.data.data)
        setStudents(studentsResponse.data.data)
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError('Impossible de charger les élèves de vos classes.')
      })
    return () => controller.abort()
  }, [revision])

  function clearAnalysis() {
    setResult(null)
    setError('')
    setNotice('')
  }

  async function analyze(event) {
    event.preventDefault()
    clearAnalysis()
    if (!studentId || !text.trim()) {
      setError(!classId ? 'Sélectionnez une classe.' : !studentId ? 'Sélectionnez un élève.' : 'Saisissez un rapport non vide.')
      event.currentTarget.querySelector(!classId ? '#report-class' : !studentId ? '#report-student' : '#report-text')?.focus()
      return
    }
    setPending('analysis')
    try {
      const { data } = await api.post('/discipline-reports/analyze', {
        student_id: Number(studentId),
        report_text: text,
      })
      setResult(data.data)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Impossible de lancer l’analyse.')
    } finally {
      setPending('')
    }
  }

  async function submit() {
    setPending('submit')
    setError('')
    try {
      const { data } = await api.post('/discipline-reports/submit', {
        student_id: Number(studentId),
        report_text: text,
        analysis_id: result.analysis_id,
      })
      setResult(null)
      setText('')
      setNotice(data.message)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Impossible d’envoyer le rapport.')
    } finally {
      setPending('')
    }
  }

  return (
    <section className="content-section" lang="fr">
      <PageHeading title="Rapports disciplinaires" description="Rédigez un rapport et examinez les deux propositions avant envoi." />
      {loadError && <div className="alert alert-danger" role="alert">{loadError} <button type="button" className="btn btn-outline-secondary btn-sm ms-2" onClick={() => {
        setLoadError('')
        setRevision(revision + 1)
      }}>Réessayer</button></div>}
      {!classes && !loadError && <PageState loading>Chargement des classes…</PageState>}
      {classes?.length === 0 && <div className="data-surface"><PageState>Aucune classe affectée.</PageState></div>}
      {Boolean(classes?.length) && (
        <form className="data-surface report-form" onSubmit={analyze} noValidate>
          <h2 className="panel-heading">Nouveau rapport</h2>
          <fieldset disabled={Boolean(pending)}>
            <div className="report-fields mb-3">
              <div>
                <label className="form-label" htmlFor="report-class">Classe</label>
                <select id="report-class" className="form-select" value={classId} required onChange={(event) => {
                  setClassId(event.target.value)
                  setStudentId('')
                  clearAnalysis()
                }}>
                  <option value="">Sélectionnez une classe</option>
                  {classes?.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} ({entry.academic_year})</option>)}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="report-student">Élève</label>
                <select id="report-student" className="form-select" disabled={!classId || !classStudents.length} value={studentId} required onChange={(event) => {
                  setStudentId(event.target.value)
                  clearAnalysis()
                }}>
                  <option value="">{classId && !classStudents.length ? 'Aucun élève dans cette classe' : 'Sélectionnez un élève'}</option>
                  {classStudents.map((student) => (
                    <option key={student.id} value={student.id}>{student.first_name} {student.last_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <label className="form-label" htmlFor="report-text">Texte du rapport</label>
            <textarea id="report-text" className="form-control mb-3" rows={6} placeholder="Décrivez les faits observés." value={text} required onChange={(event) => {
              setText(event.target.value)
              clearAnalysis()
            }} />
            <button className="btn btn-primary" type="submit"><FiCpu aria-hidden="true" /> Analyser</button>
          </fieldset>
          {error && <p className="alert alert-danger mt-3 mb-0" role="alert">{error}</p>}
          {pending && <p className="mt-3 mb-0" role="status">{pending === 'analysis' ? 'Analyse en cours…' : 'Envoi en cours…'}</p>}
          {notice && <p className="alert alert-success mt-3 mb-0" role="status">{notice}</p>}
        </form>
      )}
      {result && <>
        <DisciplinePredictions result={result} headingRef={resultsHeading} />
        <button className="btn btn-primary" type="button" onClick={submit} disabled={Boolean(pending)}>
          <FiSend aria-hidden="true" /> {pending === 'submit' ? 'Envoi en cours…' : 'Envoyer pour examen'}
        </button>
      </>}
    </section>
  )
}

const probabilityLabel = { mineur: 'Mineur', modéré: 'Modéré', grave: 'Grave' }

function DisciplinePredictions({ result, headingRef, review = false }) {
  const bertLevel = Number(result?.bert?.result?.disciplinary_level)
  const mlLevel = Number(result?.ml?.result?.disciplinary_level)
  const levelsDiffer = levels[bertLevel] && levels[mlLevel] && bertLevel !== mlLevel

  return (
    <section className="predictions" aria-labelledby="prediction-heading" aria-live="polite">
      <h2 className="panel-heading mb-2" id="prediction-heading" ref={headingRef} tabIndex={headingRef ? -1 : undefined}>Propositions d’analyse</h2>
      <p>Vérifiez ces propositions à partir des faits décrits dans le rapport.</p>
      {review && levelsDiffer && (
        <p className="review-analysis-note"><FiInfo aria-hidden="true" /> Les méthodes proposent des gravités différentes.</p>
      )}
      <div className="prediction-grid">
        <ResultCard title="BERT + mots-clés" method={result?.bert}>
          {({ details }) => details && (
            <dl className="prediction-data">
              {details.reason && <div><dt>Raison</dt><dd>{details.reason}</dd></div>}
              {Number.isInteger(details.stars) && <div><dt>{review ? 'Note de sentiment' : 'Sentiment'}</dt><dd>{details.stars}/5</dd></div>}
              {Number.isFinite(details.confidence) && <div><dt>{review ? 'Confiance du modèle sur la note de sentiment' : 'Score de sentiment BERT'}</dt><dd>{percentage.format(details.confidence)}</dd></div>}
            </dl>
          )}
        </ResultCard>
        <ResultCard title="TF-IDF + régression logistique" method={result?.ml}>
          {({ probabilities, incident_type, incident_type_probabilities, requires_human_review }) => (
            <dl className="prediction-data">
              {requires_human_review && <div className="review-analysis-note">
                <dt>Analyse incertaine</dt><dd>Vérification humaine requise. L’administrateur confirme la décision.</dd>
              </div>}
              {probabilities && <div>
                <dt>Probabilités</dt>
                <dd>
                  <ul className="probability-list">
                    {Object.entries(probabilityLabel).filter(([key]) => Number.isFinite(probabilities[key])).map(([key, label]) => (
                      <li key={key}>
                        <div className="probability-label"><span>{label}</span><strong>{percentage.format(probabilities[key])}</strong></div>
                        <progress max="1" value={probabilities[key]} aria-label={label} />
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>}
              <div>
                <dt>Type d’incident proposé</dt>
                <dd>
                  {incident_type || 'Type indisponible'}
                  {Number.isFinite(incident_type_probabilities?.[incident_type]) && (
                    <> ({percentage.format(incident_type_probabilities[incident_type])})</>
                  )}
                </dd>
              </div>
            </dl>
          )}
        </ResultCard>
      </div>
    </section>
  )
}

const reportStatus = { pending: 'À examiner', validated: 'Validé' }

const reportDateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' })

function reportDate(date) {
  const timestamp = new Date(date)
  return date && Number.isFinite(timestamp.getTime()) ? <time dateTime={timestamp.toISOString()}>{reportDateFormat.format(timestamp)}</time> : '—'
}

function DownloadReportButton({ id, compact = false, busy, disabled, onDownload }) {
  return (
    <button type="button" className={compact ? 'btn btn-outline-primary btn-sm text-nowrap' : 'btn btn-primary text-nowrap'}
      onClick={() => onDownload(id)} disabled={disabled}
      aria-label={compact ? 'Télécharger le PDF du rapport ' + id : undefined}>
      <FiDownload aria-hidden="true" /> {busy ? 'Téléchargement…' : compact ? 'PDF' : 'Télécharger le PDF'}
    </button>
  )
}

export function ReviewDisciplineReportsPage() {
  const [reports, setReports] = useState(null)
  const [selection, setSelection] = useState(null)
  const [report, setReport] = useState(null)
  const [severity, setSeverity] = useState('')
  const [type, setType] = useState('')
  const [listError, setListError] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [downloadingId, setDownloadingId] = useState(null)
  const [downloadError, setDownloadError] = useState('')
  const detailHeading = useRef(null)
  const decisionHeading = useRef(null)
  const reconsiderationHeading = useRef(null)
  const reportList = useRef(null)
  const returnFocus = useRef(false)
  const reportId = report?.id

  useEffect(() => {
    if (reportId != null) detailHeading.current?.focus()
    else if (returnFocus.current) {
      returnFocus.current = false
      reportList.current?.focus()
    }
  }, [reportId])

  useEffect(() => {
    if (notice) (reconsiderationHeading.current || decisionHeading.current)?.focus()
  }, [notice])

  useEffect(() => {
    const controller = new AbortController()
    api.get('/discipline-reports/review', { signal: controller.signal })
      .then(({ data }) => setReports(data.data))
      .catch(() => {
        if (!controller.signal.aborted) setListError('Impossible de charger les rapports.')
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (selection === null) return
    const controller = new AbortController()
    api.get('/discipline-reports/review/' + selection.id, { signal: controller.signal })
      .then(({ data }) => {
        const entry = data.data
        setReport(entry)
        const ml = entry.predictions?.ml?.result
        setSeverity(ml?.requires_human_review ? '' : String(ml?.disciplinary_level ?? entry.predictions?.bert?.result?.disciplinary_level ?? ''))
        setType(ml?.requires_human_review ? '' : ml?.incident_type ?? '')
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Impossible d’ouvrir le rapport.')
      })
    return () => controller.abort()
  }, [selection])

  function openReport(id) {
    setReport(null)
    setError('')
    setNotice('')
    setSelection({ id })
  }

  function closeReport() {
    returnFocus.current = true
    setSelection(null)
    setReport(null)
    setError('')
    setNotice('')
  }

  async function downloadPdf(id) {
    setDownloadError('')
    setDownloadingId(id)
    try {
      const response = await api.get('/discipline-reports/review/' + id + '/pdf', { responseType: 'blob' })
      const filename = response.headers['content-disposition']?.match(/filename="([^"]+)"/)?.[1]
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = filename || 'rapport-disciplinaire-' + String(id).padStart(3, '0') + '.pdf'
      document.body.append(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setDownloadError('Impossible de télécharger le PDF du rapport n°' + id + '.')
    } finally {
      setDownloadingId(null)
    }
  }

  function validate(event) {
    event.preventDefault()
    updateReview('', { severity: Number(severity), incident_type: type.trim() || null }, 'Impossible de valider le rapport.')
  }

  async function updateReview(suffix, payload, failureMessage) {
    if (saving) return
    setError('')
    setNotice('')
    setSaving(true)
    try {
      const { data } = await api.post('/discipline-reports/review/' + report.id + suffix, payload)
      setReport(data.data)
      setReports((entries) => entries.map((entry) => entry.id === report.id ? {
        ...entry, status: data.data.status, reconsideration_status: data.data.reconsideration?.status ?? null,
      } : entry))
      setNotice(data.message)
    } catch (requestError) {
      setError(requestError.response?.data?.message || failureMessage)
    } finally {
      setSaving(false)
    }
  }

  if (report) {
    return (
      <section className="content-section review-detail" lang="fr" aria-labelledby="review-title">
        <button type="button" className="btn btn-link review-back" onClick={closeReport} disabled={saving}>
          <FiArrowLeft aria-hidden="true" /> Retour à la liste
        </button>
        <header className="section-heading review-header">
          <h1 id="review-title" ref={detailHeading} tabIndex={-1}>Rapport {report.reference}</h1>
          <StatusBadge value={report.status} label={reportStatus[report.status]} />
          {report.status === 'validated' && <DownloadReportButton id={report.id} disabled={downloadingId !== null}
            busy={downloadingId === report.id} onDownload={downloadPdf} />}
        </header>
        {downloadError && <p className="alert alert-danger" role="alert">{downloadError}</p>}
        <div className="review-layout">
          <div className="review-content">
            <section className="data-surface surface-padding" aria-labelledby="review-facts-heading">
              <dl className="review-metadata">
                <div><dt>Élève</dt><dd>{report.student_name || '—'}</dd></div>
                <div><dt>Classe</dt><dd>{report.class_name || '—'}</dd></div>
                <div><dt>Enseignant</dt><dd>{report.teacher_name || '—'}</dd></div>
                <div><dt>Date</dt><dd>{reportDate(report.report_date)}</dd></div>
              </dl>
              <h2 className="panel-heading review-facts-heading" id="review-facts-heading">Faits rapportés</h2>
              <p className="report-text">{report.report_text}</p>
            </section>
            <DisciplinePredictions result={report.predictions} review />
          </div>
          <div className="review-secondary">
            <aside className="data-surface surface-padding review-decision" aria-labelledby="review-decision-heading">
              <h2 className="panel-heading review-decision-title" id="review-decision-heading" ref={decisionHeading} tabIndex={-1}>
                <FiCheckSquare aria-hidden="true" /> Décision finale
              </h2>
              {error && !report.reconsideration && <p className="alert alert-danger" role="alert">{error}</p>}
              {notice && !report.reconsideration && <p className="alert alert-success" role="status">{notice}</p>}
              {report.status === 'pending' ? (
                <form onSubmit={validate}>
                  <fieldset className="review-decision-fields" disabled={saving}>
                    <div>
                      <label className="form-label" htmlFor="review-severity">Gravité retenue</label>
                      <select id="review-severity" className="form-select" required value={severity} onChange={(event) => setSeverity(event.target.value)}>
                        <option value="">Sélectionnez une gravité</option>
                        {Object.entries(levels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label" htmlFor="review-type">Type d’incident (facultatif)</label>
                      <input id="review-type" className="form-control" value={type} maxLength={160} onChange={(event) => setType(event.target.value)} />
                    </div>
                    <button className="btn btn-primary" type="submit">
                      {saving && <span className="spinner-border spinner-border-sm" aria-hidden="true" />}
                      {saving ? 'Validation…' : 'Valider le rapport'}
                    </button>
                  </fieldset>
                </form>
              ) : (
                <dl className="review-finalized">
                  <div><dt>Gravité retenue</dt><dd><SeverityBadge value={report.finalized_severity} /></dd></div>
                  <div><dt>Type d’incident</dt><dd>{report.finalized_type || 'Non renseigné'}</dd></div>
                </dl>
              )}
            </aside>
            {report.reconsideration && (
              <ReconsiderationReview key={report.id} report={report} headingRef={reconsiderationHeading}
                date={reportDate(report.reconsideration.requested_at?.slice(0, 10))}
                initialSeverity={<SeverityBadge value={report.reconsideration.initial_severity} />} levels={levels}
                saving={saving} error={error} notice={notice}
                onResolve={(payload) => updateReview('/reconsideration', payload, 'Impossible d’enregistrer le réexamen.')} />
            )}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="content-section" lang="fr">
      <PageHeading title="Rapports disciplinaires" description="Consultez les signalements et enregistrez la décision." />
      {listError && <p className="alert alert-danger" role="alert">{listError}</p>}
      {downloadError && <p className="alert alert-danger" role="alert">{downloadError}</p>}
      {!reports && !listError && <div className="data-surface"><PageState loading>Chargement des rapports…</PageState></div>}
      {reports?.length === 0 && <div className="data-surface"><PageState>Aucun rapport transmis.</PageState></div>}
      {reports?.length > 0 && (
        <div className="data-surface table-responsive table-scroll report-table" role="region" tabIndex={0} aria-label="Liste des rapports" ref={reportList}>
          <table className="table align-middle mb-0">
            <thead><tr><th scope="col">Référence</th><th scope="col">Élève</th><th scope="col">Date</th><th scope="col">Statut</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              {reports.map((entry) => (
                <tr key={entry.id} className={selection?.id === entry.id ? "report-selected" : undefined}>
                  <td><button type="button" className="btn btn-link text-nowrap" aria-label={'Ouvrir le rapport ' + entry.reference}
                    aria-pressed={selection?.id === entry.id} disabled={saving} onClick={() => openReport(entry.id)}>{entry.reference}</button></td>
                  <td>{entry.student_name || '—'}</td>
                  <td>{reportDate(entry.report_date)}</td>
                  <td><div className="reconsideration-cell">
                    <StatusBadge value={entry.status} label={reportStatus[entry.status]} />
                    {entry.reconsideration_status === 'pending' && <StatusBadge label="Réexamen en attente" tone="warning" />}
                  </div></td>
                  <td>{entry.status === 'validated' && <DownloadReportButton id={entry.id} compact
                    disabled={downloadingId !== null} busy={downloadingId === entry.id} onDownload={downloadPdf} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {error && <p className="alert alert-danger" role="alert">{error}</p>}
      {selection !== null && !error && <div className="data-surface"><PageState loading>Ouverture du rapport…</PageState></div>}
    </section>
  )
}

export function StudentDisciplineReportsPage() {
  const [reports, setReports] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selection, setSelection] = useState(null)
  const selected = reports?.find((entry) => entry.id === selection?.id)

  useEffect(() => {
    const controller = new AbortController()
    api.get('/discipline-reports/mine', { signal: controller.signal })
      .then(({ data }) => setReports(data.data))
      .catch(() => {
        if (!controller.signal.aborted) setError('Impossible de charger vos rapports.')
      })
    return () => controller.abort()
  }, [])

  function sent(updated, message) {
    setReports((entries) => updated
      ? entries.map((entry) => entry.id === updated.id ? { ...entry, reconsideration: updated.reconsideration } : entry)
      : entries.filter((entry) => entry.id !== selection.id))
    setSelection(null)
    setNotice(message)
  }

  function openDialog(id, mode) {
    setNotice('')
    setSelection({ id, mode })
  }

  return (
    <section className="content-section" lang="fr">
      <PageHeading title="Mes rapports disciplinaires" />
      {notice && <p className="alert alert-success" role="status">{notice}</p>}
      {error && <p className="alert alert-danger" role="alert">{error}</p>}
      {!reports && !error && <div className="data-surface"><PageState loading>Chargement de vos rapports…</PageState></div>}
      {reports?.length === 0 && <div className="data-surface"><PageState>Aucun rapport validé.</PageState></div>}
      {reports?.length > 0 && (
        <div className="data-surface table-responsive table-scroll report-table reconsideration-student-table" role="region" tabIndex={0} aria-label="Liste des rapports">
          <table className="table align-middle mb-0">
            <thead><tr><th scope="col">Référence</th><th scope="col">Date</th><th scope="col">Type validé</th><th scope="col">Gravité validée</th><th scope="col">Réexamen</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              {reports.map((entry) => (
                <tr key={entry.id}>
                  <th scope="row" className="text-nowrap">{entry.reference}</th>
                  <td>{reportDate(entry.report_date)}</td>
                  <td>{entry.finalized_type || 'Non renseigné'}</td>
                  <td><SeverityBadge value={entry.finalized_severity} /></td>
                  <td>
                    <div className="reconsideration-cell">
                      {entry.reconsideration ? (
                        <>
                          <ReconsiderationBadge status={entry.reconsideration.status} />
                          <button type="button" className="btn btn-link" onClick={() => openDialog(entry.id, 'reconsideration')}>
                            {entry.reconsideration.status === 'pending' ? 'Voir la demande' : 'Voir la réponse'}
                          </button>
                        </>
                      ) : <button type="button" className="btn btn-link" onClick={() => openDialog(entry.id, 'reconsideration')}>Demander un réexamen</button>}
                    </div>
                  </td>
                  <td><button type="button" className="btn btn-link text-nowrap" onClick={() => openDialog(entry.id, 'details')}>Voir les détails</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && <ReconsiderationDialog key={selected.id} summary={selected} mode={selection.mode}
        formatDate={reportDate} SeverityBadge={SeverityBadge} onClose={() => setSelection(null)} onSent={sent} />}
    </section>
  )
}
