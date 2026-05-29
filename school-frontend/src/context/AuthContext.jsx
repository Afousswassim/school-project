/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react'
import { authService } from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('school_token'))
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('school_user')
    return saved ? JSON.parse(saved) : null
  })

  async function login(credentials) {
    const session = await authService.login(credentials)
    localStorage.setItem('school_token', session.token)
    localStorage.setItem('school_user', JSON.stringify(session.user))
    setToken(session.token)
    setUser(session.user)
    return session.user
  }

  function logout() {
    localStorage.removeItem('school_token')
    localStorage.removeItem('school_user')
    setToken(null)
    setUser(null)
  }

  const value = useMemo(() => ({ token, user, login, logout, isAuthenticated: Boolean(token) }), [token, user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
