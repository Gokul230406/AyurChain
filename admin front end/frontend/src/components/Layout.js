"use client"
import { useAuth } from "../contexts/AuthContext"
import "./Layout.css"

const Layout = ({ children, title }) => {
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    window.location.href = "/login"
  }

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Ayurvedic Herbs Supply Chain</h1>
            <span className="user-role">{title}</span>
          </div>
          <div className="header-right">
            <span className="user-info">
              Welcome, {user?.name} ({user?.role})
            </span>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="layout-main">{children}</main>
    </div>
  )
}

export default Layout
