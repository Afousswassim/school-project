import { FiBookOpen, FiInbox } from 'react-icons/fi'

export function Brand() {
  return <div className="brand"><span className="brand-mark"><FiBookOpen aria-hidden="true" /></span> SchoolPro</div>
}

export function PageHeading({ title, description, action }) {
  return (
    <header className="section-heading">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  )
}

export function PageState({ loading, children }) {
  return (
    <div className="page-state" role="status">
      {loading ? <span className="spinner-border spinner-border-sm" aria-hidden="true" /> : <FiInbox aria-hidden="true" />}
      <span>{children}</span>
    </div>
  )
}

const statusTones = {
  active: 'success', present: 'success', validated: 'success',
  late: 'warning', pending: 'warning', absent: 'danger',
  graduated: 'info', excused: 'info', inactive: 'neutral',
}

export function StatusBadge({ value, label, tone }) {
  if (!value && !label) return '—'
  return <span className={`status-badge tone-${tone || statusTones[value] || 'neutral'}`}>{label || value}</span>
}
