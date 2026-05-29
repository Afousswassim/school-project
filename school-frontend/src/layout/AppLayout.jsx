import { NavLink, Outlet } from 'react-router-dom'
import { FiBookOpen, FiCreditCard, FiGrid, FiLogOut, FiMoon, FiSun, FiUsers } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const navItems = [
  ['/', 'Dashboard', FiGrid],
  ['/students', 'Students', FiUsers],
  ['/teachers', 'Teachers', FiUsers],
  ['/subjects', 'Subjects', FiBookOpen],
  ['/classes', 'Classes', FiGrid],
  ['/grades', 'Grades', FiBookOpen],
  ['/attendance', 'Attendance', FiGrid],
  ['/payments', 'Payments', FiCreditCard],
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const { darkMode, toggleTheme } = useTheme()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">SchoolPro</div>
        <nav className="nav flex-column gap-1">
          {navItems.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'} className="nav-link">
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main-panel">
        <header className="topbar">
          <div>
            <div className="text-muted small text-uppercase">{user?.role || 'User'}</div>
            <h1 className="h4 mb-0">{user?.name || 'School workspace'}</h1>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-outline-secondary icon-btn" onClick={toggleTheme} title="Toggle dark mode">
              {darkMode ? <FiSun /> : <FiMoon />}
            </button>
            <button className="btn btn-primary d-flex align-items-center gap-2" onClick={logout}>
              <FiLogOut aria-hidden="true" />
              <span>Logout</span>
            </button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  )
}
