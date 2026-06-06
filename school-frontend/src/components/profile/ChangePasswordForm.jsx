import { useState } from 'react'
import { FiLock } from 'react-icons/fi'

const emptyPasswords = {
  current_password: '',
  new_password: '',
  confirm_password: '',
}

export default function ChangePasswordForm({ onSave, saving }) {
  const [form, setForm] = useState(emptyPasswords)
  const [error, setError] = useState('')

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (form.new_password !== form.confirm_password) {
      setError('Password confirmation does not match.')
      return
    }
    if (form.new_password.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    await onSave(form)
    setForm(emptyPasswords)
  }

  return (
    <div className="data-surface p-4">
      <div className="profile-panel-heading">
        <div>
          <p className="text-uppercase text-muted small mb-1">Security</p>
          <h3 className="h5 mb-0">Change Password</h3>
        </div>
        <span className="profile-panel-icon"><FiLock aria-hidden="true" /></span>
      </div>
      {error ? <div className="alert alert-danger py-2">{error}</div> : null}
      <form className="profile-form-grid" onSubmit={handleSubmit}>
        <div>
          <label className="form-label" htmlFor="current_password">Current password</label>
          <input className="form-control" id="current_password" name="current_password" type="password" value={form.current_password} onChange={updateField} required />
        </div>
        <div>
          <label className="form-label" htmlFor="new_password">New password</label>
          <input className="form-control" id="new_password" name="new_password" type="password" value={form.new_password} onChange={updateField} required />
        </div>
        <div>
          <label className="form-label" htmlFor="confirm_password">Confirm new password</label>
          <input className="form-control" id="confirm_password" name="confirm_password" type="password" value={form.confirm_password} onChange={updateField} required />
        </div>
        <div className="profile-form-actions profile-form-wide">
          <button className="btn btn-primary d-inline-flex align-items-center gap-2" type="submit" disabled={saving}>
            <FiLock aria-hidden="true" />
            <span>{saving ? 'Updating...' : 'Update Password'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
