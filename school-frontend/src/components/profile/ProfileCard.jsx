import { FiEdit2, FiMail, FiMapPin, FiPhone, FiShield, FiUser } from 'react-icons/fi'

function Field({ icon: Icon, label, value }) {
  return (
    <div className="profile-field">
      <Icon aria-hidden="true" />
      <div>
        <span>{label}</span>
        <strong>{value || 'Not provided'}</strong>
      </div>
    </div>
  )
}

function formatDate(value) {
  if (!value) return 'Not provided'
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value))
}

function roleTitle(role) {
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User'
}

export default function ProfileCard({ profile, photoUrl, onEdit }) {
  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.name
  const initials = `${profile.first_name?.[0] || profile.name?.[0] || 'U'}${profile.last_name?.[0] || ''}`.toUpperCase()
  const classInfo = profile.class_info
    ? [profile.class_info.name, profile.class_info.level, profile.class_info.section, profile.class_info.academic_year].filter(Boolean).join(' / ')
    : ''
  const subjects = profile.subjects?.length ? profile.subjects.map((subject) => subject.name).join(', ') : ''

  return (
    <div className="data-surface profile-card">
      <div className="profile-card-header">
        <div className="profile-identity">
          <div className="profile-avatar">
            {photoUrl ? <img src={photoUrl} alt="" /> : <span>{initials}</span>}
          </div>
          <div>
            <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
              <h2 className="h3 mb-0">{fullName}</h2>
              <span className={`profile-role-badge profile-role-${profile.role}`}>{roleTitle(profile.role)}</span>
            </div>
            <p className="text-muted mb-0">{profile.email}</p>
          </div>
        </div>
        <button className="btn btn-primary d-inline-flex align-items-center gap-2" type="button" onClick={onEdit}>
          <FiEdit2 aria-hidden="true" />
          <span>Edit Profile</span>
        </button>
      </div>

      <div className="profile-info-grid">
        <Field icon={FiMail} label="Email" value={profile.email} />
        <Field icon={FiPhone} label="Phone" value={profile.phone} />
        <Field icon={FiMapPin} label="Address" value={profile.address} />
        <Field icon={FiUser} label="Date of birth" value={formatDate(profile.date_of_birth)} />
        <Field icon={FiUser} label="Gender" value={roleTitle(profile.gender)} />
        <Field icon={FiShield} label="Account status" value={roleTitle(profile.status)} />
        {profile.role === 'student' ? <Field icon={FiUser} label="Class" value={classInfo} /> : null}
        {profile.role === 'teacher' ? <Field icon={FiUser} label="Subjects" value={subjects || profile.qualification} /> : null}
        <Field icon={FiUser} label="Created" value={formatDate(profile.created_at)} />
      </div>
    </div>
  )
}
