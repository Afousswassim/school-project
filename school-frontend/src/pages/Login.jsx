import { useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { FiEye, FiEyeOff, FiLogIn, FiMoon, FiSun } from 'react-icons/fi'
import { homeForRole } from '../auth/roles'
import { Brand, PageState } from '../components/WorkspaceUI'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import './Login.css'

export default function Login() {
  const { login, authChecking, isAuthenticated, user } = useAuth()
  const { darkMode, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: 'admin@school.test', password: 'password' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submitting = useRef(false)
  const themeLabel = darkMode ? 'Use light mode' : 'Use dark mode'

  if (isAuthenticated) return <Navigate to={homeForRole(user?.role)} replace />

  async function submit(event) {
    event.preventDefault()
    if (submitting.current) return

    const credentials = new FormData(event.currentTarget)
    submitting.current = true
    setLoading(true)
    setError('')
    try {
      const loggedInUser = await login({ email: credentials.get('email'), password: credentials.get('password') })
      navigate(homeForRole(loggedInUser.role), { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed')
    } finally {
      submitting.current = false
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <button type="button" className="btn btn-outline-secondary icon-btn login-theme" onClick={toggleTheme} title={themeLabel} aria-label={themeLabel}>
        {darkMode ? <FiSun aria-hidden="true" /> : <FiMoon aria-hidden="true" />}
      </button>

      <section className="data-surface login-panel" aria-labelledby="login-title">
        <Brand />
        <h1 id="login-title">Sign in</h1>
        {authChecking ? <PageState loading>Checking your session…</PageState> : (
          <>
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            <form onSubmit={submit}>
              <fieldset disabled={loading} className="login-fields">
                <div>
                  <label className="form-label" htmlFor="login-email">Email</label>
                  <input className="form-control" id="login-email" name="email" type="email" autoComplete="username"
                    autoCapitalize="none" spellCheck={false} value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })} required />
                </div>
                <div>
                  <label className="form-label" htmlFor="login-password">Password</label>
                  <div className="login-password-field">
                    <input className="form-control" id="login-password" name="password"
                      type={showPassword ? 'text' : 'password'} autoComplete="current-password" spellCheck={false}
                      value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
                    <button type="button" className="btn login-password-toggle"
                      aria-label={showPassword ? 'Hide password' : 'Show password'} aria-controls="login-password"
                      onClick={() => setShowPassword((visible) => !visible)}>
                      {showPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary login-submit">
                  {loading ? <span className="spinner-border spinner-border-sm" aria-hidden="true" /> : <FiLogIn aria-hidden="true" />}
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </fieldset>
              <span className="visually-hidden" role="status">{loading && 'Signing in…'}</span>
            </form>
          </>
        )}
      </section>
    </main>
  )
}
