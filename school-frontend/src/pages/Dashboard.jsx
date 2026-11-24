import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiArrowRight, FiBookOpen, FiCalendar, FiCheckCircle, FiClipboard, FiFileText, FiGrid, FiUser, FiUsers, FiXCircle } from 'react-icons/fi'
import StatCard from '../components/StatCard'
import { PageHeading, PageState } from '../components/WorkspaceUI'
import { resourceService } from '../services/resourceService'
import { dashboardService } from '../services/dashboardService'
import { useAuth } from '../context/AuthContext'

const adminResources = [
  ['students', 'Students', FiUsers, 'primary', '/students', 'total_students'],
  ['teachers', 'Teachers', FiUser, 'success', '/teachers', 'total_teachers'],
  ['subjects', 'Subjects', FiBookOpen, 'info', '/subjects', 'total_subjects'],
]
const roleResources = {
  admin: adminResources,
  teacher: [
    ['classes', 'My Classes', FiGrid, 'primary', '/my-classes'],
    ['grades', 'Grades', FiClipboard, 'info', '/grades'],
    ['attendance', 'Attendance', FiCalendar, 'success', '/attendance'],
  ],
  student: [
    ['grades', 'My Grades', FiClipboard, 'primary', '/my-grades'],
    ['attendance', 'My Attendance', FiCalendar, 'success', '/my-attendance'],
  ],
}
const reportLinks = {
  admin: ['/discipline-reports/review', 'Rapports à examiner'],
  teacher: ['/discipline-reports', 'Rapports disciplinaires'],
  student: ['/my-discipline-reports', 'Mes rapports disciplinaires'],
}
const number = new Intl.NumberFormat()

export default function Dashboard() {
  const { user } = useAuth()
  const role = user.role
  const resources = roleResources[role]
  const [snapshot, setSnapshot] = useState(null)
  const [revision, setRevision] = useState(0)
  const current = snapshot?.role === role && snapshot?.revision === revision ? snapshot : null
  const dashboard = current?.dashboard
  const [reportPath, reportLabel] = reportLinks[role]

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      if (role === 'admin') {
        try {
          const dashboard = await dashboardService.getStats()
          if (!controller.signal.aborted) setSnapshot({ role, revision, dashboard })
          return
        } catch {
          if (controller.signal.aborted) return
        }
      }
      const results = await Promise.allSettled(resources.map(([resource]) => resourceService.list(resource, { limit: 1 }, controller.signal)))
      if (!controller.signal.aborted) setSnapshot({ role, revision, results, incomplete: role === 'admin' || results.some((result) => result.status === 'rejected') })
    }

    load()
    return () => controller.abort()
  }, [role, resources, revision])

  return (
    <section className="content-section">
      <PageHeading title="Dashboard" description={user.name ? `Welcome, ${user.name}` : undefined} />
      <Link to={reportPath} className="data-surface report-shortcut">
        <span><FiFileText aria-hidden="true" />{reportLabel}{dashboard && <strong className="status-badge tone-warning">{dashboard.pending_discipline_reports ?? 0}</strong>}</span>
        <FiArrowRight aria-hidden="true" />
      </Link>
      {!current && <PageState loading>Loading dashboard…</PageState>}
      {current?.incomplete && <div className="alert alert-warning mt-3" role="alert">
        Some statistics could not be loaded. <button className="btn btn-outline-secondary btn-sm ms-2" onClick={() => setRevision(revision + 1)}>Retry</button>
      </div>}
      <section className="dashboard-group">
        <h2 className="panel-heading">{role === 'admin' ? 'School overview' : 'Academic records'}</h2>
        <div className="stats-grid">
          {resources.map(([resource, label, icon, tone, to, field], index) => {
            const value = dashboard?.[field] ?? current?.results?.[index]?.value?.total
            return <StatCard key={resource} label={label} value={value == null ? undefined : number.format(value)} icon={icon} tone={tone} to={to} />
          })}
          {dashboard && <StatCard label="Classes" value={number.format(dashboard.total_classes ?? 0)} icon={FiGrid} tone="info" />}
        </div>
      </section>
      {dashboard && (
        <section className="dashboard-group">
          <h2 className="panel-heading">Attendance and performance</h2>
          <div className="stats-grid">
            <StatCard label="Attendance records" value={number.format(dashboard.total_attendance_records ?? 0)} icon={FiCalendar} />
            <StatCard label="Present" value={number.format(dashboard.present_count ?? 0)} icon={FiCheckCircle} tone="success" />
            <StatCard label="Absent" value={number.format(dashboard.absent_count ?? 0)} icon={FiXCircle} tone="danger" />
            <StatCard label="Average grade" value={`${dashboard.average_grade ?? '0.00'}/100`} icon={FiClipboard} tone="info" />
          </div>
        </section>
      )}
    </section>
  )
}
