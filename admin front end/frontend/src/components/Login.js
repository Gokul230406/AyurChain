"use client"

import { useState } from "react"
import { useAuth } from "../contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import "./Login.css"

const Login = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    pin: "",
    role: "processing",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await login(formData)

    if (result.success) {
      navigate("/dashboard")
    } else {
      setError(result.message)
    }

    setLoading(false)
  }

  const rolePins = {
    processing: "121412",
    lab: "141212",
    manufacturing: "141412",
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Ayurvedic Herbs Supply Chain</h1>
          <p>Secure Login Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="role">User Role</label>
            <select name="role" id="role" value={formData.role} onChange={handleChange} required>
              <option value="processing">Processing Unit</option>
              <option value="lab">Lab Unit</option>
              <option value="manufacturing">Manufacturing Unit</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="pin">Security PIN</label>
            <input
              type="password"
              id="pin"
              name="pin"
              value={formData.pin}
              onChange={handleChange}
              placeholder={`Enter ${formData.role} unit PIN`}
              required
            />
            <small className="pin-hint">
              Required PIN for {formData.role} role: {rolePins[formData.role]}
            </small>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="login-footer">
          <p>Default credentials for testing:</p>
          <ul>
            <li>Processing: processor1 / password123</li>
            <li>Lab: lab1 / password123</li>
            <li>Manufacturing: manufacturer1 / password123</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Login
