import { useEffect, useMemo, useState } from 'react'
import StatCard from '../components/StatCard'
import { resourceService } from '../services/resourceService'
import { dashboardService } from '../services/dashboardService'
import { useAuth } from '../context/AuthContext'

const roleStats = {
  admin: [
    ['students', 'Students', 'primary'],
    ['teachers', 'Teachers', 'success'],
    ['subjects', 'Subjects', 'warning'],
    ['payments', 'Payments', 'info'],
  ],
  teacher: [
    ['classes', 'My Classes', 'primary'],
    ['grades', 'Grades', 'success'],
    ['attendance', 'Attendance', 'warning'],
  ],
  student: [
    ['grades', 'My Grades', 'primary'],
    ['attendance', 'My Attendance', 'success'],
  ],
}

export default function Dashboard() {
  const { user } = useAuth()
  const statResources = useMemo(() => roleStats[user?.role] || [], [user?.role])
  const [stats, setStats] = useState({})
  const [dashboardStats, setDashboardStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user?.role === 'admin') {
      // Load comprehensive statistics for admin dashboard
      setLoading(true)
      setError(null)
      dashboardService
        .getStats()
        .then((data) => {
          setDashboardStats(data)
          // Also populate basic stats from the dashboard data
          const basicStats = {
            students: data.total_students,
            teachers: data.total_teachers,
            subjects: data.total_subjects,
            payments: data.total_payments,
          }
          setStats(basicStats)
        })
        .catch((err) => {
          console.error('Failed to load dashboard stats:', err)
          setError('Failed to load dashboard statistics')
          // Fallback to resource counts
          Promise.all(statResources.map(([resource]) => resourceService.list(resource, { limit: 1 })))
            .then((results) => {
              const nextStats = {}
              statResources.forEach(([resource], index) => {
                nextStats[resource] = results[index].total
              })
              setStats(nextStats)
            })
            .catch(() => {})
        })
        .finally(() => setLoading(false))
    } else {
      // Load resource counts for non-admin users
      Promise.all(statResources.map(([resource]) => resourceService.list(resource, { limit: 1 })))
        .then((results) => {
          const nextStats = {}
          statResources.forEach(([resource], index) => {
            nextStats[resource] = results[index].total
          })
          setStats(nextStats)
        })
        .catch(() => {})
    }
  }, [user?.role, statResources])

  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <p className="text-uppercase text-muted small mb-1">{user?.role} dashboard</p>
          <h2>Overview</h2>
        </div>
      </div>

      {/* Admin Dashboard Statistics */}
      {user?.role === 'admin' && dashboardStats && (
        <>
          <div className="mt-4">
            <h3 className="h5 mb-3">Organization Overview</h3>
            <div className="stats-grid">
              <StatCard label="Total Students" value={dashboardStats.total_students ?? 0} tone="primary" />
              <StatCard label="Total Teachers" value={dashboardStats.total_teachers ?? 0} tone="success" />
              <StatCard label="Total Subjects" value={dashboardStats.total_subjects ?? 0} tone="warning" />
              <StatCard label="Total Classes" value={dashboardStats.total_classes ?? 0} tone="info" />
            </div>
          </div>

          <div className="mt-4">
            <h3 className="h5 mb-3">Payments Overview</h3>
            <div className="stats-grid">
              <StatCard label="Total Payments" value={dashboardStats.total_payments ?? 0} tone="primary" />
              <StatCard label="Paid Amount" value={`$${dashboardStats.paid_amount ?? '0.00'}`} tone="success" />
              <StatCard label="Pending Amount" value={`$${dashboardStats.pending_amount ?? '0.00'}`} tone="warning" />
            </div>
          </div>

          <div className="mt-4">
            <h3 className="h5 mb-3">Attendance & Academic Performance</h3>
            <div className="stats-grid">
              <StatCard label="Total Attendance Records" value={dashboardStats.total_attendance_records ?? 0} tone="primary" />
              <StatCard label="Present" value={dashboardStats.present_count ?? 0} tone="success" />
              <StatCard label="Absent" value={dashboardStats.absent_count ?? 0} tone="danger" />
              <StatCard label="Average Grade" value={`${dashboardStats.average_grade ?? '0.00'}/100`} tone="info" />
            </div>
          </div>

          {error && (
            <div className="alert alert-warning mt-4" role="alert">
              {error}
            </div>
          )}
        </>
      )}

      {/* Non-Admin Quick Stats */}
      {user?.role !== 'admin' && (
        <div className="stats-grid">
          {statResources.map(([resource, label, tone]) => (
            <StatCard key={resource} label={label} value={stats[resource] ?? 0} tone={tone} />
          ))}
        </div>
      )}

      <div className="data-surface mt-4 p-4">
        <h3 className="h5">Today</h3>
        <p className="text-muted mb-0">Use the navigation to open the records available for your role.</p>
      </div>
    </section>
  )
}
