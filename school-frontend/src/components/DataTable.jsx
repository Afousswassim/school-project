import { FiEdit2, FiTrash2 } from 'react-icons/fi'
import { PageState, StatusBadge } from './WorkspaceUI'

function cellValue(row, key) {
  const value = row[key]
  if (key === 'status') return <StatusBadge value={value} />
  if (key === 'subject_id') return row.subject_name || (value == null ? '—' : `#${value}`)
  if (key === 'exam_date' || key === 'attendance_date') return value ? <time dateTime={value}>{value}</time> : '—'
  return value ?? '—'
}

export default function DataTable({ label, columns, rows, onEdit, onDelete, canWrite, busy, emptyMessage }) {
  if (!rows.length) return <PageState>{emptyMessage}</PageState>

  return (
    <div className="table-responsive table-scroll" tabIndex={0} role="region" aria-label={label}>
      <table className="table align-middle mb-0">
        <thead>
          <tr>
            {columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}
            {canWrite && <th scope="col" className="text-end">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => <td key={column.key} className={column.className}>{cellValue(row, column.key)}</td>)}
              {canWrite && (
                <td className="text-end">
                  <div className="row-actions">
                    <button type="button" className="btn btn-sm btn-outline-secondary icon-btn" disabled={busy} onClick={(event) => onEdit(row, event)} aria-label={`Edit record ${row.id}`} title="Edit">
                      <FiEdit2 aria-hidden="true" />
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-danger icon-btn" disabled={busy} onClick={() => onDelete(row.id)} aria-label={`Delete record ${row.id}`} title="Delete">
                      <FiTrash2 aria-hidden="true" />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
