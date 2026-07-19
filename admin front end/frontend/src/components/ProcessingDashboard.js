"use client"
import { useState, useEffect } from "react"
import axios from "axios"
import Layout from "./Layout"
import HerbCard from "./HerbCard"
import ProcessingModal from "./ProcessingModal"
import "./Dashboard.css"

const ProcessingDashboard = () => {
  const [herbs, setHerbs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedHerb, setSelectedHerb] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api"

  useEffect(() => {
    fetchHerbs()
  }, [])

  const fetchHerbs = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_BASE_URL}/herbs`)
      setHerbs(response.data)
      setError("")
    } catch (err) {
      setError("Failed to fetch herbs")
      console.error("Fetch herbs error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleProcessHerb = (herb) => {
    setSelectedHerb(herb)
    setShowModal(true)
  }

  const handleProcessingComplete = () => {
    setShowModal(false)
    setSelectedHerb(null)
    fetchHerbs() // Refresh the list
  }

  const getHerbsByStage = (stage) => {
    return herbs.filter((herb) => herb.currentStage === stage)
  }

  if (loading) {
    return (
      <Layout title="Processing Unit Dashboard">
        <div className="loading">Loading herbs...</div>
      </Layout>
    )
  }

  return (
    <Layout title="Processing Unit Dashboard">
      <div className="dashboard">
        <div className="dashboard-header">
          <h2>Herb Processing Management</h2>
          <p>Process newly synced herbs and manage ongoing processing tasks</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Newly Synced Herbs */}
        <section className="herbs-section">
          <h3>Newly Synced Herbs ({getHerbsByStage("synced").length})</h3>
          <div className="herbs-grid">
            {getHerbsByStage("synced").map((herb) => (
              <HerbCard
                key={herb._id}
                herb={herb}
                onAction={() => handleProcessHerb(herb)}
                actionLabel="Start Processing"
                actionColor="primary"
              />
            ))}
            {getHerbsByStage("synced").length === 0 && (
              <div className="empty-state">No newly synced herbs available for processing</div>
            )}
          </div>
        </section>

        {/* Currently Processing */}
        <section className="herbs-section">
          <h3>Currently Processing ({getHerbsByStage("processing").length})</h3>
          <div className="herbs-grid">
            {getHerbsByStage("processing").map((herb) => (
              <HerbCard
                key={herb._id}
                herb={herb}
                onAction={() => handleProcessHerb(herb)}
                actionLabel="Update Processing"
                actionColor="secondary"
                showProcessingDetails={true}
              />
            ))}
            {getHerbsByStage("processing").length === 0 && (
              <div className="empty-state">No herbs currently being processed</div>
            )}
          </div>
        </section>

        {/* Processing Modal */}
        {showModal && selectedHerb && (
          <ProcessingModal
            herb={selectedHerb}
            onClose={() => setShowModal(false)}
            onComplete={handleProcessingComplete}
          />
        )}
      </div>
    </Layout>
  )
}

export default ProcessingDashboard
