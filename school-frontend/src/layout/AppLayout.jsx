import { useRef } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { FiLogOut, FiMenu, FiMoon, FiSun, FiX } from 'react-icons/fi'
import { NAV_ITEMS } from '../auth/roles'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Brand } from '../components/WorkspaceUI'
import ProfileAvatar from '../components/profile/ProfileAvatar'
import { profilePhotoUrl } from '../services/profileService'

const roleLabels = { admin: 'Administrator', teacher: 'Teacher', student: 'Student' }

function Navigation({ entries, onNavigate }) {
  return (
    <nav className="workspace-navigation" aria-label="Workspace">
      {entries.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end className="workspace-link" onClick={onNavigate}>
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const { darkMode, toggleTheme } = useTheme()
  const menu = useRef(null)
  const navItems = NAV_ITEMS.filter((item) => item.roles.includes(user?.role))
  const role = roleLabels[user?.role]
  const themeLabel = darkMode ? 'Use light mode' : 'Use dark mode'
  const closeMenu = () => menu.current?.close()

  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace-content">Skip to content</a>
      <aside className="sidebar">
        <Brand />
        <p className="nav-caption">{role} workspace</p>
        <Navigation entries={navItems} />
      </aside>
      <dialog className="mobile-menu" ref={menu} aria-label="Workspace menu">
        <div className="mobile-menu-header">
          <Brand />
          <button type="button" className="btn btn-outline-secondary icon-btn" onClick={closeMenu} aria-label="Close menu"><FiX aria-hidden="true" /></button>
        </div>
        <p className="nav-caption">{role} workspace</p>
        <Navigation entries={navItems} onNavigate={closeMenu} />
      </dialog>
      <div className="main-panel">
        <header className="topbar">
          <div className="topbar-start">
            <button type="button" className="btn btn-outline-secondary icon-btn mobile-toggle" onClick={() => menu.current?.showModal()} aria-label="Open menu" aria-haspopup="dialog"><FiMenu aria-hidden="true" /></button>
            <div className="mobile-brand"><Brand /></div>
            <span className="topbar-label">School workspace</span>
          </div>
          <div className="topbar-actions">
            <div className="topbar-account">
              <ProfileAvatar profile={user} photoUrl={profilePhotoUrl(user?.profile_photo)} className="topbar-avatar" />
              <div className="account-name"><strong>{user?.name}</strong><span>{role}</span></div>
            </div>
            <button type="button" className="btn btn-outline-secondary icon-btn" onClick={toggleTheme} title={themeLabel} aria-label={themeLabel}>
              {darkMode ? <FiSun aria-hidden="true" /> : <FiMoon aria-hidden="true" />}
            </button>
            <button type="button" className="btn btn-outline-secondary logout-button" onClick={logout} aria-label="Logout" title="Logout">
              <FiLogOut aria-hidden="true" /><span>Logout</span>
            </button>
          </div>
        </header>
        <main id="workspace-content" tabIndex={-1}><Outlet /></main>
      </div>
    </div>
  )
}
