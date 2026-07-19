"use client"
import { useState } from "react"
import axios from "axios"
import "./Modal.css"

const ProcessingModal = ({ herb, onClose, onComplete }) => {
  const [formData, setFormData] = useState({
    dryingMethod: herb.processing?.dryingMethod || "",
    dryingDuration: herb.processing?.dryingDuration || "",
    cleaningSteps: herb.processing?.cleaningSteps?.join(", ") || "",
    finalWeight: herb.processing?.finalWeight || "",
    notes: herb.processing?.notes || "",
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const submitData = {
        ...formData,
        cleaningSteps: formData.cleaningSteps.split(",").map((step) => step.trim()),
        finalWeight: Number.parseFloat(formData.finalWeight),
      }

      await axios.put(`${API_BASE_URL}/herbs/processing/${herb._id}`, submitData)
      onComplete()
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update processing data")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Processing Details - {herb.name}</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="herb-summary">
            <h4>Herb Information</h4>
            <p>
              <strong>Farmer:</strong> {herb.farmerName}
            </p>
            <p>
              <strong>Collection Point:</strong> {herb.pointOfCollection}
            </p>
            <p>
              <strong>Initial Weight:</strong> {herb.initialWeight} kg
            </p>
          </div>

          <form onSubmit={handleSubmit} className="processing-form">
            <div className="form-group">
              <label htmlFor="dryingMethod">Drying Method</label>
              <select
                name="dryingMethod"
                id="dryingMethod"
                value={formData.dryingMethod}
                onChange={handleChange}
                required
              >
                <option value="">Select drying method</option>
                <option value="sun-drying">Sun Drying</option>
                <option value="shade-drying">Shade Drying</option>
                <option value="oven-drying">Oven Drying</option>
                <option value="freeze-drying">Freeze Drying</option>
                <option value="air-drying">Air Drying</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="dryingDuration">Drying Duration</label>
              <input
                type="text"
                id="dryingDuration"
                name="dryingDuration"
                value={formData.dryingDuration}
                onChange={handleChange}
                placeholder="e.g., 3-5 days, 24 hours"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="cleaningSteps">Cleaning Steps (comma-separated)</label>
              <textarea
                id="cleaningSteps"
                name="cleaningSteps"
                value={formData.cleaningSteps}
                onChange={handleChange}
                placeholder="e.g., Washing, Sorting, Removing impurities, Final inspection"
                rows="3"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="finalWeight">Final Weight (kg)</label>
              <input
                type="number"
                id="finalWeight"
                name="finalWeight"
                value={formData.finalWeight}
                onChange={handleChange}
                step="0.01"
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="notes">Processing Notes (optional)</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any additional notes about the processing..."
                rows="3"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="modal-footer">
              <button type="button" className="button button-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="button button-success" disabled={loading}>
                {loading ? "Saving..." : "Complete Processing"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ProcessingModal
