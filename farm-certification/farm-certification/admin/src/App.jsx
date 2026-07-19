import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [pendingRecords, setPendingRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [certifying, setCertifying] = useState(null)
  const [error, setError] = useState(null)

  const fetchPendingRecords = async () => {
    try {
      const response = await fetch('http://localhost:3000/admin/pending')
      const data = await response.json()
      setPendingRecords(data)
    } catch (err) {
      setError('Failed to fetch pending records')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPendingRecords()
  }, [])

  const certifyRecord = async (hash) => {
    setCertifying(hash)
    try {
      const response = await fetch('http://localhost:3000/admin/certify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ hash })
      })
      
      const data = await response.json()
      if (data.success) {
        // Remove the certified record from the list
        setPendingRecords(pendingRecords.filter(record => record.hash !== hash))
      } else {
        throw new Error('Certification failed')
      }
    } catch (err) {
      setError('Failed to certify record')
    }
    setCertifying(null)
  }

  const viewOnIPFS = (cid) => {
    window.open(`http://localhost:8080/ipfs/${cid}`, '_blank')
  }

  if (loading) {
    return <div className="loading">Loading pending certifications...</div>
  }

  return (
    <div className="container">
      <h1>Plant Certification Admin</h1>
      
      {error && <div className="error">{error}</div>}

      <div className="records">
        {pendingRecords.length === 0 ? (
          <p className="no-records">No pending certifications</p>
        ) : (
          pendingRecords.map((record) => (
            <div key={record.hash} className="record-card">
              <h3>Plant Record</h3>
              <div className="record-details">
                <p><strong>Farmer:</strong> {record.farmer}</p>
                <p><strong>Hash:</strong> {record.hash}</p>
                <p><strong>IPFS CID:</strong> {record.ipfsCid}</p>
                <div className="record-data">
                  <pre>{JSON.stringify(record.geojson, null, 2)}</pre>
                </div>
              </div>
              <div className="record-actions">
                <button
                  onClick={() => viewOnIPFS(record.ipfsCid)}
                  className="view-btn"
                >
                  View on IPFS
                </button>
                <button
                  onClick={() => certifyRecord(record.hash)}
                  disabled={certifying === record.hash}
                  className="certify-btn"
                >
                  {certifying === record.hash ? 'Certifying...' : 'Certify'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default App
