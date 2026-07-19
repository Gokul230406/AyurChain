"use client"
import { useState, useEffect } from "react"
import axios from "axios"
import Layout from "./Layout"
import LabTestingModal from "./LabTestingModal"
import "./Dashboard.css"

const LabDashboard = () => {
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

  const handleTestHerb = (herb) => {
    setSelectedHerb(herb)
    setShowModal(true)
  }

  const handleTestingComplete = () => {
    setShowModal(false)
    setSelectedHerb(null)
    fetchHerbs() // Refresh the list
  }

  const getHerbsByStage = (stage) => {
    return herbs.filter((herb) => herb.currentStage === stage)
  }

  const getProcessedHerbs = () => {
    return herbs.filter((herb) => herb.currentStage === "processing" && herb.processing?.status === "completed")
  }

  if (loading) {
    return (
      <Layout title="Lab Unit Dashboard">
        <div className="loading">Loading herbs...</div>
      </Layout>
    )
  }

  return (
    <Layout title="Lab Unit Dashboard">
      <div className="dashboard">
        <div className="dashboard-header">
          <h2>Laboratory Testing Management</h2>
          <p>Test processed herbs and manage quality control results</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Ready for Testing */}
        <section className="herbs-section">
          <h3>Ready for Testing ({getProcessedHerbs().length})</h3>
          <div className="herbs-grid">
            {getProcessedHerbs().map((herb) => (
              <LabHerbCard
                key={herb._id}
                herb={herb}
                onAction={() => handleTestHerb(herb)}
                actionLabel="Start Testing"
                actionColor="primary"
              />
            ))}
            {getProcessedHerbs().length === 0 && (
              <div className="empty-state">No processed herbs available for testing</div>
            )}
          </div>
        </section>

        {/* Currently Testing */}
        <section className="herbs-section">
          <h3>Currently Testing ({getHerbsByStage("lab-testing").length})</h3>
          <div className="herbs-grid">
            {getHerbsByStage("lab-testing").map((herb) => (
              <LabHerbCard
                key={herb._id}
                herb={herb}
                onAction={() => handleTestHerb(herb)}
                actionLabel="Update Results"
                actionColor="secondary"
                showTestResults={true}
              />
            ))}
            {getHerbsByStage("lab-testing").length === 0 && (
              <div className="empty-state">No herbs currently being tested</div>
            )}
          </div>
        </section>

        {/* Lab Testing Modal */}
        {showModal && selectedHerb && (
          <LabTestingModal herb={selectedHerb} onClose={() => setShowModal(false)} onComplete={handleTestingComplete} />
        )}
      </div>
    </Layout>
  )
}

// Lab-specific herb card component
const LabHerbCard = ({ herb, onAction, actionLabel, actionColor = "primary", showTestResults = false }) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStageColor = (stage) => {
    const colors = {
      synced: "#3182ce",
      processing: "#d69e2e",
      "lab-testing": "#805ad5",
      manufacturing: "#38a169",
      completed: "#2f855a",
    }
    return colors[stage] || "#718096"
  }

  const getResultColor = (result) => {
    const colors = {
      pending: "#d69e2e",
      approved: "#38a169",
      rejected: "#e53e3e",
    }
    return colors[result] || "#718096"
  }

  return (
    <div className="herb-card">
      <div className="herb-card-header">
        <h4>{herb.name}</h4>
        <span className="stage-badge" style={{ backgroundColor: getStageColor(herb.currentStage) }}>
          {herb.currentStage.replace("-", " ").toUpperCase()}
        </span>
      </div>

      <div className="herb-card-content">
        <div className="herb-info">
          <p>
            <strong>Farmer:</strong> {herb.farmerName}
          </p>
          <p>
            <strong>Collection Point:</strong> {herb.pointOfCollection}
          </p>
          <p>
            <strong>Collection Date:</strong> {formatDate(herb.collectionDate)}
          </p>
          <p>
            <strong>Initial Weight:</strong> {herb.initialWeight} kg
          </p>
        </div>

        {/* Processing Summary */}
        {herb.processing && herb.processing.status === "completed" && (
          <div className="processing-summary">
            <h5>Processing Summary:</h5>
            <p>
              <strong>Method:</strong> {herb.processing.dryingMethod}
            </p>
            <p>
              <strong>Final Weight:</strong> {herb.processing.finalWeight} kg
            </p>
            <p>
              <strong>Processed:</strong> {formatDate(herb.processing.processedDate)}
            </p>
          </div>
        )}

        {/* Lab Test Results */}
        {showTestResults && herb.labTesting && (
          <div className="test-results">
            <h5>Test Results:</h5>
            <div className="result-status">
              <span className="result-badge" style={{ backgroundColor: getResultColor(herb.labTesting.overallResult) }}>
                {herb.labTesting.overallResult?.toUpperCase() || "PENDING"}
              </span>
            </div>
            {herb.labTesting.testParameters && herb.labTesting.testParameters.length > 0 && (
              <div className="test-parameters">
                <p>
                  <strong>Tests Conducted:</strong> {herb.labTesting.testParameters.length}
                </p>
                <p>
                  <strong>Test Date:</strong> {formatDate(herb.labTesting.testDate)}
                </p>
              </div>
            )}
            {herb.labTesting.certificateUrl && (
              <p>
                <strong>Certificate:</strong>{" "}
                <a href={herb.labTesting.certificateUrl} target="_blank" rel="noopener noreferrer">
                  View Certificate
                </a>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="herb-card-footer">
        <button className={`button button-${actionColor}`} onClick={onAction}>
          {actionLabel}
        </button>
      </div>
    </div>
  )
}

export default LabDashboard
