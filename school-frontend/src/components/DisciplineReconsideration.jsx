import { useEffect, useRef, useState } from 'react'
import { FiX } from 'react-icons/fi'
import api from '../api/client'
import { StatusBadge } from './WorkspaceUI'

const statuses = {
  pending: { label: 'En attente', tone: 'warning' },
  upheld: { label: 'Décision maintenue', tone: 'info' },
  revised: { label: 'Décision révisée', tone: 'success' },
}
const textLimit = 2000

export function ReconsiderationBadge({ status }) {
  return <StatusBadge {...statuses[status]} />
}

export function ReconsiderationDialog({ report, date, onClose, onSent }) {
  const dialog = useRef(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const request = report.reconsideration
  const hasReply = request && request.status !== 'pending'

  useEffect(() => {
    const element = dialog.current
    element.showModal()
    return () => element.close()
  }, [])

  async function send(event) {
    event.preventDefault()
    if (saving) return
    if (!reason.trim()) {
      setError('Saisissez le motif de la demande.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const { data } = await api.post('/discipline-reports/mine/' + report.id + '/reconsideration', { reason })
      onSent(data.data, data.message)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Impossible d’envoyer la demande.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <dialog ref={dialog} className="profile-modal data-surface reconsideration-dialog" aria-labelledby="reconsideration-dialog-title" onCancel={(event) => {
      event.preventDefault()
      if (!saving) onClose()
    }}>
      <div className="profile-modal-header">
        <h2 className="panel-heading mb-0" id="reconsideration-dialog-title">{hasReply ? 'Réponse de l’administration' : request ? 'Demande de réexamen' : 'Demander un réexamen'}</h2>
        <button type="button" className="btn btn-outline-secondary icon-btn" aria-label="Fermer" onClick={onClose} disabled={saving}>
          <FiX aria-hidden="true" />
        </button>
      </div>
      <dl className="reconsideration-meta">
        <div><dt>Date du rapport</dt><dd>{date}</dd></div>
        <div><dt>Type d’incident</dt><dd>{report.finalized_type || 'Non renseigné'}</dd></div>
      </dl>
      {request ? (
        <>
          <ReconsiderationBadge status={request.status} />
          <p className="reconsideration-text mt-3 mb-0">{hasReply ? request.response : request.reason}</p>
        </>
      ) : (
        <form onSubmit={send}>
          <fieldset className="reconsideration-fields" disabled={saving}>
            <div>
              <label className="form-label" htmlFor="reconsideration-reason">Motif de la demande</label>
              <textarea className="form-control" id="reconsideration-reason" rows={5} required maxLength={textLimit}
                value={reason} onChange={(event) => setReason(event.target.value)} />
            </div>
            {error && <p className="alert alert-danger mb-0" role="alert">{error}</p>}
            <div className="reconsideration-dialog-actions">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Annuler</button>
              <button type="submit" className="btn btn-primary">{saving ? 'Envoi…' : 'Envoyer la demande'}</button>
            </div>
          </fieldset>
        </form>
      )}
    </dialog>
  )
}

export function ReconsiderationReview({ report, headingRef, date, initialSeverity, levels, saving, error, notice, onResolve }) {
  const request = report.reconsideration
  const [outcome, setOutcome] = useState('')
  const [severity, setSeverity] = useState(String(report.finalized_severity ?? ''))
  const [type, setType] = useState(report.finalized_type ?? '')
  const [response, setResponse] = useState('')
  const [formError, setFormError] = useState('')

  function submit(event) {
    event.preventDefault()
    if (saving) return
    if (!response.trim()) {
      setFormError('Saisissez une réponse pour l’élève.')
      return
    }
    setFormError('')
    onResolve(outcome === 'revised'
      ? { outcome, response, severity: Number(severity), incident_type: type.trim() || null }
      : { outcome, response })
  }

  return (
    <section className="data-surface surface-padding reconsideration-panel" aria-labelledby="reconsideration-title">
      <h2 id="reconsideration-title" className="panel-heading" ref={headingRef} tabIndex={-1}>Demande de réexamen</h2>
      <ReconsiderationBadge status={request.status} />
      <dl className="reconsideration-meta mt-3">
        <div><dt>Date d’envoi</dt><dd>{date}</dd></div>
        <div><dt>Motif de la demande</dt><dd className="reconsideration-text">{request.reason}</dd></div>
        <div><dt>Décision initiale</dt><dd>{initialSeverity}<div className="mt-1">{request.initial_type || 'Non renseigné'}</div></dd></div>
      </dl>
      {(formError || error) && <p className="alert alert-danger" role="alert">{formError || error}</p>}
      {notice && <p className="alert alert-success" role="status">{notice}</p>}
      {request.status === 'pending' ? (
        <form onSubmit={submit}>
          <fieldset className="reconsideration-fields" disabled={saving}>
            <div>
              <label className="form-label" htmlFor="reconsideration-outcome">Suite à donner</label>
              <select className="form-select" id="reconsideration-outcome" required value={outcome} onChange={(event) => setOutcome(event.target.value)}>
                <option value="">Choisissez une décision</option>
                <option value="upheld">Maintenir la décision</option>
                <option value="revised">Réviser la décision</option>
              </select>
            </div>
            {outcome === 'revised' && <>
              <div>
                <label className="form-label" htmlFor="reconsideration-severity">Gravité révisée</label>
                <select className="form-select" id="reconsideration-severity" required value={severity} onChange={(event) => setSeverity(event.target.value)}>
                  <option value="">Sélectionnez une gravité</option>
                  {Object.entries(levels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="reconsideration-type">Type d’incident (facultatif)</label>
                <input className="form-control" id="reconsideration-type" maxLength={160} value={type} onChange={(event) => setType(event.target.value)} />
              </div>
            </>}
            <div>
              <label className="form-label" htmlFor="reconsideration-response">Réponse à l’élève</label>
              <textarea className="form-control" id="reconsideration-response" rows={4} required maxLength={textLimit}
                value={response} onChange={(event) => setResponse(event.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary">{saving ? 'Enregistrement…' : 'Enregistrer le réexamen'}</button>
          </fieldset>
        </form>
      ) : (
        <>
          <h3 className="h6">Réponse à l’élève</h3>
          <p className="reconsideration-text mb-0">{request.response}</p>
        </>
      )}
    </section>
  )
}
