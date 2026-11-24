import { useEffect, useState } from 'react'
import { FiBookOpen, FiCheckCircle, FiMail, FiSave } from 'react-icons/fi'
import { PageHeading, PageState } from '../components/WorkspaceUI'
import { settingsService } from '../services/settingsService'
import './SettingsPage.css'

const savedDateFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' })

function SavedSettings({ settings }) {
  const updatedAt = settings.updated_at?.replace(' ', 'T')
  const date = new Date(updatedAt)
  const hasDate = Number.isFinite(date.getTime())

  return (
    <aside className="data-surface settings-summary" aria-labelledby="saved-settings-heading">
      <h2 className="settings-group-title" id="saved-settings-heading">
        <span className="settings-group-icon"><FiCheckCircle aria-hidden="true" /></span>
        Saved settings
      </h2>
      <dl className="settings-summary-list">
        <div>
          <dt>School name</dt>
          <dd>{settings.school_name || '—'}</dd>
        </div>
        <div>
          <dt>Academic year</dt>
          <dd>{settings.academic_year || '—'}</dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd>{hasDate ? <time dateTime={updatedAt}>{savedDateFormat.format(date)}</time> : '—'}</dd>
        </div>
      </dl>
    </aside>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(null)
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let active = true
    settingsService.get()
      .then((data) => {
        if (!active) return
        setSettings(data)
        setForm(data)
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || 'Failed to load settings')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [revision])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
    setSuccess(false)
  }

  function resetForm() {
    setForm(settings)
    setError('')
    setSuccess(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      const updated = await settingsService.update(form)
      setSettings(updated)
      setForm(updated)
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="content-section">
      <PageHeading title="System Settings" />
      {loading ? <div className="data-surface"><PageState loading>Loading settings…</PageState></div> : !settings ? (
        <div className="alert alert-danger" role="alert">
          {error || 'Settings not found'} <button type="button" className="btn btn-outline-secondary ms-2" onClick={() => {
            setError('')
            setLoading(true)
            setRevision(revision + 1)
          }}>Retry</button>
        </div>
      ) : (
        <div className="settings-layout">
          <form className="data-surface settings-form" onSubmit={handleSubmit}>
            <fieldset className="settings-group" disabled={saving}>
              <legend className="settings-group-title">
                <span className="settings-group-icon"><FiBookOpen aria-hidden="true" /></span>
                School information
              </legend>
              <div className="settings-fields">
                <div>
                  <label className="form-label" htmlFor="settings-school_name">School Name</label>
                  <input className="form-control" id="settings-school_name" name="school_name" type="text"
                    value={form.school_name ?? ''} onChange={handleChange} required />
                </div>
                <div>
                  <label className="form-label" htmlFor="settings-academic_year">Academic Year</label>
                  <input className="form-control" id="settings-academic_year" name="academic_year" type="text"
                    value={form.academic_year ?? ''} onChange={handleChange} placeholder="e.g., 2025-2026" />
                </div>
              </div>
            </fieldset>

            <fieldset className="settings-group" disabled={saving}>
              <legend className="settings-group-title">
                <span className="settings-group-icon"><FiMail aria-hidden="true" /></span>
                Contact details
              </legend>
              <div className="settings-fields">
                <div>
                  <label className="form-label" htmlFor="settings-school_email">School Email</label>
                  <input className="form-control" id="settings-school_email" name="school_email" type="email"
                    value={form.school_email ?? ''} onChange={handleChange} />
                </div>
                <div>
                  <label className="form-label" htmlFor="settings-school_phone">School Phone</label>
                  <input className="form-control" id="settings-school_phone" name="school_phone" type="tel"
                    value={form.school_phone ?? ''} onChange={handleChange} />
                </div>
                <div className="settings-address">
                  <label className="form-label" htmlFor="settings-school_address">School Address</label>
                  <textarea className="form-control" id="settings-school_address" name="school_address" rows={4}
                    value={form.school_address ?? ''} onChange={handleChange} />
                </div>
              </div>
            </fieldset>

            <div className="settings-footer">
              {error && <p className="alert alert-danger settings-message" role="alert">{error}</p>}
              <div role="status">
                {success && <p className="alert alert-success settings-message">Settings updated successfully.</p>}
                {saving && <span className="visually-hidden">Saving settings…</span>}
              </div>
              <div className="settings-actions">
                <button type="button" className="btn btn-outline-secondary" disabled={saving} onClick={resetForm}>Reset</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner-border spinner-border-sm" aria-hidden="true" /> : <FiSave aria-hidden="true" />}
                  {saving ? 'Saving…' : 'Save Settings'}
                </button>
              </div>
            </div>
          </form>

          <SavedSettings settings={settings} />
        </div>
      )}
    </section>
  )
}
