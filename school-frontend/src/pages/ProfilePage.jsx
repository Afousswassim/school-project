import { useEffect, useMemo, useState } from 'react'
import { FiRefreshCw } from 'react-icons/fi'
import ChangePasswordForm from '../components/profile/ChangePasswordForm'
import EditProfileForm from '../components/profile/EditProfileForm'
import ProfileCard from '../components/profile/ProfileCard'
import ProfilePhotoUploader from '../components/profile/ProfilePhotoUploader'
import { profileService } from '../services/profileService'
import { useAuth } from '../context/AuthContext'

function apiOrigin() {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
  return base.replace(/\/api\/?$/, '')
}

function errorMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback
}

export default function ProfilePage() {
  const { updateUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState(null)

  const photoUrl = useMemo(() => {
    if (!profile?.profile_photo) return ''
    if (/^https?:\/\//i.test(profile.profile_photo)) return profile.profile_photo
    return `${apiOrigin()}${profile.profile_photo}`
  }, [profile?.profile_photo])

  async function loadProfile() {
    setLoading(true)
    setNotice(null)
    try {
      setProfile(await profileService.get())
    } catch (error) {
      setNotice({ type: 'danger', text: errorMessage(error, 'Could not load profile.') })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    profileService.get()
      .then((nextProfile) => {
        if (active) {
          setProfile(nextProfile)
        }
      })
      .catch((error) => {
        if (active) {
          setNotice({ type: 'danger', text: errorMessage(error, 'Could not load profile.') })
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  function syncSession(nextProfile) {
    updateUser?.({
      name: `${nextProfile.first_name || ''} ${nextProfile.last_name || ''}`.trim() || nextProfile.name,
      profile_photo: nextProfile.profile_photo,
    })
  }

  async function handleSave(payload) {
    setSaving('profile')
    setNotice(null)
    try {
      const nextProfile = await profileService.update(payload)
      setProfile(nextProfile)
      syncSession(nextProfile)
      setEditing(false)
      setNotice({ type: 'success', text: 'Profile updated successfully.' })
    } catch (error) {
      setNotice({ type: 'danger', text: errorMessage(error, 'Could not update profile.') })
    } finally {
      setSaving('')
    }
  }

  async function handlePhotoUpload(file) {
    setSaving('photo')
    setNotice(null)
    try {
      const nextProfile = await profileService.uploadPhoto(file)
      setProfile(nextProfile)
      syncSession(nextProfile)
      setNotice({ type: 'success', text: 'Profile photo updated successfully.' })
    } catch (error) {
      setNotice({ type: 'danger', text: errorMessage(error, 'Could not update profile photo.') })
    } finally {
      setSaving('')
    }
  }

  async function handlePasswordSave(payload) {
    setSaving('password')
    setNotice(null)
    try {
      await profileService.changePassword(payload)
      setNotice({ type: 'success', text: 'Password updated successfully.' })
    } catch (error) {
      setNotice({ type: 'danger', text: errorMessage(error, 'Could not update password.') })
    } finally {
      setSaving('')
    }
  }

  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <p className="text-uppercase text-muted small mb-1">Account</p>
          <h2>Profile</h2>
        </div>
        <button className="btn btn-outline-secondary d-inline-flex align-items-center gap-2" type="button" onClick={loadProfile} disabled={loading}>
          <FiRefreshCw aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </div>

      {notice ? <div className={`alert alert-${notice.type}`}>{notice.text}</div> : null}

      {loading ? (
        <div className="data-surface profile-loading">
          <div className="spinner-border text-primary" role="status" />
          <span>Loading profile...</span>
        </div>
      ) : profile ? (
        <div className="profile-layout">
          <div className="profile-main-column">
            <ProfileCard profile={profile} photoUrl={photoUrl} onEdit={() => setEditing(true)} />
            <ChangePasswordForm onSave={handlePasswordSave} saving={saving === 'password'} />
          </div>
          <aside className="profile-side-column">
            <div className="data-surface p-4">
              <div className="profile-panel-heading">
                <div>
                  <p className="text-uppercase text-muted small mb-1">Photo</p>
                  <h3 className="h5 mb-0">Profile Picture</h3>
                </div>
              </div>
              <ProfilePhotoUploader profile={profile} photoUrl={photoUrl} onUpload={handlePhotoUpload} saving={saving === 'photo'} />
            </div>
          </aside>
          {editing ? <EditProfileForm profile={profile} onCancel={() => setEditing(false)} onSave={handleSave} saving={saving === 'profile'} /> : null}
        </div>
      ) : null}
    </section>
  )
}
