import { FiEdit2, FiTrash2 } from 'react-icons/fi'

export default function DataTable({ columns, rows, onEdit, onDelete, canWrite }) {
  return (
    <div className="table-responsive data-surface">
      <table className="table align-middle mb-0">
        <thead>
          <tr>
            {columns.map((column) => <th key={column.key}>{column.label}</th>)}
            {canWrite && <th className="text-end">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length + 1} className="text-center text-muted py-5">No records found</td></tr>
          ) : rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => <td key={column.key}>{row[column.key] ?? '-'}</td>)}
              {canWrite && (
                <td className="text-end">
                  <button className="btn btn-sm btn-outline-secondary me-2 icon-btn" onClick={() => onEdit(row)} title="Edit">
                    <FiEdit2 />
                  </button>
                  <button className="btn btn-sm btn-outline-danger icon-btn" onClick={() => onDelete(row.id)} title="Delete">
                    <FiTrash2 />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
