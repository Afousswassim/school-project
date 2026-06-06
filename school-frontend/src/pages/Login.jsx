import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { FiLogIn } from 'react-icons/fi'
import { homeForRole } from '../auth/roles'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, authChecking, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: 'admin@school.test', password: 'password' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (authChecking) {
    return null
  }

  if (isAuthenticated) {
    return <Navigate to={homeForRole(user?.role)} replace />
  }

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const loggedInUser = await login(form)
      navigate(homeForRole(loggedInUser.role), { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div>
          <p className="text-uppercase text-primary fw-semibold small mb-2">School Management</p>
          <h1 className="mb-2">Sign in</h1>
          <p className="text-muted">Manage academics, attendance, grades, and billing from one workspace.</p>
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={submit} className="d-grid gap-3">
          <div>
            <label className="form-label">Email</label>
            <input className="form-control" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          </div>
          <div>
            <label className="form-label">Password</label>
            <input className="form-control" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
          </div>
          <button className="btn btn-primary btn-lg d-flex align-items-center justify-content-center gap-2" disabled={loading}>
            <FiLogIn aria-hidden="true" />
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  )
}
