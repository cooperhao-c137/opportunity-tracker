import { Routes, Route, Navigate } from 'react-router'
import AuthLayout from '@/components/AuthLayout'
import Login from '@/pages/Login'
import NotFound from '@/pages/NotFound'
import Dashboard from '@/pages/Dashboard'
import Opportunities from '@/pages/Opportunities'
import Projects from '@/pages/Projects'
import ProjectDetail from '@/pages/ProjectDetail'
import Payments from '@/pages/Payments'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <AuthLayout>
            <Dashboard />
          </AuthLayout>
        }
      />
      <Route
        path="/opportunities"
        element={
          <AuthLayout>
            <Opportunities />
          </AuthLayout>
        }
      />
      <Route
        path="/projects"
        element={
          <AuthLayout>
            <Projects />
          </AuthLayout>
        }
      />
      <Route
        path="/projects/:id"
        element={
          <AuthLayout>
            <ProjectDetail />
          </AuthLayout>
        }
      />
      <Route
        path="/payments"
        element={
          <AuthLayout>
            <Payments />
          </AuthLayout>
        }
      />
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
