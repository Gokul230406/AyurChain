"use client"
import { useEffect, useRef } from "react"
import "./Modal.css"

const QRCodeDisplay = ({ qrData, onClose }) => {
  const qrRef = useRef(null)

  useEffect(() => {
    // Generate QR code using a simple QR code library or service
    // For this example, we'll use QR Server API
    if (qrRef.current) {
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        qrData.qrCodeUrl,
      )}`
      qrRef.current.src = qrCodeUrl
    }
  }, [qrData.qrCodeUrl])

  const handleDownloadQR = () => {
    const link = document.createElement("a")
    link.href = qrRef.current.src
    link.download = `QR-${qrData.qrCodeId}.png`
    link.click()
  }

  const handlePrintQR = () => {
    const printWindow = window.open("", "_blank")
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${qrData.herb.name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 20px; 
            }
            .qr-container { 
              border: 2px solid #333; 
              padding: 20px; 
              display: inline-block; 
              margin: 20px;
            }
            .product-info { 
              margin-bottom: 20px; 
            }
            .qr-code { 
              margin: 20px 0; 
            }
            .instructions { 
              font-size: 12px; 
              color: #666; 
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="product-info">
              <h2>${qrData.herb.name}</h2>
              <p><strong>Batch:</strong> ${qrData.herb.manufacturing.batchNumber}</p>
              <p><strong>Manufacturing Date:</strong> ${new Date(
                qrData.herb.manufacturing.manufacturingDate,
              ).toLocaleDateString()}</p>
            </div>
            <div class="qr-code">
              <img src="${qrRef.current.src}" alt="QR Code" />
            </div>
            <div class="instructions">
              <p>Scan this QR code to verify the complete journey of this Ayurvedic herb</p>
              <p>QR ID: ${qrData.qrCodeId}</p>
            </div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content qr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>QR Code Generated Successfully</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="qr-success-message">
            <h4>✅ Manufacturing Complete!</h4>
            <p>Your Ayurvedic herb product has been successfully processed and is ready for distribution.</p>
          </div>

          <div className="product-summary">
            <h4>Product Details</h4>
            <div className="product-details">
              <p>
                <strong>Product:</strong> {qrData.herb.name}
              </p>
              <p>
                <strong>Batch Number:</strong> {qrData.herb.manufacturing.batchNumber}
              </p>
              <p>
                <strong>Final Weight:</strong> {qrData.herb.manufacturing.finalProductWeight} kg
              </p>
              <p>
                <strong>Packaging:</strong> {qrData.herb.manufacturing.packagingType}
              </p>
              <p>
                <strong>QR Code ID:</strong> {qrData.qrCodeId}
              </p>
            </div>
          </div>

          <div className="qr-code-container">
            <h4>Consumer Verification QR Code</h4>
            <div className="qr-code-display">
              <img ref={qrRef} alt="QR Code" className="qr-code-image" />
            </div>
            <p className="qr-url">
              <strong>Verification URL:</strong>
              <br />
              <a href={qrData.qrCodeUrl} target="_blank" rel="noopener noreferrer">
                {qrData.qrCodeUrl}
              </a>
            </p>
          </div>

          <div className="qr-actions">
            <button className="button button-primary" onClick={handleDownloadQR}>
              Download QR Code
            </button>
            <button className="button button-secondary" onClick={handlePrintQR}>
              Print QR Code
            </button>
          </div>

          <div className="qr-instructions">
            <h5>Instructions for Use:</h5>
            <ul>
              <li>Print this QR code and attach it to your product packaging</li>
              <li>Consumers can scan the QR code to view the complete herb journey</li>
              <li>The verification page shows farmer details, processing, lab results, and manufacturing info</li>
              <li>This ensures complete transparency and builds consumer trust</li>
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <button className="button button-success" onClick={onClose}>
            Complete
          </button>
        </div>
      </div>
    </div>
  )
}

export default QRCodeDisplay
