import { useEffect, useRef, useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiPlus, FiSearch, FiX } from 'react-icons/fi'
import DataTable from '../components/DataTable'
import ResourceForm from '../components/ResourceForm'
import { PageHeading, PageState } from '../components/WorkspaceUI'
import { resourceService } from '../services/resourceService'
import { useAuth } from '../context/AuthContext'

const config = {
  students: {
    title: 'Students',
    singular: 'Student',
    columns: ['first_name', 'last_name', 'student_number', 'email', 'status', 'id'],
    fields: [
      ['student_number', 'Student Number', 'text', true], ['first_name', 'First Name', 'text', true], ['last_name', 'Last Name', 'text', true],
      ['email', 'Email', 'email', true], ['phone', 'Phone'], ['class_id', 'Class ID', 'number'], ['date_of_birth', 'Birth Date', 'date'],
      ['gender', 'Gender', 'select', false, ['male', 'female', 'other']], ['enrollment_date', 'Enrollment Date', 'date'], ['status', 'Status', 'select', true, ['active', 'inactive', 'graduated']],
    ],
  },
  teachers: {
    title: 'Teachers',
    singular: 'Teacher',
    columns: ['first_name', 'last_name', 'employee_number', 'email', 'status', 'id'],
    fields: [['employee_number', 'Employee Number', 'text', true], ['first_name', 'First Name', 'text', true], ['last_name', 'Last Name', 'text', true], ['email', 'Email', 'email', true], ['phone', 'Phone'], ['hire_date', 'Hire Date', 'date'], ['qualification', 'Qualification'], ['status', 'Status', 'select', true, ['active', 'inactive']]],
  },
  subjects: {
    title: 'Subjects',
    singular: 'Subject',
    columns: ['name', 'code', 'credits', 'status', 'id'],
    fields: [['code', 'Code', 'text', true], ['name', 'Name', 'text', true], ['teacher_id', 'Teacher ID', 'number'], ['description', 'Description'], ['credits', 'Credits', 'number'], ['status', 'Status', 'select', true, ['active', 'inactive']]],
  },
  classes: {
    title: 'Classes',
    singular: 'Class',
    columns: ['name', 'level', 'section', 'academic_year', 'capacity', 'status', 'id'],
    fields: [['name', 'Name', 'text', true], ['level', 'Level', 'text', true], ['section', 'Section'], ['academic_year', 'Academic Year', 'text', true], ['teacher_id', 'Teacher ID', 'number'], ['capacity', 'Capacity', 'number'], ['status', 'Status', 'select', true, ['active', 'inactive']]],
  },
  grades: {
    title: 'Grades',
    singular: 'Grade',
    columns: ['exam_name', 'subject_id', 'score', 'max_score', 'exam_date', 'term', 'student_id', 'id'],
    fields: [['student_id', 'Student ID', 'number', true], ['subject_id', 'Subject ID', 'number', true], ['teacher_id', 'Teacher ID', 'number'], ['exam_name', 'Exam Name', 'text', true], ['exam_date', 'Exam Date', 'date', true], ['score', 'Score', 'number', true], ['max_score', 'Max Score', 'number', true], ['term', 'Term', 'text', true], ['remarks', 'Remarks']],
  },
  attendance: {
    title: 'Attendance',
    singular: 'Attendance Record',
    columns: ['attendance_date', 'status', 'subject_id', 'class_id', 'student_id', 'id'],
    fields: [['student_id', 'Student ID', 'number', true], ['class_id', 'Class ID', 'number'], ['subject_id', 'Subject ID', 'number'], ['teacher_id', 'Teacher ID', 'number'], ['attendance_date', 'Date', 'date', true], ['status', 'Status', 'select', true, ['present', 'absent', 'late', 'excused']], ['remarks', 'Remarks']],
  },
}

function toField([name, label, type = 'text', required = false, options = []]) {
  return { name, label, type, required, options, step: type === 'number' ? '0.01' : undefined }
}

const pageSize = 10
const labels = { id: 'ID', subject_id: 'Subject', student_id: 'Student ID', class_id: 'Class ID', exam_name: 'Assessment', max_score: 'Out of' }

export default function ResourcePage({ resource }) {
  return <ResourceRecords key={resource} resource={resource} />
}

