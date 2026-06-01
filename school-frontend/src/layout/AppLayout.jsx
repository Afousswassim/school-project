import { NavLink, Outlet } from 'react-router-dom'
import { FiLogOut, FiMoon, FiSun } from 'react-icons/fi'
import { NAV_ITEMS } from '../auth/roles'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function AppLayout() {
  const { user, logout } = useAuth()
  const { darkMode, toggleTheme } = useTheme()
  const navItems = NAV_ITEMS.filter((item) => item.roles.includes(user?.role))

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">SchoolPro</div>
        <nav className="nav flex-column gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
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
