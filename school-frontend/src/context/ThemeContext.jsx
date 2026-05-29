/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('school_theme') === 'dark')

  useEffect(() => {
    document.documentElement.dataset.bsTheme = darkMode ? 'dark' : 'light'
    localStorage.setItem('school_theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  const value = useMemo(() => ({ darkMode, toggleTheme: () => setDarkMode((value) => !value) }), [darkMode])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