function ResourceRecords({ resource }) {
  const meta = config[resource]
  const { user } = useAuth()
  const canWrite = user?.role === 'admin' || (['grades', 'attendance'].includes(resource) && user?.role === 'teacher')
  const fields = meta.fields.map(toField)
  const columns = meta.columns.filter((key) => user?.role !== 'student' || !['id', 'student_id'].includes(key))
    .map((key, index) => ({
      key,
      label: labels[key] || key.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase()),
      className: index === 0 ? 'primary-cell' : ['id', 'score', 'max_score', 'student_id', 'class_id'].includes(key) ? 'number-cell' : undefined,
    }))
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [response, setResponse] = useState(null)
  const [revision, setRevision] = useState(0)
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const formHeading = useRef(null)
  const formTrigger = useRef(null)
  const query = JSON.stringify([page, search, revision])
  const current = response?.query === query ? response : null
  const rows = current?.data?.items ?? []
  const total = current?.data?.total ?? 0
  const reload = () => setRevision((value) => value + 1)

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      resourceService.list(resource, { page, limit: pageSize, search }, controller.signal)
        .then((data) => {
          if (!controller.signal.aborted) setResponse({ query, data })
        })
        .catch((err) => {
          if (!controller.signal.aborted) setResponse({ query, error: err.response?.data?.message || 'Failed to load records' })
        })
    }, search ? 220 : 0)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [resource, page, search, query])

  useEffect(() => {
    if (showForm) formHeading.current?.focus()
  }, [showForm, editing])

  function closeForm() {
    setShowForm(false)
    formTrigger.current?.focus()
  }

  function startCreate(event) {
    formTrigger.current = event.currentTarget
    setActionError('')
    setNotice('')
    setEditing(null)
    setForm({})
    setShowForm(true)
  }

  function startEdit(row, event) {
    formTrigger.current = event.currentTarget
    setActionError('')
    setNotice('')
    setEditing(row)
    setForm(row)
    setShowForm(true)
  }

  async function submit(event) {
    event.preventDefault()
    setActionError('')
    setSaving(true)
    try {
      if (editing) {
        await resourceService.update(resource, editing.id, form)
      } else {
        await resourceService.create(resource, form)
      }
      closeForm()
      setNotice(editing ? 'Changes saved.' : 'Record created.')
      reload()
    } catch (err) {
      setActionError(err.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this record?')) return
    setActionError('')
    setNotice('')
    setSaving(true)
    try {
      await resourceService.remove(resource, id)
      if (rows.length === 1 && page > 1) setPage(page - 1)
      setNotice('Record deleted.')
      reload()
    } catch (err) {
      setActionError(err.response?.data?.message || 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  function updateSearch(value) {
    setPage(1)
    setSearch(value)
  }

  return (
    <section className="content-section">
      <PageHeading title={user.role === 'student' || resource === 'classes' ? 'My ' + meta.title : meta.title} action={canWrite && (
        <button type="button" className="btn btn-primary" disabled={saving} onClick={startCreate}><FiPlus aria-hidden="true" />New {meta.singular}</button>
      )} />
      {actionError && <div className="alert alert-danger" role="alert">{actionError}</div>}
      {notice && <div className="alert alert-success" role="status">{notice}</div>}
      {showForm && <div className="data-surface record-form">
        <h2 className="panel-heading" ref={formHeading} tabIndex={-1}>{editing ? 'Edit' : 'New'} {meta.singular}</h2>
        <ResourceForm fields={fields} form={form} editing={editing} saving={saving} onChange={(name, value) => setForm({ ...form, [name]: value })} onSubmit={submit} onCancel={closeForm} />
      </div>}
      <section className="data-surface resource-panel" aria-label={meta.title + ' records'} aria-busy={!current}>
        <div className="resource-toolbar">
          <h2 className="toolbar-title">Records</h2>
          <div className="table-search">
            <FiSearch aria-hidden="true" />
            <input className="form-control" type="search" aria-label="Search records" placeholder="Search records" value={search} onChange={(event) => updateSearch(event.target.value)} />
            {search && <button type="button" className="btn clear-search" aria-label="Clear search" onClick={() => updateSearch('')}><FiX aria-hidden="true" /></button>}
          </div>
        </div>
        {!current && <PageState loading>Loading records…</PageState>}
        {current?.error && <div className="surface-padding">
          <div className="alert alert-danger" role="alert">{current.error}</div>
          <button type="button" className="btn btn-outline-secondary" onClick={reload}>Retry</button>
        </div>}
        {current?.data && <>
          <DataTable label={meta.title + ' table'} columns={columns} rows={rows} onEdit={startEdit} onDelete={remove} canWrite={canWrite} busy={saving} emptyMessage={search ? 'No records match your search.' : 'No records found.'} />
          <footer className="table-footer">
            <span aria-live="polite">{rows.length ? `${(page - 1) * pageSize + 1}–${(page - 1) * pageSize + rows.length} of ${total}` : '0 records'}</span>
            <nav className="table-pagination" aria-label="Table pagination">
              <button type="button" className="btn btn-outline-secondary" aria-label="Previous" disabled={page <= 1} onClick={() => setPage(page - 1)}><FiChevronLeft aria-hidden="true" /><span>Previous</span></button>
              <span>Page {page} of {totalPages}</span>
              <button type="button" className="btn btn-outline-secondary" aria-label="Next" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><span>Next</span><FiChevronRight aria-hidden="true" /></button>
            </nav>
          </footer>
        </>}
      </section>
    </section>
  )
}
