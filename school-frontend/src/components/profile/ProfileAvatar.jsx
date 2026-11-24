import { useState } from 'react'

export default function ProfileAvatar({ profile, photoUrl, className = 'profile-avatar' }) {
  const [failedUrl, setFailedUrl] = useState(null)
  const first = profile?.first_name?.[0] || profile?.name?.[0] || 'U'
  const last = profile?.last_name?.[0] || ''
  const initials = `${first}${last}`.toUpperCase()

  return (
    <div className={className}>
      {photoUrl && photoUrl !== failedUrl ? (
        <img key={photoUrl} src={photoUrl} alt="" onError={() => setFailedUrl(photoUrl)} />
      ) : <span>{initials}</span>}
    </div>
  )
}
