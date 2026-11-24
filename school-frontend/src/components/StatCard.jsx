import { Link } from 'react-router-dom'

export default function StatCard({ label, value, tone = 'primary', icon: Icon, to }) {
  const className = `stat-card tone-${tone}`
  const content = <>
    <span className="stat-icon"><Icon aria-hidden="true" /></span>
    <strong className="stat-value">{value ?? '—'}</strong>
    <span className="stat-label">{label}</span>
  </>
  return to ? <Link to={to} className={className}>{content}</Link> : <div className={className}>{content}</div>
}
