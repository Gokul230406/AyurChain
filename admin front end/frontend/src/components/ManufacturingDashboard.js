"use client"
import { useState, useEffect } from "react"
import axios from "axios"
import Layout from "./Layout"
import ManufacturingModal from "./ManufacturingModal"
import QRCodeDisplay from "./QRCodeDisplay"
import "./Dashboard.css"

const ManufacturingDashboard = () => {
  const [herbs, setHerbs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedHerb, setSelectedHerb] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showQRCode, setShowQRCode] = useState(false)
  const [qrCodeData, setQrCodeData] = useState(null)

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

  const handleManufactureHerb = (herb) => {
    setSelectedHerb(herb)
    setShowModal(true)
  }

  const handleManufacturingComplete = (qrData) => {
    setShowModal(false)
    setSelectedHerb(null)
    setQrCodeData(qrData)
    setShowQRCode(true)
    fetchHerbs() // Refresh the list
  }

  const handleViewQRCode = (herb) => {
    if (herb.manufacturing?.qrCodeId) {
      const qrData = {
        qrCodeId: herb.manufacturing.qrCodeId,
        qrCodeUrl: `${window.location.origin}/verify?id=${herb.manufacturing.qrCodeId}`,
        herb: herb,
      }
      setQrCodeData(qrData)
      setShowQRCode(true)
    }
  }

  const getHerbsByStage = (stage) => {
    return herbs.filter((herb) => herb.currentStage === stage)
  }

  const getApprovedHerbs = () => {
    return herbs.filter((herb) => herb.currentStage === "lab-testing" && herb.labTesting?.overallResult === "approved")
  }

  const getCompletedHerbs = () => {
    return herbs.filter((herb) => herb.currentStage === "completed")
  }

  if (loading) {
    return (
      <Layout title="Manufacturing Unit Dashboard">
        <div className="loading">Loading herbs...</div>
      </Layout>
    )
  }

  return (
    <Layout title="Manufacturing Unit Dashboard">
      <div className="dashboard">
        <div className="dashboard-header">
          <h2>Manufacturing & QR Code Generation</h2>
          <p>Finalize approved herbs and generate QR codes for consumer verification</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Ready for Manufacturing */}
        <section className="herbs-section">
          <h3>Ready for Manufacturing ({getApprovedHerbs().length})</h3>
          <div className="herbs-grid">
            {getApprovedHerbs().map((herb) => (
              <ManufacturingHerbCard
                key={herb._id}
                herb={herb}
                onAction={() => handleManufactureHerb(herb)}
                actionLabel="Start Manufacturing"
                actionColor="primary"
              />
            ))}
            {getApprovedHerbs().length === 0 && (
              <div className="empty-state">No approved herbs available for manufacturing</div>
            )}
          </div>
        </section>

        {/* Currently Manufacturing */}
        <section className="herbs-section">
          <h3>Currently Manufacturing ({getHerbsByStage("manufacturing").length})</h3>
          <div className="herbs-grid">
            {getHerbsByStage("manufacturing").map((herb) => (
              <ManufacturingHerbCard
                key={herb._id}
                herb={herb}
                onAction={() => handleManufactureHerb(herb)}
                actionLabel="Update Manufacturing"
                actionColor="secondary"
                showManufacturingDetails={true}
              />
            ))}
            {getHerbsByStage("manufacturing").length === 0 && (
              <div className="empty-state">No herbs currently being manufactured</div>
            )}
          </div>
        </section>

        {/* Completed Products */}
        <section className="herbs-section">
          <h3>Completed Products ({getCompletedHerbs().length})</h3>
          <div className="herbs-grid">
            {getCompletedHerbs().map((herb) => (
              <ManufacturingHerbCard
                key={herb._id}
                herb={herb}
                onAction={() => handleViewQRCode(herb)}
                actionLabel="View QR Code"
                actionColor="success"
                showManufacturingDetails={true}
                isCompleted={true}
              />
            ))}
            {getCompletedHerbs().length === 0 && <div className="empty-state">No completed products yet</div>}
          </div>
        </section>

        {/* Manufacturing Modal */}
        {showModal && selectedHerb && (
          <ManufacturingModal
            herb={selectedHerb}
            onClose={() => setShowModal(false)}
            onComplete={handleManufacturingComplete}
          />
        )}

        {/* QR Code Display Modal */}
        {showQRCode && qrCodeData && <QRCodeDisplay qrData={qrCodeData} onClose={() => setShowQRCode(false)} />}
      </div>
    </Layout>
  )
}

// Manufacturing-specific herb card component
const ManufacturingHerbCard = ({
  herb,
  onAction,
  actionLabel,
  actionColor = "primary",
  showManufacturingDetails = false,
  isCompleted = false,
}) => {
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
          </div>
        )}

        {/* Lab Test Results */}
        {herb.labTesting && (
          <div className="test-results">
            <h5>Lab Results:</h5>
            <div className="result-status">
              <span className="result-badge" style={{ backgroundColor: getResultColor(herb.labTesting.overallResult) }}>
                {herb.labTesting.overallResult?.toUpperCase() || "PENDING"}
              </span>
            </div>
            {herb.labTesting.testParameters && (
              <p>
                <strong>Tests:</strong> {herb.labTesting.testParameters.length} parameters tested
              </p>
            )}
            {herb.labTesting.certificateUrl && (
              <p>
                <strong>Certificate:</strong>{" "}
                <a href={herb.labTesting.certificateUrl} target="_blank" rel="noopener noreferrer">
                  View
                </a>
              </p>
            )}
          </div>
        )}

        {/* Manufacturing Details */}
        {showManufacturingDetails && herb.manufacturing && herb.manufacturing.status === "completed" && (
          <div className="manufacturing-details">
            <h5>Manufacturing Details:</h5>
            <p>
              <strong>Batch:</strong> {herb.manufacturing.batchNumber}
            </p>
            <p>
              <strong>Final Product Weight:</strong> {herb.manufacturing.finalProductWeight} kg
            </p>
            <p>
              <strong>Packaging:</strong> {herb.manufacturing.packagingType}
            </p>
            <p>
              <strong>Manufacturing Date:</strong> {formatDate(herb.manufacturing.manufacturingDate)}
            </p>
            {isCompleted && (
              <p>
                <strong>QR Code ID:</strong> {herb.manufacturing.qrCodeId}
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

export default ManufacturingDashboard
