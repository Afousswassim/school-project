import { useEffect, useMemo, useState } from 'react'
import StatCard from '../components/StatCard'
import { resourceService } from '../services/resourceService'
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

  useEffect(() => {
    Promise.all(statResources.map(([resource]) => resourceService.list(resource, { limit: 1 })))
      .then((results) => {
        const nextStats = {}
        statResources.forEach(([resource], index) => {
          nextStats[resource] = results[index].total
        })
        setStats(nextStats)
      })
      .catch(() => {})
  }, [statResources])

  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <p className="text-uppercase text-muted small mb-1">{user?.role} dashboard</p>
          <h2>Overview</h2>
        </div>
      </div>
      <div className="stats-grid">
        {statResources.map(([resource, label, tone]) => (
          <StatCard key={resource} label={label} value={stats[resource] ?? 0} tone={tone} />
        ))}
      </div>
      <div className="data-surface mt-4 p-4">
        <h3 className="h5">Today</h3>
        <p className="text-muted mb-0">Use the navigation to open the records available for your role.</p>
      </div>
    </section>
  )
}
