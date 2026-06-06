import { useState } from 'react'
import { FiSave, FiX } from 'react-icons/fi'

const emptyForm = {
  first_name: '',
  last_name: '',
  phone: '',
  address: '',
  date_of_birth: '',
  gender: '',
}

function profileToForm(profile) {
  return {
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    date_of_birth: profile?.date_of_birth || '',
    gender: profile?.gender || '',
  }
}

export default function EditProfileForm({ profile, onCancel, onSave, saving }) {
  const [form, setForm] = useState(() => profileToForm(profile) || emptyForm)

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSave(form)
  }

  return (
    <div className="profile-modal-backdrop" role="presentation">
      <div className="profile-modal data-surface" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
        <div className="profile-modal-header">
          <div>
            <p className="text-uppercase text-muted small mb-1">Profile</p>
            <h3 className="h5 mb-0" id="edit-profile-title">Edit Profile</h3>
          </div>
          <button className="btn btn-outline-secondary icon-btn" type="button" onClick={onCancel} title="Close">
            <FiX aria-hidden="true" />
          </button>
        </div>
        <form className="profile-form-grid" onSubmit={handleSubmit}>
          <div>
            <label className="form-label" htmlFor="first_name">First name</label>
            <input className="form-control" id="first_name" name="first_name" value={form.first_name} onChange={updateField} required />
          </div>
          <div>
            <label className="form-label" htmlFor="last_name">Last name</label>
            <input className="form-control" id="last_name" name="last_name" value={form.last_name} onChange={updateField} required />
          </div>
          <div>
            <label className="form-label" htmlFor="phone">Phone</label>
            <input className="form-control" id="phone" name="phone" value={form.phone} onChange={updateField} />
          </div>
          <div>
            <label className="form-label" htmlFor="date_of_birth">Date of birth</label>
            <input className="form-control" id="date_of_birth" name="date_of_birth" type="date" value={form.date_of_birth} onChange={updateField} />
          </div>
          <div>
            <label className="form-label" htmlFor="gender">Gender</label>
            <select className="form-select" id="gender" name="gender" value={form.gender} onChange={updateField}>
              <option value="">Not set</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="profile-form-wide">
            <label className="form-label" htmlFor="address">Address</label>
            <textarea className="form-control" id="address" name="address" rows="3" value={form.address} onChange={updateField} />
          </div>
          <div className="profile-form-actions">
            <button className="btn btn-outline-secondary d-inline-flex align-items-center gap-2" type="button" onClick={onCancel}>
              <FiX aria-hidden="true" />
              <span>Cancel</span>
            </button>
            <button className="btn btn-primary d-inline-flex align-items-center gap-2" type="submit" disabled={saving}>
              <FiSave aria-hidden="true" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
