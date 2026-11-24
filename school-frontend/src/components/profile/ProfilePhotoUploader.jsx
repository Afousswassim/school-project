import { useEffect, useState } from 'react'
import { FiCamera, FiUpload } from 'react-icons/fi'
import ProfileAvatar from './ProfileAvatar'

const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function ProfilePhotoUploader({ profile, photoUrl, onUpload, saving }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview)
      }
    }
  }, [preview])

  function handleFileChange(event) {
    const selected = event.target.files?.[0]
    setError('')
    if (!selected) {
      setFile(null)
      setPreview('')
      return
    }
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError('Use a JPG, PNG, or WEBP image.')
      setFile(null)
      setPreview('')
      return
    }
    if (selected.size > MAX_BYTES) {
      setError('Image must be 2MB or smaller.')
      setFile(null)
      setPreview('')
      return
    }
    if (preview) {
      URL.revokeObjectURL(preview)
    }
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!file) {
      setError('Choose an image first.')
      return
    }
    await onUpload(file)
    setFile(null)
    setPreview('')
  }

  return (
    <form className="profile-photo-panel" onSubmit={handleSubmit}>
      <ProfileAvatar profile={profile} photoUrl={preview || photoUrl} className="profile-avatar profile-avatar-xl" />
      <label className="btn btn-outline-primary d-inline-flex align-items-center gap-2 mb-0">
        <FiCamera aria-hidden="true" />
        <span>Choose Photo</span>
        <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleFileChange} hidden />
      </label>
      <button className="btn btn-primary d-inline-flex align-items-center gap-2" type="submit" disabled={!file || saving}>
        <FiUpload aria-hidden="true" />
        <span>{saving ? 'Uploading...' : 'Save Photo'}</span>
      </button>
      <p className="text-muted small mb-0">JPG, PNG, or WEBP. Max 2MB.</p>
      {error ? <div className="alert alert-danger py-2 mb-0">{error}</div> : null}
    </form>
  )
}
