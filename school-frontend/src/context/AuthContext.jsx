/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { authService } from '../services/authService'

const AuthContext = createContext(null)
const TOKEN_KEY = 'school_token'
const USER_KEY = 'school_user'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(USER_KEY)
    try {
      return saved ? JSON.parse(saved) : null
    } catch {
      localStorage.removeItem(USER_KEY)
      return null
    }
  })

  async function login(credentials) {
    const session = await authService.login(credentials)
    if (!session?.token || !session?.user?.role) {
      throw new Error('Login response did not include a valid token and role')
    }
    localStorage.setItem(TOKEN_KEY, session.token)
    localStorage.setItem(USER_KEY, JSON.stringify(session.user))
    setToken(session.token)
    setUser(session.user)
    return session.user
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }

  useEffect(() => {
    function handleUnauthorized() {
      setToken(null)
      setUser(null)
    }

    window.addEventListener('school:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('school:unauthorized', handleUnauthorized)
  }, [])

  const value = useMemo(() => ({ token, user, login, logout, isAuthenticated: Boolean(token && user) }), [token, user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
