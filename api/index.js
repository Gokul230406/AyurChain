import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { keccak256, toUtf8Bytes } from 'ethers';
import crypto from 'crypto';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const router = express.Router();

/* ─── MongoDB connection caching (critical for serverless) ─── */
let isConnected = false;
async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) return;
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI environment variable is not set');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  isConnected = true;
  console.log('Connected to MongoDB');
}

/* ─── Schema & Model ─── */
const recordSchema = new mongoose.Schema({
  productId:      { type: String, unique: true, sparse: true },
  farmerId:       { type: String, default: 'farmer1' },
  farmer:         String,
  geojson:        Object,
  ipfsCid:        String,
  hash:           String,
  certified:      { type: Boolean, default: false },
  rejected:       { type: Boolean, default: false },
  rejectedReason: { type: String,  default: '' },
  currentStage:   { type: String,  default: 'received' },
  processing:     { type: Object,  default: null },
  labTesting:     { type: Object,  default: null },
  manufacturing:  { type: Object,  default: null },
  createdAt:      { type: Date,    default: Date.now }
});
// Prevent model re-registration in serverless warm starts
const Record = mongoose.models.Record || mongoose.model('Record', recordSchema);

/* ─── Helpers ─── */
function generateProductId() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randPart = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `AYR-${datePart}-${randPart}`;
}

// Mock IPFS (no real IPFS node on Vercel)
const ipfs = {
  add: async (data) => {
    const h = crypto.createHash('sha256')
      .update(typeof data === 'string' ? data : JSON.stringify(data))
      .digest('hex');
    return { cid: { toString: () => `ipfs-${h.substring(0, 16)}` } };
  }
};

/* ─────────────────────────────────────────────
   FARMER ROUTES
───────────────────────────────────────────── */

router.post('/farmer/submit', async (req, res) => {
  try {
    await connectDB();
    const { geojson, farmerId } = req.body;
    if (!geojson) return res.status(400).json({ error: 'Missing geojson data' });
    if (!geojson.type || !geojson.properties || !geojson.geometry)
      return res.status(400).json({ error: 'Invalid geojson format' });

    const jsonString = JSON.stringify(geojson);
    const hash = keccak256(toUtf8Bytes(jsonString));

    let ipfsCid;
    try {
      const result = await ipfs.add(jsonString);
      ipfsCid = result.cid.toString();
    } catch {
      ipfsCid = `fallback-${hash.substring(2, 14)}`;
    }

    const productId = generateProductId();
    const farmerIdVal = farmerId || geojson.properties?.farmerId || 'farmer1';

    const record = new Record({ productId, farmerId: farmerIdVal, farmer: farmerIdVal, geojson, ipfsCid, hash });
    await record.save();

    return res.status(200).json({ success: true, hash, cid: ipfsCid, productId });
  } catch (err) {
    console.error('Error in /farmer/submit:', err);
    return res.status(500).json({ error: err.message });
  }
});

router.get('/farmer/records', async (req, res) => {
  try {
    await connectDB();
    const { farmerId } = req.query;
    if (!farmerId) return res.status(400).json({ error: 'farmerId required' });
    const records = await Record.find({ farmerId }).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/farmer/status', async (req, res) => {
  try {
    await connectDB();
    const { hash, productId } = req.query;
    if (!hash && !productId) return res.status(400).json({ error: 'hash or productId required' });

    const rec = hash
      ? await Record.findOne({ hash })
      : await Record.findOne({ productId });

    if (!rec) return res.json({ status: 'unknown' });

    return res.json({
      status:        rec.currentStage,
      certified:     rec.certified,
      rejected:      rec.rejected,
      reason:        rec.rejectedReason,
      farmer:        rec.farmer,
      farmerId:      rec.farmerId,
      productId:     rec.productId,
      geojson:       rec.geojson,
      ipfsCid:       rec.ipfsCid,
      hash:          rec.hash,
      processing:    rec.processing,
      labTesting:    rec.labTesting,
      manufacturing: rec.manufacturing,
      createdAt:     rec.createdAt
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   ADMIN ROUTES
───────────────────────────────────────────── */

router.get('/admin/records', async (req, res) => {
  try {
    await connectDB();
    const records = await Record.find({}).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/manufactured', async (req, res) => {
  try {
    await connectDB();
    const records = await Record.find({ currentStage: 'completed' }).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/pending', async (_, res) => {
  try {
    await connectDB();
    const records = await Record.find({ certified: false, rejected: false }).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/certify', async (req, res) => {
  try {
    await connectDB();
    const { hash } = req.body;
    await Record.updateOne({ hash }, { $set: { certified: true, currentStage: 'admin_approved' } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/reject', async (req, res) => {
  try {
    await connectDB();
    const { hash, reason } = req.body || {};
    if (!hash) return res.status(400).json({ error: 'hash required' });
    await Record.updateOne({ hash }, { $set: { rejected: true, currentStage: 'admin_rejected', rejectedReason: reason || '' } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/update-stage', async (req, res) => {
  try {
    await connectDB();
    const { hash, stage, updateData } = req.body;
    if (!hash || !stage) return res.status(400).json({ error: 'Missing hash or stage' });

    const record = await Record.findOne({ hash });
    if (!record) return res.status(404).json({ error: 'Record not found' });

    record.currentStage = stage;
    if (stage === 'processed') {
      record.processing = updateData;
    } else if (stage === 'lab-approved' || stage === 'lab-rejected') {
      record.labTesting = updateData;
    } else if (stage === 'completed') {
      record.manufacturing = updateData;
    }
    record.markModified('processing');
    record.markModified('labTesting');
    record.markModified('manufacturing');
    await record.save();
    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── Root / Status ─── */
router.get('/', (req, res) => {
  res.json({
    message: 'AyurChain Farm Certification API',
    status: 'running',
    version: '2.0.0',
    endpoints: {
      'POST /farmer/submit':                   'Submit herb certification',
      'GET  /farmer/records?farmerId=':        'Farmer herb history',
      'GET  /farmer/status?hash=|productId=':  'Check cert status',
      'GET  /admin/records':                   'All records',
      'GET  /admin/manufactured':              'Completed records',
      'POST /admin/certify':                   'Certify record',
      'POST /admin/reject':                    'Reject record',
      'POST /admin/update-stage':              'Advance pipeline stage'
    }
  });
});

app.use('/api', router);
app.use('/', router);

export default app;
