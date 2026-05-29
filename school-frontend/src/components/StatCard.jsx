export default function StatCard({ label, value, tone = 'primary' }) {
  return (
    <div className={`stat-card border-${tone}`}>
      <div className="text-muted small text-uppercase">{label}</div>
      <div className="display-6 fw-semibold">{value}</div>
    </div>
  )
}
