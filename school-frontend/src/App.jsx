import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import RoleProtectedRoute from './routes/RoleProtectedRoute.jsx'
import AppLayout from './layout/AppLayout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ResourcePage from './pages/ResourcePage.jsx'
import SimplePage from './pages/SimplePage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
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
              <Route path="/payments" element={<ResourcePage resource="payments" />} />
              <Route path="/reports" element={<SimplePage title="Reports" eyebrow="Admin">Reports are restricted to administrators.</SimplePage>} />
              <Route path="/settings" element={<SimplePage title="Settings" eyebrow="Admin">Settings are restricted to administrators.</SimplePage>} />
            </Route>
            <Route element={<RoleProtectedRoute roles={['teacher', 'student']} />}>
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
            <Route element={<RoleProtectedRoute roles={['teacher']} />}>
              <Route path="/teacher" element={<Dashboard />} />
              <Route path="/my-classes" element={<ResourcePage resource="classes" />} />
              <Route path="/grades" element={<ResourcePage resource="grades" />} />
              <Route path="/attendance" element={<ResourcePage resource="attendance" />} />
            </Route>
            <Route element={<RoleProtectedRoute roles={['student']} />}>
              <Route path="/student" element={<Dashboard />} />
              <Route path="/my-grades" element={<ResourcePage resource="grades" />} />
              <Route path="/my-attendance" element={<ResourcePage resource="attendance" />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
