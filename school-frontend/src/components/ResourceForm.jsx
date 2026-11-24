export default function ResourceForm({ fields, form, onChange, onSubmit, onCancel, editing, saving }) {
  return (
    <form className="resource-form" onSubmit={onSubmit}>
      <fieldset disabled={saving}>
        <div className="row g-3">
          {fields.map((field) => (
            <div className="col-md-6" key={field.name}>
              <label className="form-label" htmlFor={`record-${field.name}`}>{field.label}{field.required && <span className="required-marker" aria-hidden="true"> *</span>}</label>
              {field.type === 'select' ? (
                <select id={`record-${field.name}`} className="form-select" value={form[field.name] ?? ''} onChange={(event) => onChange(field.name, event.target.value)} required={field.required}>
                  <option value="">Select</option>
                  {field.options.map((option) => (
                    <option key={option} value={option}>{option[0].toUpperCase() + option.slice(1)}</option>
                  ))}
                </select>
              ) : (
                <input
                  id={`record-${field.name}`}
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
        <div className="form-actions">
          <button className="btn btn-primary" type="submit">{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</button>
          <button className="btn btn-outline-secondary" type="button" onClick={onCancel}>Cancel</button>
        </div>
      </fieldset>
    </form>
  )
}
