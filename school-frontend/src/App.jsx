import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import AppLayout from './layout/AppLayout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ResourcePage from './pages/ResourcePage.jsx'
import './App.css'

function App() {
  const resources = ['students', 'teachers', 'subjects', 'classes', 'grades', 'attendance', 'payments']

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            {resources.map((name) => (
              <Route key={name} path={`/${name}`} element={<ResourcePage resource={name} />} />
            ))}
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
