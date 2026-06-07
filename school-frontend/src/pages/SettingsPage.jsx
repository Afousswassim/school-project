import { useEffect, useState } from 'react'
import { settingsService } from '../services/settingsService'

export default function SettingsPage() {
  const [settings, setSettings] = useState(null)
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    setError('')
    try {
      const data = await settingsService.get()
      setSettings(data)
      setForm(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load settings')
      console.error('Settings error:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const updated = await settingsService.update(form)
      setSettings(updated)
      setSuccess('Settings updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="text-uppercase text-muted small mb-1">Admin</p>
            <h2>System Settings</h2>
          </div>
        </div>
        <div className="data-surface p-4 text-center text-muted">Loading settings...</div>
      </section>
    )
  }

  if (!settings) {
    return (
      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="text-uppercase text-muted small mb-1">Admin</p>
            <h2>System Settings</h2>
          </div>
        </div>
        <div className="alert alert-danger">Settings not found</div>
      </section>
    )
  }

  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <p className="text-uppercase text-muted small mb-1">Admin</p>
          <h2>System Settings</h2>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="data-surface p-4">
            {error && <div className="alert alert-danger mb-3">{error}</div>}
            {success && <div className="alert alert-success mb-3">{success}</div>}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">School Name</label>
                <input
                  type="text"
                  className="form-control"
                  name="school_name"
                  value={form.school_name || ''}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Academic Year</label>
                <input
                  type="text"
                  className="form-control"
                  name="academic_year"
                  value={form.academic_year || ''}
                  onChange={handleChange}
                  placeholder="e.g., 2025-2026"
                />
              </div>

              <div className="mb-3">
                <label className="form-label">School Email</label>
                <input
                  type="email"
                  className="form-control"
                  name="school_email"
                  value={form.school_email || ''}
                  onChange={handleChange}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">School Phone</label>
                <input
                  type="tel"
                  className="form-control"
                  name="school_phone"
                  value={form.school_phone || ''}
                  onChange={handleChange}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">School Address</label>
                <textarea
                  className="form-control"
                  name="school_address"
                  value={form.school_address || ''}
                  onChange={handleChange}
                  rows="4"
                />
              </div>

              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setForm(settings)
                    setError('')
                  }}
                  disabled={saving}
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="data-surface p-4">
            <h5 className="mb-3">Current Settings</h5>
            <div className="mb-3">
              <small className="text-muted d-block">School Name</small>
              <strong>{settings.school_name}</strong>
            </div>
            <div className="mb-3">
              <small className="text-muted d-block">Academic Year</small>
              <strong>{settings.academic_year}</strong>
            </div>
            <div className="mb-3">
              <small className="text-muted d-block">Email</small>
              <strong>{settings.school_email}</strong>
            </div>
            <div className="mb-3">
              <small className="text-muted d-block">Phone</small>
              <strong>{settings.school_phone}</strong>
            </div>
            <div>
              <small className="text-muted d-block">Last Updated</small>
              <strong>{new Date(settings.updated_at).toLocaleString()}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
