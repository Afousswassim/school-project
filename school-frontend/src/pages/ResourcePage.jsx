import { useCallback, useEffect, useMemo, useState } from 'react'
import DataTable from '../components/DataTable'
import ResourceForm from '../components/ResourceForm'
import { resourceService } from '../services/resourceService'
import { useAuth } from '../context/AuthContext'

const config = {
  students: {
    title: 'Students',
    columns: ['id', 'student_number', 'first_name', 'last_name', 'email', 'status'],
    fields: [
      ['student_number', 'Student Number', 'text', true], ['first_name', 'First Name', 'text', true], ['last_name', 'Last Name', 'text', true],
      ['email', 'Email', 'email', true], ['phone', 'Phone'], ['class_id', 'Class ID', 'number'], ['date_of_birth', 'Birth Date', 'date'],
      ['gender', 'Gender', 'select', false, ['male', 'female', 'other']], ['enrollment_date', 'Enrollment Date', 'date'], ['status', 'Status', 'select', true, ['active', 'inactive', 'graduated']],
    ],
  },
  teachers: {
    title: 'Teachers',
    columns: ['id', 'employee_number', 'first_name', 'last_name', 'email', 'status'],
    fields: [['employee_number', 'Employee Number', 'text', true], ['first_name', 'First Name', 'text', true], ['last_name', 'Last Name', 'text', true], ['email', 'Email', 'email', true], ['phone', 'Phone'], ['hire_date', 'Hire Date', 'date'], ['qualification', 'Qualification'], ['status', 'Status', 'select', true, ['active', 'inactive']]],
  },
  subjects: {
    title: 'Subjects',
    columns: ['id', 'code', 'name', 'credits', 'status'],
    fields: [['code', 'Code', 'text', true], ['name', 'Name', 'text', true], ['teacher_id', 'Teacher ID', 'number'], ['description', 'Description'], ['credits', 'Credits', 'number'], ['status', 'Status', 'select', true, ['active', 'inactive']]],
  },
  classes: {
    title: 'Classes',
    columns: ['id', 'name', 'level', 'section', 'academic_year', 'capacity', 'status'],
    fields: [['name', 'Name', 'text', true], ['level', 'Level', 'text', true], ['section', 'Section'], ['academic_year', 'Academic Year', 'text', true], ['teacher_id', 'Teacher ID', 'number'], ['capacity', 'Capacity', 'number'], ['status', 'Status', 'select', true, ['active', 'inactive']]],
  },
  grades: {
    title: 'Grades',
    columns: ['id', 'student_id', 'subject_id', 'exam_name', 'score', 'max_score', 'term'],
    fields: [['student_id', 'Student ID', 'number', true], ['subject_id', 'Subject ID', 'number', true], ['teacher_id', 'Teacher ID', 'number'], ['exam_name', 'Exam Name', 'text', true], ['exam_date', 'Exam Date', 'date', true], ['score', 'Score', 'number', true], ['max_score', 'Max Score', 'number', true], ['term', 'Term', 'text', true], ['remarks', 'Remarks']],
  },
  attendance: {
    title: 'Attendance',
    columns: ['id', 'student_id', 'class_id', 'subject_id', 'attendance_date', 'status'],
    fields: [['student_id', 'Student ID', 'number', true], ['class_id', 'Class ID', 'number'], ['subject_id', 'Subject ID', 'number'], ['teacher_id', 'Teacher ID', 'number'], ['attendance_date', 'Date', 'date', true], ['status', 'Status', 'select', true, ['present', 'absent', 'late', 'excused']], ['remarks', 'Remarks']],
  },
  payments: {
    title: 'Payments',
    columns: ['id', 'student_id', 'amount', 'due_date', 'payment_date', 'status'],
    fields: [['student_id', 'Student ID', 'number', true], ['amount', 'Amount', 'number', true], ['due_date', 'Due Date', 'date', true], ['payment_date', 'Payment Date', 'date'], ['method', 'Method', 'select', false, ['cash', 'card', 'bank_transfer', 'check']], ['reference', 'Reference'], ['status', 'Status', 'select', true, ['pending', 'paid', 'overdue', 'cancelled']], ['description', 'Description']],
  },
}

function toField([name, label, type = 'text', required = false, options = []]) {
  return { name, label, type, required, options, step: type === 'number' ? '0.01' : undefined }
}

export default function ResourcePage({ resource }) {
  const meta = config[resource]
  const { user } = useAuth()
  const canWrite = user?.role === 'admin' || (['grades', 'attendance'].includes(resource) && user?.role === 'teacher')
  const fields = useMemo(() => meta.fields.map(toField), [meta])
  const columns = meta.columns.map((key) => ({ key, label: key.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }))
  const [rows, setRows] = useState([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const data = await resourceService.list(resource, { page, limit: 10, search })
    setRows(data.items)
    setTotal(data.total)
  }, [resource, page, search])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((err) => setError(err.response?.data?.message || 'Failed to load records'))
  }, [load])

  function startCreate() {
    setEditing(null)
    setForm({})
    setShowForm(true)
  }

  function startEdit(row) {
    setEditing(row)
    setForm(row)
    setShowForm(true)
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    try {
      if (editing) {
        await resourceService.update(resource, editing.id, form)
      } else {
        await resourceService.create(resource, form)
      }
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed')
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this record?')) return
    await resourceService.remove(resource, id)
    await load()
  }

  const totalPages = Math.max(1, Math.ceil(total / 10))

  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <p className="text-uppercase text-muted small mb-1">Management</p>
          <h2>{meta.title}</h2>
        </div>
        {canWrite && <button className="btn btn-primary" onClick={startCreate}>New {meta.title.slice(0, -1)}</button>}
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {showForm && <div className="data-surface p-4 mb-4"><ResourceForm fields={fields} form={form} editing={editing} onChange={(name, value) => setForm({ ...form, [name]: value })} onSubmit={submit} onCancel={() => setShowForm(false)} /></div>}
      <div className="toolbar">
        <input className="form-control" placeholder="Search records" value={search} onChange={(event) => { setPage(1); setSearch(event.target.value) }} />
      </div>
      <DataTable columns={columns} rows={rows} onEdit={startEdit} onDelete={remove} canWrite={canWrite} />
      <div className="d-flex justify-content-between align-items-center mt-3">
        <span className="text-muted small">{total} records</span>
        <div className="btn-group">
          <button className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <button className="btn btn-outline-secondary" disabled>{page} / {totalPages}</button>
          <button className="btn btn-outline-secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      </div>
    </section>
  )
}
