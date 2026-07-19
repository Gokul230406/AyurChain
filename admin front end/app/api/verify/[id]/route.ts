import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "../../../../lib/db"
import Folder from "../../../../lib/models/Folder"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const herbId = params.id
    await connectToDatabase()

    // Query folder by ID or QR code ID
    const folder = await Folder.findOne({
      $or: [
        { id: herbId },
        { "manufacturing.qrCodeId": herbId }
      ]
    })

    if (!folder) {
      return NextResponse.json({ message: "Herb not found" }, { status: 404 })
    }

    // Map DB Folder to verification details format
    return NextResponse.json({
      _id: folder._id,
      id: folder.id,
      herbName: folder.herbName,
      farmerName: folder.farmerName || "Herb Collector",
      farmLocation: folder.location || "N/A",
      harvestDate: folder.collectionDate || folder.createdAt,
      initialWeight: folder.quantity,
      status: folder.status,
      processing: folder.processing ? {
        dryingMethod: folder.processing.dryingMethod || "N/A",
        dryingDuration: Number(folder.processing.dryingDuration) || 0,
        cleaningSteps: folder.processing.cleaningSteps ? [folder.processing.cleaningSteps] : [],
        finalWeight: Number(folder.processing.finalWeight) || folder.quantity,
        processedDate: folder.processing.processedDate || new Date().toISOString(),
        notes: folder.processing.notes || "",
      } : null,
      labTesting: folder.labTesting ? {
        moistureContent: Number(folder.labTesting.moistureContent) || 0,
        heavyMetals: folder.labTesting.heavyMetals || "Safe",
        microbialCount: Number(folder.labTesting.microbialCount) || 0,
        pesticideResidue: folder.labTesting.pesticideResidue || "Safe",
        testResult: folder.labTesting.overallResult || "approved",
        testDate: folder.labTesting.testDate || new Date().toISOString(),
        certificateUrl: folder.labTesting.certificateUrl || "",
      } : null,
      manufacturing: folder.manufacturing ? {
        batchNumber: folder.manufacturing.batchNumber || "",
        finalProductWeight: Number(folder.manufacturing.finalProductWeight) || folder.quantity,
        packagingType: folder.manufacturing.packagingType || "N/A",
        expiryDate: folder.manufacturing.expiryDate || "",
        manufacturedDate: folder.manufacturing.manufacturingDate || new Date().toISOString(),
      } : null,
    })
  } catch (error: any) {
    console.error("Verification error:", error)
    return NextResponse.json({ message: "Server error", details: error.message }, { status: 500 })
  }
}
