"use client"
import { useState } from "react"
import axios from "axios"
import "./Modal.css"

const LabTestingModal = ({ herb, onClose, onComplete }) => {
  const [formData, setFormData] = useState({
    overallResult: herb.labTesting?.overallResult || "pending",
    notes: herb.labTesting?.notes || "",
  })
  const [testParameters, setTestParameters] = useState(
    herb.labTesting?.testParameters || [
      { parameter: "Moisture Content", value: "", unit: "%", status: "pass" },
      { parameter: "Heavy Metals", value: "", unit: "ppm", status: "pass" },
      { parameter: "Microbial Count", value: "", unit: "CFU/g", status: "pass" },
      { parameter: "Pesticide Residue", value: "", unit: "ppm", status: "pass" },
    ],
  )
  const [certificate, setCertificate] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api"

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleParameterChange = (index, field, value) => {
    const updatedParameters = [...testParameters]
    updatedParameters[index][field] = value
    setTestParameters(updatedParameters)
  }

  const addTestParameter = () => {
    setTestParameters([...testParameters, { parameter: "", value: "", unit: "", status: "pass" }])
  }

  const removeTestParameter = (index) => {
    setTestParameters(testParameters.filter((_, i) => i !== index))
  }

  const handleFileChange = (e) => {
    setCertificate(e.target.files[0])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const submitFormData = new FormData()
      submitFormData.append("overallResult", formData.overallResult)
      submitFormData.append("notes", formData.notes)
      submitFormData.append("testParameters", JSON.stringify(testParameters))

      if (certificate) {
        submitFormData.append("certificate", certificate)
      }

      await axios.put(`${API_BASE_URL}/herbs/lab/${herb._id}`, submitFormData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      onComplete()
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update lab testing data")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content lab-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Lab Testing - {herb.name}</h3>
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
              <strong>Processing Method:</strong> {herb.processing?.dryingMethod}
            </p>
            <p>
              <strong>Final Weight:</strong> {herb.processing?.finalWeight} kg
            </p>
          </div>

          <form onSubmit={handleSubmit} className="lab-testing-form">
            <div className="test-parameters-section">
              <h4>Test Parameters</h4>
              {testParameters.map((param, index) => (
                <div key={index} className="test-parameter-row">
                  <div className="parameter-inputs">
                    <input
                      type="text"
                      placeholder="Parameter name"
                      value={param.parameter}
                      onChange={(e) => handleParameterChange(index, "parameter", e.target.value)}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      value={param.value}
                      onChange={(e) => handleParameterChange(index, "value", e.target.value)}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Unit"
                      value={param.unit}
                      onChange={(e) => handleParameterChange(index, "unit", e.target.value)}
                      required
                    />
                    <select
                      value={param.status}
                      onChange={(e) => handleParameterChange(index, "status", e.target.value)}
                    >
                      <option value="pass">Pass</option>
                      <option value="fail">Fail</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    className="remove-parameter"
                    onClick={() => removeTestParameter(index)}
                    disabled={testParameters.length <= 1}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" className="add-parameter" onClick={addTestParameter}>
                Add Test Parameter
              </button>
            </div>

            <div className="form-group">
              <label htmlFor="certificate">Test Certificate (PDF/Image)</label>
              <input type="file" id="certificate" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} />
              {herb.labTesting?.certificateUrl && (
                <p className="existing-certificate">
                  Current certificate:{" "}
                  <a href={herb.labTesting.certificateUrl} target="_blank" rel="noopener noreferrer">
                    View existing certificate
                  </a>
                </p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="overallResult">Overall Test Result</label>
              <select name="overallResult" id="overallResult" value={formData.overallResult} onChange={handleChange}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="notes">Testing Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any additional notes about the testing process..."
                rows="3"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="modal-footer">
              <button type="button" className="button button-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="button button-success" disabled={loading}>
                {loading ? "Saving..." : "Complete Testing"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LabTestingModal
