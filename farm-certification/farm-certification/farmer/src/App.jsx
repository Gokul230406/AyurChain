import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const fetchJson = async (url, options) => {
  const res = await fetch(url, options);
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(`Server returned non-JSON response (${res.status}): ${text.slice(0, 60)}`);
  }
  return res.json();
};

/* ─── Farmer Account Storage (localStorage) ─── */
const DEFAULT_FARMERS = [{ username: 'farmer1', password: 'farmerpassword' }];
const loadFarmers = () => {
  try {
    const stored = localStorage.getItem('ayurchain_farmers');
    return stored ? JSON.parse(stored) : DEFAULT_FARMERS;
  } catch { return DEFAULT_FARMERS; }
};
const saveFarmers = (list) => {
  try { localStorage.setItem('ayurchain_farmers', JSON.stringify(list)); } catch {}
};

function App() {
  /* ─── Global State ─── */
  const [theme, setTheme]               = useState('dark'); // 'dark' | 'light'
  const [currentView, setCurrentView]   = useState('login'); // 'login' | 'farmer_dashboard' | 'admin_dashboard' | 'verify'
  const [userRole, setUserRole]         = useState(null); // 'farmer' | 'admin' | null
  const [loginTab, setLoginTab]         = useState('farmer'); // 'farmer' | 'signup' | 'verify'
  const [loginForm, setLoginForm]       = useState({ username: '', password: '' });
  const [loginError, setLoginError]     = useState('');
  const [previewImage, setPreviewImage] = useState(null); // image preview lightbox
  const [farmerAccounts, setFarmerAccounts] = useState(loadFarmers);
  const [signupForm, setSignupForm]     = useState({ username: '', password: '', confirm: '' });
  const [signupError, setSignupError]   = useState('');
  const [signupSuccess, setSignupSuccess] = useState('');
  const [adminUnlocked, setAdminUnlocked] = useState(false); // hidden admin access via URL param

  /* ─── Farmer Dashboard ─── */
  const [farmerTab, setFarmerTab]       = useState('submit'); // 'submit' | 'history'
  const [farmerHistory, setFarmerHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [formData, setFormData] = useState({
    plantName: '', location: '',
    cultivationDate: new Date().toISOString().split('T')[0],
    description: '', quantity: '', unit: 'kg', photos: []
  });
  const [submitting, setSubmitting]     = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [locationStatus, setLocationStatus] = useState('');
  const [showCamera, setShowCamera]     = useState(false);
  const [stream, setStream]             = useState(null);
  const [isListening, setIsListening]   = useState(false);
  const [statusChecks, setStatusChecks] = useState({}); // productId -> status data

  /* ─── QR Scanner ─── */
  const [isScanningQR, setIsScanningQR] = useState(false);
  const [qrFeedback, setQrFeedback]     = useState('');
  const qrVideoRef   = useRef(null);
  const qrStreamRef  = useRef(null);
  const qrAnimRef    = useRef(null);

  /* ─── Admin Dashboard ─── */
  const [adminTab, setAdminTab]         = useState('overview'); // 'overview'|'certify'|'processing'|'lab'|'manufacturing'|'manufactured'
  const [allRecords, setAllRecords]     = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError]     = useState('');
  const [successMsg, setSuccessMsg]     = useState('');
  const [certifyingHash, setCertifyingHash] = useState(null);
  const [rejectingHash, setRejectingHash]   = useState(null);
  const [rejectReason, setRejectReason]     = useState('');
  const [activeActionHash, setActiveActionHash] = useState(null);

  /* ─── Pipeline Forms ─── */
  const [processingForm, setProcessingForm] = useState({
    dryingMethod: 'Sun drying', dryingDuration: '', dryingTemperature: '',
    cleaningTechnique: 'Washing & Air Sorting', grindingRequired: 'Whole raw dried herb',
    moistureTarget: '', finalWeight: '', qualityInspector: '', notes: ''
  });
  const [labForm, setLabForm] = useState({
    moistureContent: '', ashContent: '',
    heavyMetals: '', microbialTotalPlate: '', microbialSalmonella: 'Absent',
    microbialEcoli: 'Absent', yeastMould: '', pesticideResidue: 'None detected',
    activeCompoundName: 'Withanolides', activeCompoundValue: '', foreignMatter: '',
    extractiveValue: '', labCertId: '', overallResult: 'approved', notes: ''
  });
  const [manufacturingForm, setManufacturingForm] = useState({
    batchNumber: '', packagingType: 'Airtight glass bottle',
    finalProductWeight: '', expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0],
    storageConditions: 'Cool & Dry', notes: ''
  });

  /* ─── Verification ─── */
  const [searchQuery, setSearchQuery]           = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError]     = useState('');

  const videoRef          = useRef(null);
  const locationTimeoutRef = useRef(null);
  const printRef          = useRef(null);

  /* ══════════════════════════════════════════════════
     LOAD jsQR DYNAMICALLY & INITIAL THEME
  ══════════════════════════════════════════════════ */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!window.jsQR) {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  /* ══════════════════════════════════════════════════
     URL PARAMS: auto-verify on ?verify=hash or ?pid=XXX
  ══════════════════════════════════════════════════ */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = params.get('verify');
    const pid  = params.get('pid');
    if (hash || pid) {
      const q = hash || pid;
      setSearchQuery(q);
      handleVerify(hash, pid);
    }
  }, []); // eslint-disable-line

  /* ══════════════════════════════════════════════════
     SPEECH TO TEXT
  ══════════════════════════════════════════════════ */
  const startSpeech = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition not supported in your browser.'); return; }
    const rec = new SR();
    rec.lang = 'en-US'; rec.interimResults = false;
    rec.onstart = () => setIsListening(true);
    rec.onend   = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    rec.onresult = (e) => {
      const txt = e.results[0][0].transcript;
      setFormData(p => ({ ...p, plantName: txt }));
    };
    rec.start();
  };

  /* ══════════════════════════════════════════════════
     QR CAMERA SCANNER
  ══════════════════════════════════════════════════ */
  const decodeFromImageData = (imageData, w, h) => {
    if (!window.jsQR) return null;
    return window.jsQR(imageData.data, w, h);
  };

  const qrLoop = useCallback(() => {
    const vid = qrVideoRef.current;
    if (!vid || !qrStreamRef.current) return;
    if (vid.readyState === vid.HAVE_ENOUGH_DATA) {
      const c = document.createElement('canvas');
      c.width = vid.videoWidth; c.height = vid.videoHeight;
      c.getContext('2d').drawImage(vid, 0, 0);
      const id = c.getContext('2d').getImageData(0, 0, c.width, c.height);
      const code = decodeFromImageData(id, c.width, c.height);
      if (code) {
        let q = code.data;
        if (q.includes('verify=')) q = q.split('verify=')[1].split('&')[0];
        else if (q.includes('pid=')) q = q.split('pid=')[1].split('&')[0];
        stopQRScanner();
        setSearchQuery(q);
        handleVerify(q.startsWith('0x') ? q : null, !q.startsWith('0x') ? q : null);
        return;
      }
    }
    qrAnimRef.current = requestAnimationFrame(qrLoop);
  }, []); // eslint-disable-line

  const startQRScanner = async () => {
    setQrFeedback('Starting camera...');
    try {
      const ms = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      qrStreamRef.current = ms; setIsScanningQR(true); setQrFeedback('Scanning...');
      setTimeout(() => { if (qrVideoRef.current) { qrVideoRef.current.srcObject = ms; qrVideoRef.current.play(); } }, 100);
      qrAnimRef.current = requestAnimationFrame(qrLoop);
    } catch (err) { setQrFeedback('Camera error: ' + err.message); }
  };

  const stopQRScanner = () => {
    qrStreamRef.current?.getTracks().forEach(t => t.stop());
    qrStreamRef.current = null;
    if (qrAnimRef.current) cancelAnimationFrame(qrAnimRef.current);
    setIsScanningQR(false); setQrFeedback('');
  };

  const handleQRUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setQrFeedback('Reading image...');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        const id = c.getContext('2d').getImageData(0, 0, c.width, c.height);
        const code = decodeFromImageData(id, c.width, c.height);
        if (code) {
          let q = code.data;
          if (q.includes('verify=')) q = q.split('verify=')[1].split('&')[0];
          else if (q.includes('pid=')) q = q.split('pid=')[1].split('&')[0];
          setSearchQuery(q); setQrFeedback('QR decoded!');
          handleVerify(q.startsWith('0x') ? q : null, !q.startsWith('0x') ? q : null);
        } else { setQrFeedback('No QR found — try a clearer image.'); }
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  /* ══════════════════════════════════════════════════
     GPS LOCATION
  ══════════════════════════════════════════════════ */
  const detectLocation = () => {
    if (!navigator.geolocation) { setLocationStatus('Geolocation not supported'); return; }
    if (locationTimeoutRef.current) clearTimeout(locationTimeoutRef.current);
    setLocationStatus('Detecting coordinates...'); setFormData(p => ({ ...p, location: '' }));
    locationTimeoutRef.current = setTimeout(() => setLocationStatus('Timeout — please retry.'), 15000);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        clearTimeout(locationTimeoutRef.current);
        setFormData(p => ({ ...p, location: `${coords.longitude.toFixed(6)},${coords.latitude.toFixed(6)}` }));
        setLocationStatus('Location locked ✓');
      },
      (err) => {
        clearTimeout(locationTimeoutRef.current);
        const msgs = { 1: 'Enable location permissions', 2: 'Signal unavailable', 3: 'Timed out' };
        setLocationStatus(msgs[err.code] || 'Location error');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  /* ══════════════════════════════════════════════════
     CAMERA FOR PHOTOS
  ══════════════════════════════════════════════════ */
  const startCamera = async () => {
    try {
      const ms = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } } });
      setStream(ms); setShowCamera(true);
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = ms; videoRef.current.play(); } }, 100);
    } catch (err) { alert('Camera error: ' + err.message); }
  };
  const stopCamera = () => { stream?.getTracks().forEach(t => t.stop()); setStream(null); setShowCamera(false); };
  const takePhoto  = () => {
    if (!videoRef.current) return;
    const c = document.createElement('canvas');
    c.width = videoRef.current.videoWidth || 640; c.height = videoRef.current.videoHeight || 480;
    c.getContext('2d').drawImage(videoRef.current, 0, 0);
    setFormData(p => ({ ...p, photos: [...p.photos, c.toDataURL('image/jpeg', 0.85)] }));
  };
  const removePhoto = (i) => setFormData(p => ({ ...p, photos: p.photos.filter((_, idx) => idx !== i) }));
  const handleFileUpload = (e) => {
    Array.from(e.target.files).forEach(file => {
      const r = new FileReader();
      r.onloadend = () => setFormData(p => ({ ...p, photos: [...p.photos, r.result] }));
      r.readAsDataURL(file);
    });
  };

  /* ══════════════════════════════════════════════════
     FARMER SUBMIT & HISTORY
  ══════════════════════════════════════════════════ */
  const handleFarmerSubmit = async (e) => {
    e.preventDefault();
    if (!formData.location) { alert('Please detect GPS location first.'); return; }
    setSubmitting(true); setSubmitResult(null);
    const geojson = {
      type: 'Feature',
      properties: {
        herbName: formData.plantName, name: formData.plantName,
        cultivationDate: formData.cultivationDate, description: formData.description,
        quantity: formData.quantity, unit: formData.unit,
        photos: formData.photos, timestamp: new Date().toISOString(),
        farmerId: loginForm.username || 'farmer1', farmerName: 'AyurChain Organic Grower'
      },
      geometry: { type: 'Point', coordinates: formData.location.split(',').map(Number) }
    };
    try {
      const data = await fetchJson(`${API_URL}/farmer/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ geojson, farmerId: loginForm.username || 'farmer1' }) });
      setSubmitResult(data);
      setFormData({ plantName: '', location: '', cultivationDate: new Date().toISOString().split('T')[0], description: '', quantity: '', unit: 'kg', photos: [] });
      setLocationStatus('');
      fetchFarmerHistory();
    } catch (err) {
      setSubmitResult({ error: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const fetchFarmerHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await fetchJson(`${API_URL}/farmer/records?farmerId=${loginForm.username || 'farmer1'}`);
      setFarmerHistory(Array.isArray(data) ? data : []);
    } catch { setFarmerHistory([]); }
    finally { setHistoryLoading(false); }
  };

  /* ══════════════════════════════════════════════════
     ADMIN — FETCH RECORDS
  ══════════════════════════════════════════════════ */
  const fetchAllAdminRecords = async () => {
    setAdminLoading(true); setAdminError('');
    try {
      const data = await fetchJson(`${API_URL}/admin/records`);
      setAllRecords(Array.isArray(data) ? data : []);
    } catch (err) { setAdminError('Failed to fetch: ' + err.message); }
    finally { setAdminLoading(false); }
  };

  const getFilteredRecords = () => {
    switch (adminTab) {
      case 'certify':       return allRecords.filter(r => r.currentStage === 'received' || (!r.certified && !r.rejected));
      case 'processing':    return allRecords.filter(r => r.currentStage === 'admin_approved');
      case 'lab':           return allRecords.filter(r => r.currentStage === 'processed');
      case 'manufacturing': return allRecords.filter(r => r.currentStage === 'lab-approved');
      case 'manufactured':  return allRecords.filter(r => r.currentStage === 'completed');
      default: return allRecords;
    }
  };

  const adminStats = {
    total:       allRecords.length,
    pending:     allRecords.filter(r => r.currentStage === 'received').length,
    processing:  allRecords.filter(r => r.currentStage === 'admin_approved').length,
    lab:         allRecords.filter(r => r.currentStage === 'processed').length,
    completed:   allRecords.filter(r => r.currentStage === 'completed').length,
  };

  /* ─── Admin Actions ─── */
  const handleCertify = async (hash) => {
    setCertifyingHash(hash); setAdminError(''); setSuccessMsg('');
    try {
      const data = await fetchJson(`${API_URL}/admin/certify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hash }) });
      if (data.success) { setSuccessMsg('Record certified on blockchain ✓'); fetchAllAdminRecords(); }
      else throw new Error('Certification failed');
    } catch (err) { setAdminError(err.message); }
    finally { setCertifyingHash(null); }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectingHash) return;
    if (!rejectReason.trim()) { alert('Please enter a rejection reason.'); return; }
    try {
      const data = await fetchJson(`${API_URL}/admin/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hash: rejectingHash, reason: rejectReason }) });
      if (data.success) { setSuccessMsg('Record rejected.'); setRejectingHash(null); setRejectReason(''); fetchAllAdminRecords(); }
    } catch (err) { setAdminError(err.message); }
  };

  const handleStageSubmit = async (e, hash, stage, updateData) => {
    e.preventDefault(); setAdminError(''); setSuccessMsg('');

    // Validation for Lab rejection reason
    if (stage === 'lab-rejected' && (!updateData.notes || !updateData.notes.trim())) {
      setAdminError('Lab Rejection requires explanatory notes/remarks.');
      return;
    }

    try {
      const data = await fetchJson(`${API_URL}/admin/update-stage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hash, stage, updateData }) });
      if (data.success) { setSuccessMsg(`Stage updated: ${stage} ✓`); setActiveActionHash(null); fetchAllAdminRecords(); }
      else throw new Error(data.error || 'Update failed');
    } catch (err) { setAdminError(err.message); }
  };

  /* ══════════════════════════════════════════════════
     VERIFICATION (by hash OR productId)
  ══════════════════════════════════════════════════ */
  const handleVerify = async (hash, productId) => {
    const q = hash || productId || searchQuery;
    if (!q) return;
    setVerificationLoading(true); setVerificationError(''); setVerificationResult(null);
    try {
      const isHash = q.startsWith('0x');
      const url = isHash ? `${API_URL}/farmer/status?hash=${q}` : `${API_URL}/farmer/status?productId=${q}`;
      const data = await fetchJson(url);
      if (data.status === 'unknown') throw new Error('No record found for this ID/hash');
      setVerificationResult(data);
      setCurrentView('verify');
    } catch (err) { setVerificationError(err.message); }
    finally { setVerificationLoading(false); }
  };

  /* ══════════════════════════════════════════════════
     LOGIN / LOGOUT / SIGNUP
  ══════════════════════════════════════════════════ */
  // Check URL param for admin access
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true') {
      setAdminUnlocked(true);
      setLoginTab('admin');
    }
  }, []); // eslint-disable-line

  const handleLogin = (e) => {
    e.preventDefault(); setLoginError('');
    const { username, password } = loginForm;
    if (loginTab === 'farmer') {
      const match = farmerAccounts.find(f => f.username === username && f.password === password);
      if (match) {
        setUserRole('farmer'); setCurrentView('farmer_dashboard'); fetchFarmerHistory();
      } else { setLoginError('Invalid farmer credentials.'); }
    } else if (loginTab === 'admin') {
      if (username === 'admin' && password === 'admin') {
        setUserRole('admin'); setCurrentView('admin_dashboard'); fetchAllAdminRecords();
      } else { setLoginError('Invalid admin credentials.'); }
    }
  };

  const handleSignup = (e) => {
    e.preventDefault(); setSignupError(''); setSignupSuccess('');
    const { username, password, confirm } = signupForm;
    if (!username.trim() || username.length < 3) { setSignupError('Username must be at least 3 characters.'); return; }
    if (password.length < 6) { setSignupError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setSignupError('Passwords do not match.'); return; }
    if (farmerAccounts.find(f => f.username === username)) { setSignupError('Username already taken. Please choose another.'); return; }
    const updated = [...farmerAccounts, { username, password }];
    saveFarmers(updated);
    setFarmerAccounts(updated);
    setSignupSuccess(`Account "${username}" created! You can now sign in.`);
    setSignupForm({ username: '', password: '', confirm: '' });
    setTimeout(() => { setLoginTab('farmer'); setSignupSuccess(''); setLoginForm({ username, password: '' }); }, 2000);
  };

  const handleLogout = () => {
    setUserRole(null); setCurrentView('login'); setSubmitResult(null);
    setLoginForm({ username: '', password: '' }); setAdminTab('overview');
    setFarmerTab('submit'); setFarmerHistory([]);
    setLoginTab('farmer'); setLoginError(''); setSignupError(''); setSignupSuccess('');
  };

  /* ══════════════════════════════════════════════════
     PDF PRINT & DIRECT QR DOWNLOAD
  ══════════════════════════════════════════════════ */
  const handlePrintCertificate = () => window.print();

  const downloadQRImage = async (url, filename) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename || 'AyurChain-QR.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  /* ══════════════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════════════ */
  const stageOrder  = ['received', 'admin_approved', 'processed', 'lab-approved', 'completed'];
  const stageIndex  = (s) => stageOrder.indexOf(s === 'lab-rejected' ? 'processed' : s === 'admin_rejected' ? 'received' : s);
  const stagePassed = (record, target) => stageIndex(record?.status) >= stageOrder.indexOf(target);

  const stageBadgeColor = (stage) => {
    const map = { received: '#EAB308', admin_approved: '#3B82F6', processed: '#8B5CF6', 'lab-approved': '#10B981', completed: '#10B981', 'lab-rejected': '#EF4444', admin_rejected: '#EF4444' };
    return map[stage] || '#6B7280';
  };

  const qrUrl = (record) => {
    const id = record.productId || record.hash;
    const isHash = !record.productId;
    const param  = isHash ? `verify=${id}` : `pid=${id}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`${window.location.origin}/?${param}`)}`;
  };

  /* ══════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════ */
  return (
    <div className="app-wrapper">

      {/* ─── NAVBAR ─── */}
      <header className="main-header">
        <div className="header-brand" onClick={() => {
          if (userRole === 'farmer') {
            setCurrentView('farmer_dashboard');
            setFarmerTab('submit');
          } else if (userRole === 'admin') {
            setCurrentView('admin_dashboard');
          } else {
            setCurrentView('login');
            setLoginTab('farmer');
          }
        }} title="Go to AyurChain Homepage">
          <svg className="logo-icon" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6 8 4 12 6 17c2 4 8 5 12 1 1-6-2-12-6-16z" fill="currentColor" opacity=".9"/>
            <path d="M12 2c1 6 0 12-2 16" stroke="#fff" strokeWidth="1" strokeLinecap="round"/>
          </svg>
          <span className="brand-text">AYUR<span className="accent-text">CHAIN</span></span>
          <span className="brand-tagline">Premium Herbs Blockchain Verification</span>
        </div>
        <div className="header-actions">
          <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="theme-toggle-btn" title="Toggle theme">
            {theme === 'dark'
              ? <svg className="theme-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>
              : <svg className="theme-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
            }
          </button>
          {userRole && (
            <div className="user-profile-badge">
              <span className="user-label">{userRole === 'admin' ? '🛡️ Admin' : `🌿 ${loginForm.username || 'farmer1'}`}</span>
              <button onClick={handleLogout} className="logout-btn">Sign Out</button>
            </div>
          )}
        </div>
      </header>

      {/* ─── MAIN ─── */}
      <main className="main-content">

        {/* ══════════════ LOGIN SCREEN ══════════════ */}
        {currentView === 'login' && (
          <div className={`login-container animate-fade-in ${loginTab === 'verify' ? 'verify-mode' : ''}`}>
            <div className="login-tabs-bar">
              {[
                ['farmer', '🌾 Sign In'],
                ['verify', '🔍 Verify'],
                ...(adminUnlocked ? [['admin', '🔒 Admin']] : [])
              ].map(([t, label]) => (
                <button key={t} className={`login-tab-btn ${loginTab === t ? 'active' : ''}`}
                  onClick={() => { setLoginTab(t); setLoginError(''); setLoginForm({ username: '', password: '' }); }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Farmer Sign In */}
            {loginTab === 'farmer' && (
              <div className="login-card glass-panel">
                <div className="login-card-header">
                  <div className="login-icon-ring">🌿</div>
                  <h2>Farmer Portal</h2>
                  <p>Access your AyurChain farming profile</p>
                </div>
                <form onSubmit={handleLogin} className="login-form">
                  <div className="form-group">
                    <label htmlFor="un">Username</label>
                    <input type="text" id="un" placeholder="Enter your username"
                      value={loginForm.username} onChange={e => setLoginForm(p => ({ ...p, username: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="pw">Password</label>
                    <input type="password" id="pw" placeholder="Enter password"
                      value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} required />
                  </div>
                  {loginError && <div className="error-alert">{loginError}</div>}
                  <button type="submit" className="primary-btn submit-login-btn">Sign In</button>
                </form>
                <div style={{ textAlign:'center', margin:'.75rem 0 .4rem', fontSize:'.82rem' }}>
                  <span style={{ color:'var(--text-3)' }}>New user?</span>{' '}
                  <button className="link-btn" onClick={() => { setLoginTab('signup'); setSignupError(''); setSignupSuccess(''); }}>
                    Register here
                  </button>
                </div>
                <div className="demo-creds">
                  <span className="demo-label">Demo:</span>
                  <span><code>farmer1</code> / <code>farmerpassword</code></span>
                </div>
              </div>
            )}

            {/* Farmer Sign Up (shown when Register is clicked) */}
            {loginTab === 'signup' && (
              <div className="login-card glass-panel">
                <div className="login-card-header">
                  <div className="login-icon-ring">✨</div>
                  <h2>Create Farmer Account</h2>
                  <p>Register to submit herb certifications on AyurChain</p>
                </div>
                <form onSubmit={handleSignup} className="login-form">
                  <div className="form-group">
                    <label htmlFor="su-un">Username <span className="req-star">*</span></label>
                    <input type="text" id="su-un" placeholder="Choose a unique username (min 3 chars)"
                      value={signupForm.username} onChange={e => setSignupForm(p => ({ ...p, username: e.target.value }))} required minLength={3} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="su-pw">Password <span className="req-star">*</span></label>
                    <input type="password" id="su-pw" placeholder="Choose a password (min 6 chars)"
                      value={signupForm.password} onChange={e => setSignupForm(p => ({ ...p, password: e.target.value }))} required minLength={6} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="su-pw2">Confirm Password <span className="req-star">*</span></label>
                    <input type="password" id="su-pw2" placeholder="Re-enter password"
                      value={signupForm.confirm} onChange={e => setSignupForm(p => ({ ...p, confirm: e.target.value }))} required />
                  </div>
                  {signupError && <div className="error-alert">{signupError}</div>}
                  {signupSuccess && <div className="success-alert">{signupSuccess}</div>}
                  <button type="submit" className="primary-btn submit-login-btn">🌿 Create Account</button>
                </form>
                <div style={{ textAlign:'center', marginTop:'.75rem', fontSize:'.82rem', color:'var(--text-3)' }}>
                  Already have an account?{' '}
                  <button className="link-btn" onClick={() => { setLoginTab('farmer'); setSignupError(''); setSignupSuccess(''); }}>
                    Sign in
                  </button>
                </div>
              </div>
            )}

            {/* Admin Portal (hidden, accessed via ?admin=true) */}
            {loginTab === 'admin' && adminUnlocked && (
              <div className="login-card glass-panel">
                <div className="login-card-header">
                  <div className="login-icon-ring">🛡️</div>
                  <h2>Admin Portal</h2>
                  <p>Administrative secure access</p>
                </div>
                <form onSubmit={handleLogin} className="login-form">
                  <div className="form-group">
                    <label htmlFor="adm-un">Username</label>
                    <input type="text" id="adm-un" placeholder="admin"
                      value={loginForm.username} onChange={e => setLoginForm(p => ({ ...p, username: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="adm-pw">Password</label>
                    <input type="password" id="adm-pw" placeholder="Enter admin password"
                      value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))} required />
                  </div>
                  {loginError && <div className="error-alert">{loginError}</div>}
                  <button type="submit" className="primary-btn submit-login-btn">Authenticate</button>
                </form>
              </div>
            )}

            {/* Verify Certificate */}
            {loginTab === 'verify' && (
              <div className="login-card glass-panel">
                <div className="login-card-header">
                  <div className="login-icon-ring">🔍</div>
                  <h2>Verify Certificate</h2>
                  <p>Enter Product ID or blockchain hash to view the supply chain audit trail</p>
                </div>
                <div className="verify-search-group">
                  <input type="text" placeholder="Product ID (AYR-…) or 0x hash"
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleVerify(null, null)} />
                  <button onClick={() => handleVerify(null, null)} disabled={!searchQuery || verificationLoading} className="primary-btn">
                    {verificationLoading ? 'Searching…' : 'Search'}
                  </button>
                </div>

                <div className="qr-divider"><span>or scan QR</span></div>

                <div className="qr-actions-row">
                  <button onClick={isScanningQR ? stopQRScanner : startQRScanner}
                    className={`secondary-btn ${isScanningQR ? 'danger-outline-btn' : ''}`}>
                    {isScanningQR ? '❌ Stop' : '📷 Scan with Camera'}
                  </button>
                  <label className="secondary-btn file-qr-label">
                    📁 Upload QR Image
                    <input type="file" accept="image/*" onChange={handleQRUpload} style={{ display: 'none' }} />
                  </label>
                </div>
                {qrFeedback && <p className="qr-feedback">{qrFeedback}</p>}
                {isScanningQR && (
                  <div className="qr-scan-box animate-fade-in">
                    <video ref={qrVideoRef} className="qr-video" playsInline />
                    <div className="qr-scan-line" />
                  </div>
                )}
                {verificationError && <div className="error-alert mt-1">{verificationError}</div>}
              </div>
            )}
          </div>
        )}

        {/* ══════════════ FARMER DASHBOARD ══════════════ */}
        {currentView === 'farmer_dashboard' && (
          <div className="farmer-dashboard animate-fade-in">
            <div className="page-header">
              <div>
                <h1>🌿 Farmer Dashboard</h1>
                <p className="page-subtitle">Manage your herb submissions and track certification status</p>
              </div>
            </div>

            {/* Farmer sub-tabs */}
            <div className="sub-tabs-bar">
              <button className={`sub-tab-btn ${farmerTab === 'submit' ? 'active' : ''}`}
                onClick={() => setFarmerTab('submit')}>📝 New Submission</button>
              <button className={`sub-tab-btn ${farmerTab === 'history' ? 'active' : ''}`}
                onClick={() => { setFarmerTab('history'); fetchFarmerHistory(); }}>📋 My Herb History</button>
            </div>

            {/* ── Submit Tab ── */}
            {farmerTab === 'submit' && (
              <div className="farmer-submit-grid">
                <div className="glass-panel submit-form-card">
                  <div className="card-header">
                    <h3>📝 Register Organic Cultivation</h3>
                    <p>Submit geotagged herb details for blockchain certification</p>
                  </div>
                  <form onSubmit={handleFarmerSubmit} className="certification-form">
                    {/* Plant Name + Speech */}
                    <div className="form-group">
                      <label>Plant Botanical Name <span className="req-star">*</span></label>
                      <div className="speech-input-wrapper">
                        <input type="text" value={formData.plantName}
                          onChange={e => setFormData(p => ({ ...p, plantName: e.target.value }))}
                          placeholder="e.g. Withania somnifera (Ashwagandha)" list="plants" required />
                        <button type="button" onClick={startSpeech}
                          className={`speech-mic-btn ${isListening ? 'listening' : ''}`} title="Speak plant name">
                          {isListening ? '🔴' : '🎙️'}
                        </button>
                      </div>
                      <datalist id="plants">
                        {['Withania somnifera (Ashwagandha)','Curcuma longa (Turmeric)','Ocimum sanctum (Holy Basil)','Centella asiatica (Gotu Kola)','Piper nigrum (Black Pepper)','Aloe vera','Neem (Azadirachta indica)','Brahmi (Bacopa monnieri)'].map(p => <option key={p} value={p}/>)}
                      </datalist>
                    </div>

                    {/* GPS */}
                    <div className="form-group">
                      <label>GPS Coordinates <span className="req-star">*</span></label>
                      <div className="location-control-group">
                        <input type="text" value={formData.location}
                          onChange={e => setFormData(p => ({ ...p, location: e.target.value }))}
                          placeholder="Longitude, Latitude" required />
                        <button type="button" onClick={detectLocation} className="location-btn">🛰️ Locate</button>
                      </div>
                      {locationStatus && <div className={`status-indicator ${locationStatus.includes('✓') ? 'success' : 'pending'}`}>{locationStatus}</div>}
                    </div>

                    {/* Date + Quantity row */}
                    <div className="form-row-2">
                      <div className="form-group">
                        <label>Cultivation Date <span className="req-star">*</span></label>
                        <input type="date" value={formData.cultivationDate}
                          onChange={e => setFormData(p => ({ ...p, cultivationDate: e.target.value }))}
                          max={new Date().toISOString().split('T')[0]} required />
                      </div>
                      <div className="form-group">
                        <label>Estimated Quantity <span className="req-star">*</span></label>
                        <div className="qty-group">
                          <input type="number" min="0" step="0.1" value={formData.quantity}
                            onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))}
                            placeholder="Amount" required />
                          <select value={formData.unit} onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))}>
                            <option>kg</option><option>g</option><option>ton</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="form-group">
                      <label>Growing Conditions & Notes <span className="req-star">*</span></label>
                      <textarea value={formData.description}
                        onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                        placeholder="Soil type, irrigation method, fertilizers used, organic practices..." required />
                    </div>

                    {/* Photos */}
                    <div className="form-group">
                      <label>📸 Evidence Photos</label>
                      <div className="capture-options">
                        {showCamera ? (
                          <div className="camera-feed-container">
                            <video ref={videoRef} className="camera-stream" playsInline autoPlay />
                            <div className="camera-actions">
                              <button type="button" onClick={takePhoto} className="primary-btn btn-sm">📸 Capture</button>
                              <button type="button" onClick={stopCamera} className="secondary-btn btn-sm">✕ Close</button>
                            </div>
                          </div>
                        ) : (
                          <button type="button" onClick={startCamera} className="upload-zone-btn">📷 Open Camera</button>
                        )}
                        <label className="upload-zone-btn">
                          📁 Upload Files
                          <input type="file" accept="image/*" multiple onChange={handleFileUpload} style={{ display:'none' }}/>
                        </label>
                      </div>
                      {formData.photos.length > 0 && (
                        <div className="evidence-gallery">
                          {formData.photos.map((ph, i) => (
                            <div key={i} className="gallery-thumb" onClick={() => setPreviewImage(ph)}>
                              <img src={ph} alt={`ev-${i}`}/>
                              <button type="button" onClick={(e) => { e.stopPropagation(); removePhoto(i); }} className="remove-photo-btn">×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button type="submit" disabled={submitting} className="primary-btn submit-btn">
                      {submitting ? '⏳ Anchoring to Blockchain…' : '🔒 Submit for Certification'}
                    </button>
                  </form>
                </div>

                {/* ── Submit Result & Latest Submissions ── */}
                <div className="glass-panel submit-result-card">
                  <div className="card-header">
                    <h3>📨 Submission Status</h3>
                    <p>Track your active receipt and latest submissions</p>
                  </div>

                  {submitResult && !submitResult.error && (
                    <div className="receipt-success animate-fade-in mb-3">
                      <div className="success-badge-lg">✅ Submitted Successfully</div>
                      <div className="product-id-display">
                        <span className="pid-label">Your Product ID</span>
                        <span className="pid-value">{submitResult.productId}</span>
                        <button className="copy-btn" onClick={() => navigator.clipboard.writeText(submitResult.productId)} title="Copy">📋</button>
                      </div>
                      <div className="receipt-info-box">
                        <div className="info-row"><span className="info-key">Status</span><span className="info-val stage-badge pending-badge">Pending Review</span></div>
                        <div className="info-row"><span className="info-key">Hash</span><span className="info-val code-font">{submitResult.hash?.slice(0, 20)}…</span></div>
                        <div className="info-row"><span className="info-key">IPFS CID</span><span className="info-val code-font">{submitResult.cid?.slice(0, 20)}…</span></div>
                      </div>
                    </div>
                  )}

                  {/* Latest Submissions List */}
                  <div className="latest-submissions-section mt-2">
                    <h4 className="font-bold text-sm mb-2" style={{ color: 'var(--text-1)' }}>
                      📋 Recent Submissions ({farmerHistory.length})
                    </h4>
                    {farmerHistory.length === 0 ? (
                      <div className="empty-receipt">
                        <div className="empty-icon">🌿</div>
                        <p>Submit your herb details to receive your Product ID</p>
                      </div>
                    ) : (
                      <div className="latest-submissions-list" style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                        {farmerHistory.slice(0, 4).map(rec => (
                          <div key={rec._id} className="latest-sub-item glass-panel" style={{ padding: '.6rem .75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.5rem' }}>
                            <div>
                              <div className="font-bold text-sm">{rec.geojson?.properties?.herbName || 'Herb'}</div>
                              <div className="code-font small-text text-2">{rec.productId || rec.hash?.slice(0,14)}</div>
                            </div>
                            <span className="stage-badge" style={{ background: `${stageBadgeColor(rec.currentStage)}18`, color: stageBadgeColor(rec.currentStage), borderColor: `${stageBadgeColor(rec.currentStage)}40` }}>
                              {rec.currentStage?.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button className="secondary-btn w-full mt-3" onClick={() => { setFarmerTab('history'); fetchFarmerHistory(); }}>
                    📋 View All Submissions ({farmerHistory.length})
                  </button>
                </div>
              </div>
            )}

            {/* ── History Tab ── */}
            {farmerTab === 'history' && (
              <div className="history-section">
                <div className="history-header-row">
                  <h3>📋 My Herb Submissions</h3>
                  <button onClick={fetchFarmerHistory} disabled={historyLoading} className="secondary-btn btn-sm">
                    🔄 Refresh
                  </button>
                </div>
                {historyLoading ? (
                  <div className="loading-box"><div className="spinner"/><p>Loading records…</p></div>
                ) : farmerHistory.length === 0 ? (
                  <div className="empty-state glass-panel">
                    <div className="empty-icon">🌱</div>
                    <h4>No submissions yet</h4>
                    <p>Submit your first herb certification from the New Submission tab</p>
                  </div>
                ) : (
                  <div className="history-grid">
                    {farmerHistory.map(r => (
                      <div key={r._id} className="history-card glass-panel">
                        <div className="history-card-top">
                          <div>
                            <h4 className="herb-name">{r.geojson?.properties?.herbName || 'Unknown Herb'}</h4>
                            <p className="herb-date">{new Date(r.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</p>
                          </div>
                          <span className="stage-badge" style={{ background: `${stageBadgeColor(r.currentStage)}18`, color: stageBadgeColor(r.currentStage), borderColor: `${stageBadgeColor(r.currentStage)}40` }}>
                            {r.currentStage?.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                        <div className="history-meta">
                          <div className="meta-row"><span className="meta-k">Product ID</span><span className="meta-v code-font">{r.productId || '—'}</span></div>
                          <div className="meta-row"><span className="meta-k">Location</span><span className="meta-v">{r.geojson?.geometry?.coordinates?.join(', ') || '—'}</span></div>
                          <div className="meta-row"><span className="meta-k">Quantity</span><span className="meta-v">{r.geojson?.properties?.quantity || '—'} {r.geojson?.properties?.unit || ''}</span></div>
                        </div>

                        {r.rejectedReason && (
                          <div className="error-alert mt-2" style={{ fontSize: '.78rem' }}>
                            <strong>Rejection Reason:</strong> {r.rejectedReason}
                          </div>
                        )}

                        <div className="history-actions-row mt-2">
                          <button className="secondary-btn btn-sm" onClick={() => { setSearchQuery(r.productId || r.hash); handleVerify(null, r.productId || r.hash); }}>
                            🔍 View Details
                          </button>
                          {r.currentStage === 'completed' && (
                            <button className="secondary-btn btn-sm" onClick={() => { setSearchQuery(r.productId || r.hash); handleVerify(null, r.productId || r.hash); }}>
                              📜 View Certificate
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════════ ADMIN DASHBOARD ══════════════ */}
        {currentView === 'admin_dashboard' && (
          <div className="admin-dashboard animate-fade-in">
            <div className="page-header">
              <div>
                <h1>🛡️ Admin Verification & Pipeline</h1>
                <p className="page-subtitle">Inspect herb submissions, conduct laboratory testing, and issue blockchain certificates</p>
              </div>
              <button onClick={fetchAllAdminRecords} disabled={adminLoading} className="secondary-btn btn-sm">
                🔄 Refresh Records
              </button>
            </div>

            {/* Admin Stats */}
            <div className="stats-grid">
              <div className="stat-card glass-panel">
                <span className="stat-label">Total Submissions</span>
                <span className="stat-value">{adminStats.total}</span>
              </div>
              <div className="stat-card glass-panel gold-glow">
                <span className="stat-label">Pending Certification</span>
                <span className="stat-value text-gold">{adminStats.pending}</span>
              </div>
              <div className="stat-card glass-panel blue-glow">
                <span className="stat-label">In Processing</span>
                <span className="stat-value text-blue">{adminStats.processing}</span>
              </div>
              <div className="stat-card glass-panel purple-glow">
                <span className="stat-label">Lab Testing</span>
                <span className="stat-value text-purple">{adminStats.lab}</span>
              </div>
              <div className="stat-card glass-panel green-glow">
                <span className="stat-label">Completed & Issued</span>
                <span className="stat-value text-green">{adminStats.completed}</span>
              </div>
            </div>

            {/* Admin Tabs */}
            <div className="admin-tabs-bar">
              {[
                ['overview','📊 Overview'],
                ['certify','🛡️ Certification'],
                ['processing','🧼 Processing'],
                ['lab','🔬 Lab Testing'],
                ['manufacturing','📦 Manufacturing'],
                ['manufactured','✅ Manufactured'],
              ].map(([t, label]) => (
                <button key={t} className={`admin-tab-btn ${adminTab === t ? 'active' : ''}`}
                  onClick={() => { setAdminTab(t); setActiveActionHash(null); }}>
                  {label}
                </button>
              ))}
            </div>

            {adminError   && <div className="error-alert">{adminError}</div>}
            {successMsg   && <div className="success-alert">{successMsg}</div>}

            {/* Records List */}
            {adminTab !== 'manufactured' && (
              <div className="records-section">
                {adminLoading ? (
                  <div className="loading-box"><div className="spinner"/><p>Loading ledger records…</p></div>
                ) : getFilteredRecords().length === 0 ? (
                  <div className="empty-state glass-panel">
                    <div className="empty-icon">📂</div>
                    <h4>No records in this stage</h4>
                    <p>Submissions will appear here when they reach this phase of the supply chain.</p>
                  </div>
                ) : (
                  <div className="records-list">
                    {getFilteredRecords().map(record => (
                      <div key={record.hash} className={`record-card glass-panel ${activeActionHash === record.hash ? 'expanded-card' : ''}`}>
                        <div className="record-card-top">
                          <div className="record-title-area">
                            <h4>{record.geojson?.properties?.herbName || 'Unknown Herb'}</h4>
                            <span className="stage-badge" style={{ background: `${stageBadgeColor(record.currentStage)}18`, color: stageBadgeColor(record.currentStage), borderColor: `${stageBadgeColor(record.currentStage)}40` }}>
                              {record.currentStage?.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </div>
                          <div className="record-card-meta">
                            <span>🪪 {record.productId || '—'}</span>
                            <span>📅 {new Date(record.createdAt).toLocaleDateString()}</span>
                            <span>👨‍🌾 {record.farmerId}</span>
                          </div>
                        </div>

                        {/* Record Details */}
                        <div className="record-details-grid">
                          <div className="detail-box">
                            <p><strong>Hash:</strong> <span className="code-font">{record.hash?.slice(0,24)}…</span></p>
                            <p><strong>IPFS:</strong> <span className="code-font">{record.ipfsCid?.slice(0,24)}…</span></p>
                            <p><strong>GPS:</strong> {record.geojson?.geometry?.coordinates?.join(', ')}</p>
                            <p><strong>Date:</strong> {record.geojson?.properties?.cultivationDate}</p>
                            <p><strong>Quantity:</strong> {record.geojson?.properties?.quantity} {record.geojson?.properties?.unit}</p>
                            {record.geojson?.properties?.description && <p><strong>Notes:</strong> {record.geojson.properties.description}</p>}
                          </div>
                          {record.geojson?.properties?.photos?.length > 0 && (
                            <div className="evidence-thumbs">
                              {record.geojson.properties.photos.slice(0,4).map((ph, idx) => (
                                <img key={idx} src={ph} alt="evidence" className="evidence-thumb-img" onClick={() => setPreviewImage(ph)}/>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Upstream stage data */}
                        {record.processing && (
                          <div className="stage-data-box processing-data">
                            <strong>🧼 Processing:</strong> {record.processing.dryingMethod}, {record.processing.dryingDuration}h @ {record.processing.dryingTemperature}°C | Cleaning: {record.processing.cleaningTechnique} | Grinding: {record.processing.grindingRequired} | Final Weight: {record.processing.finalWeight} kg
                          </div>
                        )}
                        {record.labTesting && (
                          <div className="stage-data-box lab-data">
                            <strong>🔬 Lab:</strong> Moisture: {record.labTesting.moistureContent}% | Ash: {record.labTesting.ashContent}% | Heavy Metals: {record.labTesting.heavyMetals} | Active: {record.labTesting.activeCompoundName} ({record.labTesting.activeCompoundValue}) | Verdict: <strong style={{color: record.labTesting.overallResult==='approved'?'#10B981':'#EF4444'}}>{record.labTesting.overallResult?.toUpperCase()}</strong>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="record-actions">
                          {/* CERTIFY */}
                          {adminTab === 'certify' && record.currentStage === 'received' && (
                            <>
                              <button onClick={() => setRejectingHash(record.hash)} className="danger-btn btn-sm">✕ Reject</button>
                              <button onClick={() => handleCertify(record.hash)} disabled={certifyingHash === record.hash} className="primary-btn btn-sm">
                                {certifyingHash === record.hash ? 'Certifying…' : '✔ Approve & Certify'}
                              </button>
                            </>
                          )}
                          {/* PROCESSING TOGGLE */}
                          {adminTab === 'processing' && record.currentStage === 'admin_approved' && (
                            <button onClick={() => setActiveActionHash(activeActionHash === record.hash ? null : record.hash)} className="primary-btn btn-sm">
                              {activeActionHash === record.hash ? '✕ Cancel' : '⚙️ Start Processing'}
                            </button>
                          )}
                          {/* LAB TOGGLE */}
                          {adminTab === 'lab' && record.currentStage === 'processed' && (
                            <button onClick={() => setActiveActionHash(activeActionHash === record.hash ? null : record.hash)} className="primary-btn btn-sm">
                              {activeActionHash === record.hash ? '✕ Cancel' : '🔬 Enter Lab Results'}
                            </button>
                          )}
                          {/* MANUFACTURING TOGGLE */}
                          {adminTab === 'manufacturing' && record.currentStage === 'lab-approved' && (
                            <button onClick={() => {
                              setActiveActionHash(activeActionHash === record.hash ? null : record.hash);
                              const herb = (record.geojson?.properties?.herbName || 'HERB').slice(0,3).toUpperCase();
                              setManufacturingForm(p => ({ ...p, batchNumber: `${herb}-${Date.now().toString().slice(-5)}`, finalProductWeight: record.processing?.finalWeight || '' }));
                            }} className="primary-btn btn-sm">
                              {activeActionHash === record.hash ? '✕ Cancel' : '🏭 Start Manufacturing'}
                            </button>
                          )}
                        </div>

                        {/* ── Inline Processing Form (All fields required) ── */}
                        {adminTab === 'processing' && activeActionHash === record.hash && (
                          <form onSubmit={e => handleStageSubmit(e, record.hash, 'processed', { ...processingForm, processedBy: loginForm.username || 'admin', processedDate: new Date().toISOString() })} className="inline-stage-form">
                            <h4>🧼 Processing Unit Form</h4>
                            <div className="form-grid-2">
                              <div className="form-group">
                                <label>Drying Method <span className="req-star">*</span></label>
                                <select value={processingForm.dryingMethod} onChange={e => setProcessingForm(p => ({...p, dryingMethod: e.target.value}))} required>
                                  <option>Sun drying</option><option>Hot air drying</option><option>Freeze drying (Lyophilization)</option><option>Shade drying</option><option>Vacuum dehydration</option><option>Solar dehydrator drying</option><option>Microwave-assisted drying</option>
                                </select>
                              </div>
                              <div className="form-group">
                                <label>Drying Duration (hours) <span className="req-star">*</span></label>
                                <input type="number" min="1" value={processingForm.dryingDuration} onChange={e => setProcessingForm(p => ({...p, dryingDuration: e.target.value}))} placeholder="e.g. 48" required/>
                              </div>
                              <div className="form-group">
                                <label>Drying Temperature (°C) <span className="req-star">*</span></label>
                                <input type="number" value={processingForm.dryingTemperature} onChange={e => setProcessingForm(p => ({...p, dryingTemperature: e.target.value}))} placeholder="e.g. 55" required/>
                              </div>
                              <div className="form-group">
                                <label>Cleaning Technique <span className="req-star">*</span></label>
                                <select value={processingForm.cleaningTechnique} onChange={e => setProcessingForm(p => ({...p, cleaningTechnique: e.target.value}))} required>
                                  <option>Washing & Air Sorting</option><option>Dry sieving</option><option>Water flotation</option><option>Manual picking</option><option>Machine sorting</option><option>Ultrasonic washing</option><option>Ozonated water rinse</option><option>Magnetic metal separation</option>
                                </select>
                              </div>
                              <div className="form-group">
                                <label>Grinding & Processing Type <span className="req-star">*</span></label>
                                <select value={processingForm.grindingRequired} onChange={e => setProcessingForm(p => ({...p, grindingRequired: e.target.value}))} required>
                                  <option>Whole raw dried herb</option><option>Coarse cut (20 mesh)</option><option>Fine powder (80 mesh)</option><option>Superfine powder (120 mesh)</option><option>Hydro-alcoholic extract</option><option>Aqueous extract</option><option>Cold-pressed oil</option><option>Essential oil steam distillation</option>
                                </select>
                              </div>
                              <div className="form-group">
                                <label>Target Moisture After Drying (%) <span className="req-star">*</span></label>
                                <input type="number" step="0.1" value={processingForm.moistureTarget} onChange={e => setProcessingForm(p => ({...p, moistureTarget: e.target.value}))} placeholder="e.g. 8" required/>
                              </div>
                              <div className="form-group">
                                <label>Final Dry Weight (kg) <span className="req-star">*</span></label>
                                <input type="number" step="0.01" value={processingForm.finalWeight} onChange={e => setProcessingForm(p => ({...p, finalWeight: e.target.value}))} placeholder="Weight after drying" required/>
                              </div>
                              <div className="form-group">
                                <label>Quality Inspector Name <span className="req-star">*</span></label>
                                <input type="text" value={processingForm.qualityInspector} onChange={e => setProcessingForm(p => ({...p, qualityInspector: e.target.value}))} placeholder="Inspector full name" required/>
                              </div>
                            </div>
                            <div className="form-group">
                              <label>Processing Notes</label>
                              <textarea value={processingForm.notes} onChange={e => setProcessingForm(p => ({...p, notes: e.target.value}))} placeholder="Any contaminants removed, observations…"/>
                            </div>
                            <button type="submit" className="primary-btn">✅ Complete Processing Phase</button>
                          </form>
                        )}

                        {/* ── Inline Lab Form (All fields required) ── */}
                        {adminTab === 'lab' && activeActionHash === record.hash && (
                          <form onSubmit={e => handleStageSubmit(e, record.hash, labForm.overallResult === 'approved' ? 'lab-approved' : 'lab-rejected', { ...labForm, testedBy: loginForm.username || 'admin', testDate: new Date().toISOString() })} className="inline-stage-form">
                            <h4>🔬 Laboratory Testing Parameters</h4>
                            <div className="form-grid-2">
                              <div className="form-group">
                                <label>Moisture Content (%) <span className="req-star">*</span></label>
                                <input type="number" step="0.1" value={labForm.moistureContent} onChange={e => setLabForm(p=>({...p, moistureContent:e.target.value}))} placeholder="e.g. 8.5" required/>
                              </div>
                              <div className="form-group">
                                <label>Total Ash Content (%) <span className="req-star">*</span></label>
                                <input type="number" step="0.1" value={labForm.ashContent} onChange={e => setLabForm(p=>({...p, ashContent:e.target.value}))} placeholder="e.g. 4.2" required/>
                              </div>
                              <div className="form-group">
                                <label>Heavy Metals Analysis (Pb, As, Cd, Hg) <span className="req-star">*</span></label>
                                <input type="text" value={labForm.heavyMetals} onChange={e => setLabForm(p=>({...p, heavyMetals:e.target.value}))} placeholder="e.g. Pb < 0.1 ppm, As < 0.05 ppm, Cd < 0.01 ppm" required/>
                              </div>
                              <div className="form-group">
                                <label>Total Microbial Aerobic Count (CFU/g) <span className="req-star">*</span></label>
                                <input type="text" value={labForm.microbialTotalPlate} onChange={e => setLabForm(p=>({...p, microbialTotalPlate:e.target.value}))} placeholder="e.g. < 10,000 CFU/g" required/>
                              </div>
                              <div className="form-group">
                                <label>Salmonella spp. <span className="req-star">*</span></label>
                                <select value={labForm.microbialSalmonella} onChange={e => setLabForm(p=>({...p, microbialSalmonella:e.target.value}))} required>
                                  <option>Absent</option><option>Present</option>
                                </select>
                              </div>
                              <div className="form-group">
                                <label>E. Coli <span className="req-star">*</span></label>
                                <select value={labForm.microbialEcoli} onChange={e => setLabForm(p=>({...p, microbialEcoli:e.target.value}))} required>
                                  <option>Absent</option><option>Present</option>
                                </select>
                              </div>
                              <div className="form-group">
                                <label>Yeast & Mould Count <span className="req-star">*</span></label>
                                <input type="text" value={labForm.yeastMould} onChange={e => setLabForm(p=>({...p, yeastMould:e.target.value}))} placeholder="e.g. < 100 CFU/g" required/>
                              </div>
                              <div className="form-group">
                                <label>Pesticide Residue Analysis <span className="req-star">*</span></label>
                                <input type="text" value={labForm.pesticideResidue} onChange={e => setLabForm(p=>({...p, pesticideResidue:e.target.value}))} placeholder="None detected / Organochlorines < 0.01 ppm" required/>
                              </div>
                              <div className="form-group">
                                <label>Active Phytochemical Marker <span className="req-star">*</span></label>
                                <input type="text" value={labForm.activeCompoundName} onChange={e => setLabForm(p=>({...p, activeCompoundName:e.target.value}))} placeholder="e.g. Withanolides, Curcumin, Bacosides" required/>
                              </div>
                              <div className="form-group">
                                <label>Active Compound Assay (%) <span className="req-star">*</span></label>
                                <input type="text" value={labForm.activeCompoundValue} onChange={e => setLabForm(p=>({...p, activeCompoundValue:e.target.value}))} placeholder="e.g. 5.2%" required/>
                              </div>
                              <div className="form-group">
                                <label>Foreign Matter (%) <span className="req-star">*</span></label>
                                <input type="number" step="0.01" value={labForm.foreignMatter} onChange={e => setLabForm(p=>({...p, foreignMatter:e.target.value}))} placeholder="e.g. 0.3" required/>
                              </div>
                              <div className="form-group">
                                <label>Extractive Value (%) <span className="req-star">*</span></label>
                                <input type="text" value={labForm.extractiveValue} onChange={e => setLabForm(p=>({...p, extractiveValue:e.target.value}))} placeholder="e.g. Water Soluble > 22%" required/>
                              </div>
                              <div className="form-group">
                                <label>Lab Certificate Number <span className="req-star">*</span></label>
                                <input type="text" value={labForm.labCertId} onChange={e => setLabForm(p=>({...p, labCertId:e.target.value}))} placeholder="e.g. LAB-2025-00123" required/>
                              </div>
                              <div className="form-group">
                                <label>Overall Verdict <span className="req-star">*</span></label>
                                <select value={labForm.overallResult} onChange={e => setLabForm(p=>({...p, overallResult:e.target.value}))} required>
                                  <option value="approved">✅ Approved (Meets all pharmacopoeia standards)</option>
                                  <option value="rejected">❌ Rejected (Failed quality parameters)</option>
                                </select>
                              </div>
                            </div>
                            <div className="form-group">
                              <label>Lab Notes & Remarks {labForm.overallResult === 'rejected' && <span className="req-star">* (Required for rejection)</span>}</label>
                              <textarea value={labForm.notes} onChange={e => setLabForm(p=>({...p, notes:e.target.value}))} placeholder="Observations, test methodology reference, failure reasons if rejected…" required={labForm.overallResult === 'rejected'}/>
                            </div>
                            <button type="submit" className="primary-btn">🔬 Submit Lab Results</button>
                          </form>
                        )}

                        {/* ── Inline Manufacturing Form (All fields required) ── */}
                        {adminTab === 'manufacturing' && activeActionHash === record.hash && (
                          <form onSubmit={e => handleStageSubmit(e, record.hash, 'completed', { ...manufacturingForm, manufacturedBy: loginForm.username || 'admin', manufacturingDate: new Date().toISOString(), qrCodeId: `QR_${Date.now()}` })} className="inline-stage-form">
                            <h4>📦 Manufacturing & Packaging</h4>
                            <div className="form-grid-2">
                              <div className="form-group">
                                <label>Batch Number <span className="req-star">*</span></label>
                                <input type="text" value={manufacturingForm.batchNumber} onChange={e => setManufacturingForm(p=>({...p, batchNumber:e.target.value}))} required/>
                              </div>
                              <div className="form-group">
                                <label>Packaging Type <span className="req-star">*</span></label>
                                <select value={manufacturingForm.packagingType} onChange={e => setManufacturingForm(p=>({...p, packagingType:e.target.value}))} required>
                                  <option>Airtight glass bottle</option><option>Organic kraft pouch</option><option>Sterilized blister pack</option><option>Vacuum sealed bag</option><option>HDPE container</option><option>Amber glass tincture bottle</option>
                                </select>
                              </div>
                              <div className="form-group">
                                <label>Final Product Weight (kg) <span className="req-star">*</span></label>
                                <input type="number" step="0.01" value={manufacturingForm.finalProductWeight} onChange={e => setManufacturingForm(p=>({...p, finalProductWeight:e.target.value}))} required/>
                              </div>
                              <div className="form-group">
                                <label>Expiry Date <span className="req-star">*</span></label>
                                <input type="date" value={manufacturingForm.expiryDate} onChange={e => setManufacturingForm(p=>({...p, expiryDate:e.target.value}))} required/>
                              </div>
                              <div className="form-group">
                                <label>Storage Conditions <span className="req-star">*</span></label>
                                <select value={manufacturingForm.storageConditions} onChange={e => setManufacturingForm(p=>({...p, storageConditions:e.target.value}))} required>
                                  <option>Cool &amp; Dry</option><option>Refrigerated (2-8°C)</option><option>Room Temperature</option><option>Frozen (-20°C)</option><option>Shielded from Light</option>
                                </select>
                              </div>
                            </div>
                            <div className="form-group">
                              <label>Manufacturing Notes</label>
                              <textarea value={manufacturingForm.notes} onChange={e => setManufacturingForm(p=>({...p, notes:e.target.value}))} placeholder="Sealing details, label info…"/>
                            </div>
                            <button type="submit" className="primary-btn">🏭 Complete & Generate QR</button>
                          </form>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Manufactured Records Tab ── */}
            {adminTab === 'manufactured' && (
              <div className="manufactured-section">
                {adminLoading ? (
                  <div className="loading-box"><div className="spinner"/><p>Loading…</p></div>
                ) : getFilteredRecords().length === 0 ? (
                  <div className="empty-state glass-panel">
                    <div className="empty-icon">📦</div>
                    <h4>No completed manufactured records yet</h4>
                  </div>
                ) : (
                  <div className="manufactured-grid">
                    {getFilteredRecords().map(record => (
                      <div key={record.hash} className="manufactured-card glass-panel">
                        <div className="mfr-card-header">
                          <h3>{record.geojson?.properties?.herbName || 'Unknown Herb'}</h3>
                          <span className="success-badge-sm">✅ Manufactured</span>
                        </div>
                        <div className="mfr-meta">
                          <div className="mfr-pid">
                            <span className="pid-label">Product ID</span>
                            <span className="pid-value">{record.productId}</span>
                            <button className="copy-btn" onClick={() => navigator.clipboard.writeText(record.productId)}>📋</button>
                          </div>
                          <div className="mfr-details">
                            <p><strong>Batch:</strong> {record.manufacturing?.batchNumber}</p>
                            <p><strong>Packaging:</strong> {record.manufacturing?.packagingType}</p>
                            <p><strong>Weight:</strong> {record.manufacturing?.finalProductWeight} kg</p>
                            <p><strong>Expiry:</strong> {record.manufacturing?.expiryDate}</p>
                            <p><strong>Storage:</strong> {record.manufacturing?.storageConditions}</p>
                          </div>
                        </div>

                        {/* QR Code */}
                        <div className="mfr-qr-section">
                          <div className="qr-code-wrapper">
                            <img src={qrUrl(record)} alt="Product QR Code" className="mfr-qr-img" loading="lazy" onClick={() => setPreviewImage(qrUrl(record))}/>
                            <span className="qr-helper-text">Scan to verify</span>
                          </div>
                          <div className="mfr-qr-actions">
                            <button onClick={() => downloadQRImage(qrUrl(record), `${record.productId}-QR.png`)} className="secondary-btn btn-sm">
                              ⬇️ Download QR
                            </button>
                            <button className="primary-btn btn-sm" onClick={() => { setSearchQuery(record.productId); handleVerify(null, record.productId); }}>
                              📄 View Certificate
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Rejection Reason Modal */}
            {rejectingHash && (
              <div className="modal-backdrop" onClick={() => setRejectingHash(null)}>
                <div className="modal-box glass-panel animate-fade-in" onClick={e => e.stopPropagation()}>
                  <h3>Reject Certification Request</h3>
                  <p>Provide a detailed reason for rejection to the farmer.</p>
                  <form onSubmit={handleReject}>
                    <div className="form-group">
                      <textarea required placeholder="e.g. Failed quality standards, GPS mismatch, suspicious cultivation data, high moisture level..." value={rejectReason} onChange={e => setRejectReason(e.target.value)}/>
                    </div>
                    <div className="modal-buttons">
                      <button type="button" onClick={() => { setRejectingHash(null); setRejectReason(''); }} className="secondary-btn">Cancel</button>
                      <button type="submit" className="danger-btn">Submit Rejection</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════ VERIFICATION VIEW ══════════════ */}
        {currentView === 'verify' && verificationResult && (
          <div className="verify-view animate-fade-in" ref={printRef}>
            {/* Print-only header */}
            <div className="print-only-header">
              <h1>AyurChain — Official Certificate of Compliance</h1>
              <p>Cryptographic Botanical Supply Chain Verification & Quality Control Ledger</p>
            </div>

            <div className="certificate-card glass-panel">
              {/* Certificate Header */}
              <div className="cert-header">
                <div className="cert-seal-area">
                  {verificationResult.status === 'completed' || verificationResult.certified ? (
                    <div className="seal certified-seal">
                      <span className="seal-main">VERIFIED</span>
                      <span className="seal-sub">AYURCHAIN SECURE</span>
                    </div>
                  ) : verificationResult.rejected ? (
                    <div className="seal rejected-seal">
                      <span className="seal-main">REJECTED</span>
                      <span className="seal-sub">NOT COMPLIANT</span>
                    </div>
                  ) : (
                    <div className="seal pending-seal">
                      <span className="seal-main">PENDING</span>
                      <span className="seal-sub">IN REVIEW</span>
                    </div>
                  )}
                </div>
                <div className="cert-title-area">
                  <h2>CERTIFICATE OF COMPLIANCE</h2>
                  <p className="cert-subtitle">AyurChain Cryptographic Herb Integrity Registry</p>
                  <div className="cert-id-row">
                    <span className="cert-pid">Product ID: <strong>{verificationResult.productId || '—'}</strong></span>
                  </div>
                </div>
              </div>

              <hr className="cert-divider"/>

              {/* Core Fields */}
              <div className="cert-fields-grid">
                {verificationResult.geojson?.properties && (
                  <>
                    <div className="cert-field">
                      <span className="cf-label">BOTANICAL NAME</span>
                      <span className="cf-value herb-name-cert">{verificationResult.geojson.properties.herbName || verificationResult.geojson.properties.name}</span>
                    </div>
                    <div className="cert-field">
                      <span className="cf-label">CERTIFICATION STATUS</span>
                      <span className="cf-value" style={{ color: stageBadgeColor(verificationResult.status), fontWeight:'700' }}>
                        {verificationResult.status?.replace(/_/g,' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="cert-field">
                      <span className="cf-label">CULTIVATION DATE</span>
                      <span className="cf-value">{verificationResult.geojson.properties.cultivationDate}</span>
                    </div>
                    <div className="cert-field">
                      <span className="cf-label">GPS COORDINATES</span>
                      <span className="cf-value code-font">{verificationResult.geojson.geometry?.coordinates?.join(', ')}</span>
                    </div>
                    <div className="cert-field">
                      <span className="cf-label">FARMER ID</span>
                      <span className="cf-value">{verificationResult.farmerId || verificationResult.farmer}</span>
                    </div>
                    <div className="cert-field">
                      <span className="cf-label">BLOCKCHAIN HASH</span>
                      <span className="cf-value code-font small-text">{verificationResult.hash}</span>
                    </div>
                  </>
                )}
                {(verificationResult.reason || verificationResult.rejectedReason) && (
                  <div className="cert-field rejection-field">
                    <span className="cf-label">REJECTION REASON</span>
                    <span className="cf-value">{verificationResult.reason || verificationResult.rejectedReason}</span>
                  </div>
                )}
              </div>

              <hr className="cert-divider"/>

              {/* Supply Chain Timeline */}
              <div className="timeline-section">
                <h3>⛓️ Supply Chain Audit Trail</h3>
                <div className="timeline">
                  {[
                    {
                      icon: '🌾', label: 'Stage 1: Organic Cultivation',
                      done: true,
                      desc: `Registered by farmer ${verificationResult.farmerId || ''}. Geotagged coordinates locked on distributed ledger.`
                    },
                    {
                      icon: '🛡️', label: 'Stage 2: Admin Certification',
                      done: verificationResult.certified || stagePassed(verificationResult, 'admin_approved'),
                      desc: verificationResult.certified ? 'Approved and anchored on blockchain by administrator.' : verificationResult.rejected ? `Rejected: ${verificationResult.reason || verificationResult.rejectedReason}` : 'Awaiting administrative review.'
                    },
                    {
                      icon: '🧼', label: 'Stage 3: Processing Unit',
                      done: !!verificationResult.processing,
                      desc: verificationResult.processing
                        ? `Method: ${verificationResult.processing.dryingMethod} | Temp: ${verificationResult.processing.dryingTemperature}°C (${verificationResult.processing.dryingDuration}h) | Cleaning: ${verificationResult.processing.cleaningTechnique} | Processing: ${verificationResult.processing.grindingRequired} | Final Weight: ${verificationResult.processing.finalWeight} kg`
                        : 'Awaiting processing unit.'
                    },
                    {
                      icon: '🔬', label: 'Stage 4: Laboratory Testing',
                      done: stagePassed(verificationResult, 'lab-approved'),
                      desc: verificationResult.labTesting
                        ? `Moisture: ${verificationResult.labTesting.moistureContent}% | Ash: ${verificationResult.labTesting.ashContent}% | Heavy Metals: ${verificationResult.labTesting.heavyMetals} | Microbial: ${verificationResult.labTesting.microbialTotalPlate} | Pesticides: ${verificationResult.labTesting.pesticideResidue} | Marker ${verificationResult.labTesting.activeCompoundName}: ${verificationResult.labTesting.activeCompoundValue} | Lab Cert: ${verificationResult.labTesting.labCertId} | Verdict: ${verificationResult.labTesting.overallResult?.toUpperCase()}`
                        : 'Awaiting laboratory analysis.'
                    },
                    {
                      icon: '📦', label: 'Stage 5: Manufacturing & Packaging',
                      done: verificationResult.status === 'completed',
                      desc: verificationResult.manufacturing
                        ? `Batch: ${verificationResult.manufacturing.batchNumber} | Packaging: ${verificationResult.manufacturing.packagingType} | Weight: ${verificationResult.manufacturing.finalProductWeight} kg | Expiry: ${verificationResult.manufacturing.expiryDate} | Storage: ${verificationResult.manufacturing.storageConditions}`
                        : 'Awaiting lab clearance.'
                    }
                  ].map(({ icon, label, done, desc }) => (
                    <div key={label} className={`timeline-step ${done ? 'done' : 'pending'}`}>
                      <div className="timeline-dot">{done ? '✅' : '⏳'}</div>
                      <div className="timeline-content">
                        <div className="timeline-label">{icon} {label}</div>
                        <div className="timeline-desc">{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Digital Signatures & Cryptographic Stamps */}
              <div className="cert-signatures">
                <div className="sig-block">
                  <div className="digital-sig-wrapper">
                    <svg className="sig-svg" viewBox="0 0 160 50" fill="none">
                      <path d="M10 35 C 25 10, 30 45, 45 15 C 55 5, 50 35, 65 25 C 75 15, 80 40, 95 20 C 105 10, 110 35, 125 15 C 135 25, 140 10, 150 25" stroke="#047857" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
                      <path d="M20 38 Q 70 48 140 36" stroke="#047857" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 2"/>
                    </svg>
                    <span className="sig-badge">✓ DIGITALLY SIGNED</span>
                  </div>
                  <div className="sig-line"></div>
                  <p className="sig-name">Dr. A. Sharma, Ph.D.</p>
                  <p className="sig-title">Director of Quality Assurance</p>
                  <p className="sig-meta">ID: QA-88421 · RSA-2048</p>
                </div>

                <div className="digital-sig-wrapper cert-stamp-center">
                  <div className="official-stamp-seal">
                    <span className="stamp-top">AYURCHAIN</span>
                    <span className="stamp-center">SECURE</span>
                    <span className="stamp-bottom">VERIFIED</span>
                  </div>
                </div>

                <div className="sig-block">
                  <div className="digital-sig-wrapper">
                    <svg className="sig-svg" viewBox="0 0 160 50" fill="none">
                      <path d="M12 28 C 30 8, 20 42, 50 18 C 60 10, 70 38, 85 15 C 95 30, 115 10, 130 28 C 140 18, 145 35, 152 22" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
                      <path d="M15 40 Q 80 46 145 38" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <span className="sig-badge blue-sig">✓ LEDGER VERIFIED</span>
                  </div>
                  <div className="sig-line"></div>
                  <p className="sig-name">AyurChain Cryptographic Core</p>
                  <p className="sig-title">Immutable Ledger Protocol</p>
                  <p className="sig-meta">Hash: {verificationResult.hash?.slice(0, 14)}…</p>
                </div>
              </div>

              <hr className="cert-divider"/>
              <p className="cert-footer">This cryptographic record is permanently stored on the blockchain &amp; IPFS. Any tampering is cryptographically detectable.</p>

              {/* QR if completed */}
              {verificationResult.status === 'completed' && (
                <div className="cert-qr-footer">
                  <div className="qr-code-wrapper">
                    <img src={qrUrl(verificationResult)} alt="Certificate QR" className="receipt-qr" onClick={() => setPreviewImage(qrUrl(verificationResult))}/>
                    <span className="qr-helper-text">Scan to verify online</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons (no-print) */}
            <div className="verify-actions no-print">
              <button onClick={() => setCurrentView(userRole ? `${userRole}_dashboard` : 'login')} className="secondary-btn">
                ← Back to Portal
              </button>
              {userRole === 'admin' && (
                <button onClick={() => downloadQRImage(qrUrl(verificationResult), `${verificationResult.productId || 'AyurChain'}-QR.png`)} className="secondary-btn">
                  ⬇️ Download QR Image
                </button>
              )}
              <button onClick={handlePrintCertificate} className="primary-btn">
                🖨️ Download / Print PDF
              </button>
            </div>
          </div>
        )}

      </main>

      {/* ─── LIGHTBOX IMAGE PREVIEW MODAL ─── */}
      {previewImage && (
        <div className="image-preview-backdrop" onClick={() => setPreviewImage(null)}>
          <div className="image-preview-box animate-fade-in" onClick={e => e.stopPropagation()}>
            <button className="close-preview-btn" onClick={() => setPreviewImage(null)} title="Close preview">✕</button>
            <img src={previewImage} alt="Enlarged view" className="enlarged-preview-img" />
            <div className="preview-actions no-print">
              <a href={previewImage} download="ayurchain-image.png" target="_blank" rel="noreferrer" className="secondary-btn btn-sm">
                ⬇️ Open / Download Image
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ─── FOOTER ─── */}
      <footer className="main-footer no-print">
        <p>© 2025 AyurChain Ledger Solutions · Premium Herb Blockchain Verification</p>
      </footer>
    </div>
  );
}

export default App;
