import express from "express";
import mongoose from "mongoose";
import { create } from "ipfs-http-client";
import { keccak256, toUtf8Bytes, JsonRpcProvider, Contract } from "ethers";
import fs from "fs";
import FarmCert from "./artifacts/contracts/FarmCert.sol/FarmCert.json" assert { type: "json" };

const app = express();
app.use(express.json());

// Mongo Schema
const RecordSchema = new mongoose.Schema({
  farmer: String,
  geojson: Object,
  ipfsCid: String,
  hash: String,
  certified: { type: Boolean, default: false },
});
const Record = mongoose.model("Record", RecordSchema);

// Mongo
await mongoose.connect("mongodb://localhost:27017/farmdb");

// IPFS (private swarm or default localhost)
const ipfs = create({ url: "http://127.0.0.1:5001" });

// Blockchain setup (Hardhat localhost)
const provider = new JsonRpcProvider("http://127.0.0.1:8545");
const [admin, farmer] = await provider.listAccounts();

const contractAddress = fs.readFileSync("farmCertAddress.txt", "utf8");
const contract = new Contract(contractAddress, FarmCert.abi, provider.getSigner());

// Farmer submits record
app.post("/farmer/submit", async (req, res) => {
  const { geojson } = req.body;

  // Upload to IPFS
  const { cid } = await ipfs.add(JSON.stringify(geojson));

  // Hash
  const hash = keccak256(toUtf8Bytes(JSON.stringify(geojson)));

  // Save to Mongo
  await Record.create({ farmer, geojson, ipfsCid: cid.toString(), hash });

  // Anchor to blockchain
  const tx = await contract.submitRecord(hash, cid.toString());
  await tx.wait();

  res.json({ msg: "Record submitted", hash, cid: cid.toString() });
});

// Admin certifies
app.post("/admin/certify", async (req, res) => {
  const { hash } = req.body;

  const tx = await contract.certifyRecord(hash);
  await tx.wait();

  await Record.updateOne({ hash }, { $set: { certified: true } });

  res.json({ msg: "Record certified", hash });
});

app.listen(3000, () => console.log("Server running on 3000"));
