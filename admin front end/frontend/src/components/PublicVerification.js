"use client"
import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import axios from "axios"
import "./PublicVerification.css"

const PublicVerification = () => {
  const [searchParams] = useSearchParams()
  const [herbData, setHerbData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const qrCodeId = searchParams.get("id")
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api"

  useEffect(() => {
    if (qrCodeId) {
      fetchHerbData()
    } else {
      setError("No QR code ID provided")
      setLoading(false)
    }
  }, [qrCodeId])

  const fetchHerbData = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_BASE_URL}/public/herb/${qrCodeId}`)
      setHerbData(response.data)
      setError("")
    } catch (err) {
      if (err.response?.status === 404) {
        setError("Product not found. Please check your QR code.")
      } else {
        setError("Failed to load product information. Please try again.")
      }
      console.error("Fetch herb data error:", err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getStageIcon = (stage) => {
    const icons = {
      collection: "🌱",
      processing: "🏭",
      testing: "🔬",
      manufacturing: "📦",
    }
    return icons[stage] || "✅"
  }

  if (loading) {
    return (
      <div className="verification-page">
        <div className="verification-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <h2>Verifying Product...</h2>
            <p>Please wait while we fetch your product information</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="verification-page">
        <div className="verification-container">
          <div className="error-state">
            <div className="error-icon">❌</div>
            <h2>Verification Failed</h2>
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="retry-button">
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!herbData) {
    return (
      <div className="verification-page">
        <div className="verification-container">
          <div className="error-state">
            <div className="error-icon">❓</div>
            <h2>Product Not Found</h2>
            <p>The QR code you scanned does not match any product in our system.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="verification-page">
      <div className="verification-container">
        {/* Header */}
        <div className="verification-header">
          <div className="verified-badge">
            <span className="verified-icon">✅</span>
            <span className="verified-text">VERIFIED AUTHENTIC</span>
          </div>
          <h1>{herbData.name}</h1>
          <p className="product-subtitle">Ayurvedic Herb - Complete Traceability</p>
        </div>

        {/* Product Image */}
        {herbData.photo && (
          <div className="product-image-section">
            <img src={herbData.photo || "/placeholder.svg"} alt={herbData.name} className="product-image" />
          </div>
        )}

        {/* Journey Timeline */}
        <div className="journey-timeline">
          <h2>Product Journey</h2>
          <div className="timeline">
            {/* Collection Stage */}
            <div className="timeline-item">
              <div className="timeline-icon">{getStageIcon("collection")}</div>
              <div className="timeline-content">
                <h3>Collection</h3>
                <div className="timeline-details">
                  <p>
                    <strong>Farmer:</strong> {herbData.farmerName}
                  </p>
                  <p>
                    <strong>Location:</strong> {herbData.pointOfCollection}
                  </p>
                  <p>
                    <strong>Date:</strong> {formatDate(herbData.collectionDate)}
                  </p>
                  <p>
                    <strong>Initial Weight:</strong> {herbData.initialWeight} kg
                  </p>
                </div>
              </div>
            </div>

            {/* Processing Stage */}
            {herbData.processing && (
              <div className="timeline-item">
                <div className="timeline-icon">{getStageIcon("processing")}</div>
                <div className="timeline-content">
                  <h3>Processing</h3>
                  <div className="timeline-details">
                    <p>
                      <strong>Method:</strong> {herbData.processing.dryingMethod}
                    </p>
                    <p>
                      <strong>Duration:</strong> {herbData.processing.dryingDuration}
                    </p>
                    <p>
                      <strong>Processed Date:</strong> {formatDate(herbData.processing.processedDate)}
                    </p>
                    <p>
                      <strong>Final Weight:</strong> {herbData.processing.finalWeight} kg
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Lab Testing Stage */}
            {herbData.labTesting && (
              <div className="timeline-item">
                <div className="timeline-icon">{getStageIcon("testing")}</div>
                <div className="timeline-content">
                  <h3>Quality Testing</h3>
                  <div className="timeline-details">
                    <p>
                      <strong>Test Date:</strong> {formatDate(herbData.labTesting.testDate)}
                    </p>
                    <p>
                      <strong>Result:</strong>{" "}
                      <span className={`test-result ${herbData.labTesting.overallResult}`}>
                        {herbData.labTesting.overallResult?.toUpperCase()}
                      </span>
                    </p>
                    {herbData.labTesting.testParameters && herbData.labTesting.testParameters.length > 0 && (
                      <div className="test-parameters">
                        <strong>Test Parameters:</strong>
                        <div className="parameters-grid">
                          {herbData.labTesting.testParameters.map((param, index) => (
                            <div key={index} className="parameter-item">
                              <span className="parameter-name">{param.parameter}:</span>
                              <span className="parameter-value">
                                {param.value} {param.unit}
                              </span>
                              <span className={`parameter-status ${param.status}`}>
                                {param.status === "pass" ? "✅" : "❌"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {herbData.labTesting.certificateUrl && (
                      <p>
                        <strong>Certificate:</strong>{" "}
                        <a
                          href={herbData.labTesting.certificateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="certificate-link"
                        >
                          View Lab Certificate
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Manufacturing Stage */}
            {herbData.manufacturing && (
              <div className="timeline-item">
                <div className="timeline-icon">{getStageIcon("manufacturing")}</div>
                <div className="timeline-content">
                  <h3>Manufacturing</h3>
                  <div className="timeline-details">
                    <p>
                      <strong>Batch Number:</strong> {herbData.manufacturing.batchNumber}
                    </p>
                    <p>
                      <strong>Manufacturing Date:</strong> {formatDate(herbData.manufacturing.manufacturingDate)}
                    </p>
                    <p>
                      <strong>Final Product Weight:</strong> {herbData.manufacturing.finalProductWeight} kg
                    </p>
                    <p>
                      <strong>Packaging:</strong> {herbData.manufacturing.packagingType}
                    </p>
                    {herbData.manufacturing.expiryDate && (
                      <p>
                        <strong>Expiry Date:</strong> {formatDate(herbData.manufacturing.expiryDate)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="trust-section">
          <h2>Why Trust This Product?</h2>
          <div className="trust-indicators">
            <div className="trust-item">
              <div className="trust-icon">🌿</div>
              <h4>Authentic Source</h4>
              <p>Directly sourced from verified farmers with complete location tracking</p>
            </div>
            <div className="trust-item">
              <div className="trust-icon">🔬</div>
              <h4>Lab Tested</h4>
              <p>Rigorous quality testing for purity, safety, and potency</p>
            </div>
            <div className="trust-item">
              <div className="trust-icon">📋</div>
              <h4>Full Traceability</h4>
              <p>Complete journey from farm to package with blockchain-backed verification</p>
            </div>
            <div className="trust-item">
              <div className="trust-icon">✅</div>
              <h4>Quality Assured</h4>
              <p>Processed using traditional methods with modern quality standards</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="verification-footer">
          <p>
            This product has been verified through our secure supply chain management system. For any questions or
            concerns, please contact our customer support.
          </p>
          <div className="footer-links">
            <a href="#" className="footer-link">
              Report Issue
            </a>
            <a href="#" className="footer-link">
              Learn More
            </a>
            <a href="#" className="footer-link">
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PublicVerification
