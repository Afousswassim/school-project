export default function SimplePage({ title, eyebrow = 'Workspace', children }) {
  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <p className="text-uppercase text-muted small mb-1">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="data-surface p-4">
        {children}
      </div>
    </section>
  )
}
