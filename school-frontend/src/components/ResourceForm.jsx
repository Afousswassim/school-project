export default function ResourceForm({ fields, form, onChange, onSubmit, onCancel, editing }) {
  return (
    <form className="resource-form" onSubmit={onSubmit}>
      <div className="row g-3">
        {fields.map((field) => (
          <div className="col-md-6" key={field.name}>
            <label className="form-label">{field.label}</label>
            {field.type === 'select' ? (
              <select className="form-select" value={form[field.name] ?? ''} onChange={(event) => onChange(field.name, event.target.value)} required={field.required}>
                <option value="">Select</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            ) : (
              <input
                className="form-control"
                type={field.type || 'text'}
                value={form[field.name] ?? ''}
                onChange={(event) => onChange(field.name, event.target.value)}
                required={field.required}
                min={field.min}
                step={field.step}
              />
            )}
          </div>
        ))}
      </div>
      <div className="d-flex gap-2 mt-3">
        <button className="btn btn-primary" type="submit">{editing ? 'Update' : 'Create'}</button>
        <button className="btn btn-outline-secondary" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
