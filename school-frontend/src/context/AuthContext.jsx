/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authService } from '../services/authService'

const AuthContext = createContext(null)
const TOKEN_KEY = 'school_token'
const USER_KEY = 'school_user'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(null)
  const [authChecking, setAuthChecking] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)))

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const login = useCallback(async (credentials) => {
    const session = await authService.login(credentials)
    if (!session?.token || !session?.user?.role) {
      throw new Error('Login response did not include a valid token and role')
    }
    localStorage.setItem(TOKEN_KEY, session.token)
    localStorage.setItem(USER_KEY, JSON.stringify(session.user))
    setToken(session.token)
    setUser(session.user)
    setAuthChecking(false)
    return session.user
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setAuthChecking(false)
  }, [clearSession])

  const updateUser = useCallback((updates) => {
    setUser((current) => {
      if (!current) return current
      const nextUser = { ...current, ...updates }
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
      return nextUser
    })
  }, [])

  useEffect(() => {
    function handleUnauthorized() {
      clearSession()
      setAuthChecking(false)
    }

    window.addEventListener('school:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('school:unauthorized', handleUnauthorized)
  }, [clearSession])

  useEffect(() => {
    let active = true
    const savedToken = localStorage.getItem(TOKEN_KEY)

    if (!savedToken) {
      localStorage.removeItem(USER_KEY)
      return () => {
        active = false
      }
    }

    authService.me()
      .then((verifiedUser) => {
        if (!active) return
        if (!verifiedUser?.role) {
          clearSession()
          return
        }
        localStorage.setItem(USER_KEY, JSON.stringify(verifiedUser))
        setToken(savedToken)
        setUser(verifiedUser)
      })
      .catch(() => {
        if (active) {
          clearSession()
        }
      })
      .finally(() => {
        if (active) {
          setAuthChecking(false)
        }
      })

    return () => {
      active = false
    }
  }, [clearSession])

  const value = useMemo(
    () => ({ token, user, login, logout, updateUser, authChecking, isAuthenticated: Boolean(token && user && !authChecking) }),
    [token, user, login, logout, updateUser, authChecking],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
