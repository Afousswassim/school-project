import { useEffect, useState } from 'react'
import StatCard from '../components/StatCard'
import { resourceService } from '../services/resourceService'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ students: 0, teachers: 0, subjects: 0, payments: 0 })

  useEffect(() => {
    Promise.all(['students', 'teachers', 'subjects', 'payments'].map((resource) => resourceService.list(resource, { limit: 1 })))
      .then(([students, teachers, subjects, payments]) => setStats({
        students: students.total,
        teachers: teachers.total,
        subjects: subjects.total,
        payments: payments.total,
      }))
      .catch(() => {})
  }, [])

  return (
    <section className="content-section">
      <div className="section-heading">
        <div>
          <p className="text-uppercase text-muted small mb-1">{user?.role} dashboard</p>
          <h2>Overview</h2>
        </div>
      </div>
      <div className="stats-grid">
        <StatCard label="Students" value={stats.students} tone="primary" />
        <StatCard label="Teachers" value={stats.teachers} tone="success" />
        <StatCard label="Subjects" value={stats.subjects} tone="warning" />
        <StatCard label="Payments" value={stats.payments} tone="info" />
      </div>
      <div className="data-surface mt-4 p-4">
        <h3 className="h5">Today</h3>
        <p className="text-muted mb-0">Use the navigation to manage records. Teachers can manage grades and attendance; admins can manage the full school setup.</p>
      </div>
    </section>
  )
}
