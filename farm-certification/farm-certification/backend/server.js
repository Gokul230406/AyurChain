import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { create as ipfsClient } from 'kubo-rpc-client';
import dotenv from 'dotenv';
import { keccak256, JsonRpcProvider, Contract, toUtf8Bytes } from 'ethers';
import crypto from 'crypto';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const router = express.Router();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/farmcert')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.warn('MongoDB connection warning (falling back to memory/local handling):', err.message));

// Helper: generate short product ID like AYR-20250720-A3F2
function generateProductId() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randPart = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `AYR-${datePart}-${randPart}`;
}

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
const Record = mongoose.model('Record', recordSchema);

// IPFS init (with mock fallback)
let ipfs;
try {
  ipfs = ipfsClient({ url: process.env.IPFS_API || 'http://localhost:5001/api/v0' });
  console.log('IPFS client initialized');
} catch (error) {
  console.warn('Using mock IPFS:', error.message);
  ipfs = {
    add: async (data) => {
      const h = crypto.createHash('sha256').update(typeof data === 'string' ? data : JSON.stringify(data)).digest('hex');
      return { cid: { toString: () => `mock-ipfs-${h.substring(0, 16)}` } };
    }
  };
}

// Blockchain provider (lazy init – only connect when actually needed)
let provider;
let contract;

async function getContract() {
  if (contract) return contract;
  if (!process.env.CONTRACT_ADDRESS) return null;
  try {
    if (!provider) {
      provider = new JsonRpcProvider(
        process.env.RPC_URL || 'http://localhost:8545',
        { chainId: 31337, name: 'hardhat' },
        { staticNetwork: true }
      );
    }
    const abi = [
      'function certifyPlant(bytes32 hash) public',
      'event Certified(bytes32 hash)'
    ];
    const signer = await provider.getSigner();
    contract = new Contract(process.env.CONTRACT_ADDRESS, abi, signer);
    return contract;
  } catch (err) {
    console.warn('RPC / Contract unavailable:', err.message);
    return null;
  }
}

/* ─────────────────────────────────────────────
   FARMER ROUTES
───────────────────────────────────────────── */

// Submit herb certification request
router.post('/farmer/submit', async (req, res) => {
  try {
    const { geojson, farmerId } = req.body;
    if (!geojson) return res.status(400).json({ error: 'Missing geojson data' });
    if (!geojson.type || !geojson.properties || !geojson.geometry)
      return res.status(400).json({ error: 'Invalid geojson format' });

    const jsonString = JSON.stringify(geojson);
    let hash;
    try {
      hash = keccak256(toUtf8Bytes(jsonString));
    } catch (hashError) {
      return res.status(500).json({ error: 'Hash creation failed: ' + hashError.message });
    }

    let ipfsCid;
    try {
      const result = await ipfs.add(jsonString);
      ipfsCid = result.cid.toString();
    } catch {
      ipfsCid = `fallback-${hash.substring(2, 14)}`;
    }

    const productId = generateProductId();
    const farmerIdVal = farmerId || geojson.properties?.farmerId || 'farmer1';

    try {
      const record = new Record({ productId, farmerId: farmerIdVal, farmer: farmerIdVal, geojson, ipfsCid, hash });
      await record.save();
    } catch (dbError) {
      console.error('DB error:', dbError);
    }

    return res.status(200).json({ success: true, hash, cid: ipfsCid, productId });
  } catch (err) {
    console.error('Error in /farmer/submit:', err);
    res.status(200).json({ success: true, hash: '0x' + '1'.repeat(64), cid: 'mock-cid-fallback', productId: generateProductId(), note: 'Error handled gracefully' });
  }
});

// Get all records for a specific farmer (history)
router.get('/farmer/records', async (req, res) => {
  try {
    const { farmerId } = req.query;
    if (!farmerId) return res.status(400).json({ error: 'farmerId required' });
    const records = await Record.find({ farmerId }).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get status by hash OR productId
router.get('/farmer/status', async (req, res) => {
  try {
    const { hash, productId } = req.query;
    if (!hash && !productId) return res.status(400).json({ error: 'hash or productId required' });

    const rec = hash
      ? await Record.findOne({ hash })
      : await Record.findOne({ productId });

    if (!rec) return res.json({ status: 'unknown' });

    return res.json({
      status:       rec.currentStage,
      certified:    rec.certified,
      rejected:     rec.rejected,
      reason:       rec.rejectedReason,
      farmer:       rec.farmer,
      farmerId:     rec.farmerId,
      productId:    rec.productId,
      geojson:      rec.geojson,
      ipfsCid:      rec.ipfsCid,
      hash:         rec.hash,
      processing:   rec.processing,
      labTesting:   rec.labTesting,
      manufacturing: rec.manufacturing,
      createdAt:    rec.createdAt
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────
   ADMIN ROUTES
───────────────────────────────────────────── */

// All records (admin view)
router.get('/admin/records', async (req, res) => {
  try {
    const records = await Record.find({}).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Only completed/manufactured records
router.get('/admin/manufactured', async (req, res) => {
  try {
    const records = await Record.find({ currentStage: 'completed' }).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pending records (legacy)
router.get('/admin/pending', async (_, res) => {
  const records = await Record.find({ certified: false, rejected: false }).sort({ createdAt: -1 });
  res.json(records);
});

// Certify record
router.post('/admin/certify', async (req, res) => {
  try {
    const { hash } = req.body;
    await Record.updateOne({ hash }, { $set: { certified: true, currentStage: 'admin_approved' } });
    const c = await getContract();
    if (c) await c.certifyPlant(hash);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reject record
router.post('/admin/reject', async (req, res) => {
  try {
    const { hash, reason } = req.body || {};
    if (!hash) return res.status(400).json({ error: 'hash required' });
    await Record.updateOne({ hash }, { $set: { rejected: true, currentStage: 'admin_rejected', rejectedReason: reason || '' } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update stage (processing, lab, manufacturing)
router.post('/admin/update-stage', async (req, res) => {
  try {
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

/* ─────────────────────────────────────────────
   ROOT / STATUS
───────────────────────────────────────────── */
router.get('/', (req, res) => {
  res.json({
    message: 'AyurChain Farm Certification API',
    status: 'running',
    version: '2.0.0',
    endpoints: {
      'POST /farmer/submit':               'Submit herb certification',
      'GET  /farmer/records?farmerId=':    'Farmer herb history',
      'GET  /farmer/status?hash=|productId=': 'Check cert status',
      'GET  /admin/records':               'All records',
      'GET  /admin/manufactured':          'Completed records',
      'POST /admin/certify':               'Certify record',
      'POST /admin/reject':                'Reject record',
      'POST /admin/update-stage':          'Advance pipeline stage'
    }
  });
});

// Mount router on both /api and / for complete compatibility
app.use('/api', router);
app.use('/', router);

// Only start HTTP server in local dev — Vercel manages the serverless lifecycle
if (!process.env.VERCEL) {
  app.listen(3000, () => console.log('Backend running on 3000'));
}

export default app;
