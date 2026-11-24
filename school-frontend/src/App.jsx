import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import RoleProtectedRoute from './routes/RoleProtectedRoute.jsx'
import AppLayout from './layout/AppLayout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ResourcePage from './pages/ResourcePage.jsx'
import DisciplineReportsPage, { ReviewDisciplineReportsPage, StudentDisciplineReportsPage } from './pages/DisciplineReportsPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route element={<RoleProtectedRoute roles={['admin']} />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/students" element={<ResourcePage resource="students" />} />
              <Route path="/teachers" element={<ResourcePage resource="teachers" />} />
              <Route path="/subjects" element={<ResourcePage resource="subjects" />} />
              <Route path="/discipline-reports/review" element={<ReviewDisciplineReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route element={<RoleProtectedRoute roles={['teacher', 'student']} />}>
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
            <Route element={<RoleProtectedRoute roles={['teacher']} />}>
              <Route path="/teacher" element={<Dashboard />} />
              <Route path="/my-classes" element={<ResourcePage resource="classes" />} />
              <Route path="/grades" element={<ResourcePage resource="grades" />} />
              <Route path="/attendance" element={<ResourcePage resource="attendance" />} />
              <Route path="/discipline-reports" element={<DisciplineReportsPage />} />
            </Route>
            <Route element={<RoleProtectedRoute roles={['student']} />}>
              <Route path="/student" element={<Dashboard />} />
              <Route path="/my-grades" element={<ResourcePage resource="grades" />} />
              <Route path="/my-attendance" element={<ResourcePage resource="attendance" />} />
              <Route path="/my-discipline-reports" element={<StudentDisciplineReportsPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
