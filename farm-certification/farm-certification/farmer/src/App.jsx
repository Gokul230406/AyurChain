import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [formData, setFormData] = useState({
    plantName: '',
    location: '',
    cultivationDate: new Date().toISOString().split('T')[0],
    description: '',
    photos: []
  })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [locationStatus, setLocationStatus] = useState('')
  const [showCamera, setShowCamera] = useState(false)
  const [stream, setStream] = useState(null)
  const videoRef = useRef(null)
  const locationTimeoutRef = useRef(null)
  
  // Clear any previous error messages on component load
  useEffect(() => {
    setResult(null);
  }, []);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser')
      return
    }

    // Clear any existing timeout
    if (locationTimeoutRef.current) {
      clearTimeout(locationTimeoutRef.current)
    }

    setLocationStatus('Detecting location...')
    setFormData(prev => ({ ...prev, location: '' }))

    // Set a timeout for the geolocation request
    locationTimeoutRef.current = setTimeout(() => {
      setLocationStatus('Location detection timed out. Please try again.')
    }, 15000)

    const handleSuccess = (position) => {
      clearTimeout(locationTimeoutRef.current)
      const { latitude, longitude } = position.coords
      const locationString = `${longitude.toFixed(6)},${latitude.toFixed(6)}`
      setFormData(prev => ({ ...prev, location: locationString }))
      setLocationStatus('Location detected successfully')
    }

    const handleError = (error) => {
      clearTimeout(locationTimeoutRef.current)
      console.error('Geolocation error:', error)
      let errorMessage = ''
      switch (error.code) {
        case 1: // PERMISSION_DENIED
          errorMessage = 'Please allow location access in your browser settings'
          break
        case 2: // POSITION_UNAVAILABLE
          errorMessage = 'Location information is unavailable'
          break
        case 3: // TIMEOUT
          errorMessage = 'Location request timed out'
          break
        default:
          errorMessage = 'Failed to detect location'
      }
      setLocationStatus(errorMessage)
    }

    try {
      // Watch position instead of getting it once
      const watchId = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      )

      // Clear the watch after 15 seconds
      setTimeout(() => {
        navigator.geolocation.clearWatch(watchId)
      }, 15000)
    } catch (err) {
      clearTimeout(locationTimeoutRef.current)
      setLocationStatus('Unexpected error accessing location services')
      console.error('Geolocation error:', err)
    }
  }

  // Handle cleanup for both location and camera
  useEffect(() => {
    detectLocation()
    
    // Cleanup function
    return () => {
      // Clean up location resources
      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current)
      }
      
      // Clean up camera resources
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop()
          stream.removeTrack(track)
        })
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }, [])

  const startCamera = async () => {
    try {
      // First check if we have permission to use the camera
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = devices.filter(device => device.kind === 'videoinput')
      
      if (cameras.length === 0) {
        throw new Error('No camera found on your device')
      }

      // Try to use the environment-facing (rear) camera first
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })

      // If we got here, we successfully got the stream
      setStream(mediaStream)
      setShowCamera(true)
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        // Make sure video is ready
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
        }
      }
    } catch (error) {
      console.error('Camera error:', error)
      let errorMessage = 'Failed to access camera: '
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += 'Please allow camera access in your browser settings'
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage += 'No camera found on your device'
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage += 'Camera is in use by another application'
      } else {
        errorMessage += error.message
      }
      
      setResult({ error: errorMessage })
    }
  }

  const stopCamera = () => {
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop()
        stream.removeTrack(track)
      })
      setStream(null)
    }
    setShowCamera(false)
  }

  const takePhoto = () => {
    if (!videoRef.current || !videoRef.current.videoWidth) {
      setResult({ error: 'Camera is not ready yet. Please wait a moment.' })
      return
    }

    try {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      const ctx = canvas.getContext('2d')
      
      // Capture the current frame
      ctx.drawImage(videoRef.current, 0, 0)
      
      // Convert to base64 with quality setting (0.8 = 80% quality)
      const photo = canvas.toDataURL('image/jpeg', 0.8)
      
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, photo]
      }))

      // Clear any previous error messages
      setResult(null)
    } catch (error) {
      console.error('Photo capture error:', error)
      setResult({ error: 'Failed to capture photo: ' + error.message })
    }
  }

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setResult(null) // Clear previous results
    try {
      // Validate form data before submission
      if (!formData.location || !formData.location.includes(',')) {
        setResult({ error: "Please set a valid location with coordinates" });
        setSubmitting(false);
        return;
      }

      const geojson = {
        type: 'Feature',
        properties: {
          name: formData.plantName,
          cultivationDate: formData.cultivationDate,
          description: formData.description,
          photos: formData.photos
        },
        geometry: {
          type: 'Point',
          coordinates: formData.location.split(',').map(Number)
        }
      }

      console.log("Submitting data:", { geojson });
      
      // Use a try-catch specifically for the fetch operation
      try {
        const response = await fetch('http://localhost:3000/farmer/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ geojson })
        });

        if (!response.ok) {
          let errorMessage = "Server error. Please try again.";
          try {
            const errorData = await response.json();
            console.error("Server error:", errorData);
            errorMessage = errorData.error || errorMessage;
          } catch (jsonError) {
            console.error("Error parsing error response:", jsonError);
          }
          setResult({ error: errorMessage });
          setSubmitting(false);
          return;
        }

        const data = await response.json();
        console.log("Server response:", data);
        setResult(data);
        
        // Reset form data on success
        setFormData({
          plantName: '',
          location: '',
          cultivationDate: '',
          description: '',
          photos: []
        });
      } catch (fetchError) {
        console.error("Network error:", fetchError);
        setResult({ error: "Network error: " + fetchError.message });
      }
    } catch (error) {
      console.error("Form submission error:", error);
      setResult({ error: "Form error: " + error.message });
    }
    setSubmitting(false);
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="container">
      <h1>Plant Certification Submission</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="plantName">Plant Name</label>
          <div className="plant-name-input">
            <input
              type="text"
              id="plantName"
              name="plantName"
              value={formData.plantName}
              onChange={handleChange}
              placeholder="Enter plant name or select from list"
              list="commonPlants"
              required
            />
            <datalist id="commonPlants">
              <option value="Lavender" />
              <option value="Chamomile" />
              <option value="Peppermint" />
              <option value="Echinacea" />
              <option value="Sage" />
              <option value="Rosemary" />
              <option value="Thyme" />
              <option value="Basil" />
            </datalist>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="location">Location</label>
          <div className="location-input">
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Click refresh to detect location"
              required
            />
            <button 
              type="button" 
              onClick={detectLocation} 
              className="refresh-location"
              title="Refresh location"
            >
              🔄
            </button>
            <div 
              className="location-status"
              data-status={
                locationStatus.includes('successfully') ? 'success' : 
                locationStatus.includes('Detecting') ? 'detecting' : 
                'error'
              }
            >
              {locationStatus}
            </div>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="cultivationDate">Cultivation Date</label>
          <input
            type="date"
            id="cultivationDate"
            name="cultivationDate"
            value={formData.cultivationDate}
            onChange={handleChange}
            max={new Date().toISOString().split('T')[0]}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe the plant and its growing conditions..."
            required
          />
        </div>

        <div className="photo-section">
          <label>Photos</label>
          {showCamera ? (
            <div className="camera-container">
              <video 
                ref={videoRef}
                autoPlay 
                playsInline
                className="camera-preview"
              />
              <div className="camera-controls">
                <button type="button" onClick={takePhoto}>Take Photo</button>
                <button type="button" onClick={stopCamera}>Close Camera</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={startCamera} className="camera-button">
              📸 Open Camera
            </button>
          )}

          <div className="photo-gallery">
            {formData.photos.map((photo, index) => (
              <div key={index} className="photo-item">
                <img src={photo} alt={`Plant photo ${index + 1}`} />
                <button type="button" onClick={() => removePhoto(index)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={submitting || !formData.location}>
          {submitting ? 'Submitting...' : 'Submit for Certification'}
        </button>
      </form>

      {result && (
        <div className={result.error ? 'error' : 'success'}>
          {result.error ? (
            <p>An error occurred during submission. Please try again.</p>
          ) : (
            <p>
              Successfully submitted! <br />
              Hash: {result.hash} <br />
              IPFS CID: {result.cid}
            </p>
          )}
        </div>
      )}
      
      {/* Error message display has been modified */}
    </div>
  )
}

export default App
