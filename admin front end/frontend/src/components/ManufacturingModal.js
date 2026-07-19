"use client"
import { useState } from "react"
import axios from "axios"
import "./Modal.css"

const ManufacturingModal = ({ herb, onClose, onComplete }) => {
  const [formData, setFormData] = useState({
    batchNumber: herb.manufacturing?.batchNumber || "",
    finalProductWeight: herb.manufacturing?.finalProductWeight || "",
    packagingType: herb.manufacturing?.packagingType || "",
    expiryDate: herb.manufacturing?.expiryDate
      ? new Date(herb.manufacturing.expiryDate).toISOString().split("T")[0]
      : "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api"

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const generateBatchNumber = () => {
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const day = date.getDate().toString().padStart(2, "0")
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")
    const batchNumber = `AH${year}${month}${day}${random}`
    setFormData({ ...formData, batchNumber })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const submitData = {
        ...formData,
        finalProductWeight: Number.parseFloat(formData.finalProductWeight),
      }

      const response = await axios.post(`${API_BASE_URL}/herbs/manufacture/${herb._id}`, submitData)

      // Pass QR code data to parent
      onComplete({
        qrCodeId: response.data.herb.manufacturing.qrCodeId,
        qrCodeUrl: response.data.qrCodeUrl,
        herb: response.data.herb,
      })
    } catch (err) {
      setError(err.response?.data?.message || "Failed to complete manufacturing")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content manufacturing-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Manufacturing Details - {herb.name}</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="herb-summary">
            <h4>Herb Journey Summary</h4>
            <div className="journey-steps">
              <div className="journey-step">
                <strong>Collection:</strong> {herb.farmerName} - {herb.pointOfCollection}
              </div>
              <div className="journey-step">
                <strong>Processing:</strong> {herb.processing?.dryingMethod} - {herb.processing?.finalWeight} kg
              </div>
              <div className="journey-step">
                <strong>Lab Testing:</strong>{" "}
                <span className={`status-${herb.labTesting?.overallResult}`}>
                  {herb.labTesting?.overallResult?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="manufacturing-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="batchNumber">Batch Number</label>
                <div className="input-with-button">
                  <input
                    type="text"
                    id="batchNumber"
                    name="batchNumber"
                    value={formData.batchNumber}
                    onChange={handleChange}
                    placeholder="e.g., AH24010001"
                    required
                  />
                  <button type="button" className="generate-batch" onClick={generateBatchNumber}>
                    Generate
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="finalProductWeight">Final Product Weight (kg)</label>
                <input
                  type="number"
                  id="finalProductWeight"
                  name="finalProductWeight"
                  value={formData.finalProductWeight}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="packagingType">Packaging Type</label>
                <select name="packagingType" id="packagingType" value={formData.packagingType} onChange={handleChange}>
                  <option value="">Select packaging type</option>
                  <option value="glass-bottle">Glass Bottle</option>
                  <option value="plastic-container">Plastic Container</option>
                  <option value="paper-pouch">Paper Pouch</option>
                  <option value="aluminum-foil">Aluminum Foil Pack</option>
                  <option value="vacuum-sealed">Vacuum Sealed</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="expiryDate">Expiry Date</label>
                <input
                  type="date"
                  id="expiryDate"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleChange}
                  min={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="manufacturing-info">
              <h4>What happens next?</h4>
              <ul>
                <li>A unique QR code will be generated for this product</li>
                <li>The QR code will link to the complete herb journey</li>
                <li>Consumers can scan to verify authenticity and traceability</li>
                <li>The product will be marked as completed in the system</li>
              </ul>
            </div>

            <div className="modal-footer">
              <button type="button" className="button button-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="button button-success" disabled={loading}>
                {loading ? "Generating QR Code..." : "Complete Manufacturing & Generate QR"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ManufacturingModal
