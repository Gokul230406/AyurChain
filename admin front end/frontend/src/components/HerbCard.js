"use client"
import "./HerbCard.css"

const HerbCard = ({ herb, onAction, actionLabel, actionColor = "primary", showProcessingDetails = false }) => {
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

        {herb.photo && (
          <div className="herb-photo">
            <img src={herb.photo || "/placeholder.svg"} alt={herb.name} />
          </div>
        )}

        {showProcessingDetails && herb.processing && herb.processing.status === "completed" && (
          <div className="processing-details">
            <h5>Processing Details:</h5>
            <p>
              <strong>Method:</strong> {herb.processing.dryingMethod}
            </p>
            <p>
              <strong>Duration:</strong> {herb.processing.dryingDuration}
            </p>
            <p>
              <strong>Final Weight:</strong> {herb.processing.finalWeight} kg
            </p>
            <p>
              <strong>Processed Date:</strong> {formatDate(herb.processing.processedDate)}
            </p>
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

export default HerbCard
