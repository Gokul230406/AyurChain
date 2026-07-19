import mongoose from "mongoose"

const FolderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    herbName: { type: String, required: true },
    quantity: { type: Number, required: true },
    geotaggedImage: { type: String },
    location: { type: String },
    farmerName: { type: String },
    collectionDate: { type: String },
    additionalNotes: { type: String, default: "" },
    status: { type: String, default: "received" },
    currentStage: { type: String, default: "received" },
    createdAt: { type: String },
    approvedBy: { type: String, default: null },
    approvedAt: { type: String, default: null },
    processing: { type: Object, default: null },
    labTesting: { type: Object, default: null },
    manufacturing: { type: Object, default: null },
    rejectedBy: { type: String, default: null },
    rejectedAt: { type: String, default: null },
    rejectionReason: { type: String, default: null },
  },
  {
    timestamps: true,
  }
)

export default mongoose.models.Folder || mongoose.model("Folder", FolderSchema)
