"use client"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import Login from "./components/Login"
import ProcessingDashboard from "./components/ProcessingDashboard"
import LabDashboard from "./components/LabDashboard"
import ManufacturingDashboard from "./components/ManufacturingDashboard"
import PublicVerification from "./components/PublicVerification"
import "./App.css"

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <div className="error">Access denied</div>
  }

  return children
}

// Dashboard Router Component
const DashboardRouter = () => {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" />

  switch (user.role) {
    case "processing":
      return <ProcessingDashboard />
    case "lab":
      return <LabDashboard />
    case "manufacturing":
      return <ManufacturingDashboard />
    default:
      return <Navigate to="/login" />
  }
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/verify" element={<PublicVerification />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardRouter />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
