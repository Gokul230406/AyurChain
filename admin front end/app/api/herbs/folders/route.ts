import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "../../../../lib/db"
import Folder from "../../../../lib/models/Folder"

// Mock demo data for initial seeding if database is empty
const demoFolders = [
  {
    id: "batch_demo_001",
    herbName: "Ashwagandha",
    quantity: 50.5,
    geotaggedImage: "/ashwagandha-herbs-in-field.jpg",
    location: "Kerala, India (10.8505° N, 76.2711° E)",
    farmerName: "Ravi Kumar",
    collectionDate: "2024-01-15T08:30:00Z",
    additionalNotes: "High quality roots, organic farming",
    status: "admin_approved",
    currentStage: "admin_approved",
    createdAt: "2024-01-15T08:30:00Z",
    approvedBy: "Admin User",
    approvedAt: "2024-01-16T08:30:00Z",
    processing: null,
    labTesting: null,
    manufacturing: null,
  },
  {
    id: "batch_demo_002",
    herbName: "Turmeric",
    quantity: 75.2,
    geotaggedImage: "/turmeric-roots-harvest.jpg",
    location: "Tamil Nadu, India (11.1271° N, 78.6569° E)",
    farmerName: "Meera Devi",
    collectionDate: "2024-01-16T09:15:00Z",
    additionalNotes: "Fresh harvest, high curcumin content expected",
    status: "admin_approved",
    currentStage: "admin_approved",
    createdAt: "2024-01-16T09:15:00Z",
    approvedBy: "Admin User",
    approvedAt: "2024-01-17T09:15:00Z",
    processing: null,
    labTesting: null,
    manufacturing: null,
  },
]

async function seedDemoData() {
  const count = await Folder.countDocuments()
  if (count === 0) {
    console.log("[v0] Seeding initial demo folders into MongoDB...")
    await Folder.insertMany(demoFolders)
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role")
    const stage = searchParams.get("stage")

    console.log("[v0] Fetching herb folders for role:", role, "stage:", stage)
    await connectToDatabase()
    await seedDemoData()

    let query: any = {}

    // Filter by stage based on user role
    if (role === "processing") {
      // Processing unit can ONLY see admin-approved folders and folders currently being processed
      query.currentStage = { $in: ["admin_approved", "processing"] }
    } else if (role === "lab") {
      // Lab unit can see processed folders and folders currently in lab testing
      query.currentStage = { $in: ["processed", "lab-testing"] }
    } else if (role === "manufacturing") {
      // Manufacturing unit can see lab-approved and folders currently in manufacturing stage
      query.currentStage = { $in: ["lab-approved", "manufacturing"] }
    }

    const folders = await Folder.find(query).sort({ createdAt: -1 })

    return NextResponse.json({
      success: true,
      folders,
      count: folders.length,
    })
  } catch (error: any) {
    console.error("[v0] Error fetching herb folders:", error)
    return NextResponse.json({ error: "Failed to fetch herb folders", details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const {
      id,
      herbName,
      quantity,
      geotaggedImage,
      location,
      farmerName,
      collectionDate,
      additionalNotes,
    } = data

    await connectToDatabase()

    const newFolderData = {
      id: id || `herb_${Date.now()}`,
      herbName,
      quantity: Number(quantity),
      geotaggedImage: geotaggedImage || "",
      location: location || "",
      farmerName: farmerName || "Unknown",
      collectionDate: collectionDate || new Date().toISOString(),
      additionalNotes: additionalNotes || "",
      status: "received",
      currentStage: "received",
      createdAt: new Date().toISOString(),
    }

    const folder = await Folder.findOneAndUpdate({ id: newFolderData.id }, newFolderData, { upsert: true, new: true })

    return NextResponse.json({ success: true, folder })
  } catch (error: any) {
    console.error("[v0] Error creating folder:", error)
    return NextResponse.json({ error: "Failed to create folder", details: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    const { folderId, role, updateData } = data

    console.log("[v0] Updating folder:", folderId, "by role:", role)
    await connectToDatabase()

    const folder = await Folder.findOne({ id: folderId })

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 })
    }

    // Update based on role
    if (role === "processing") {
      folder.processing = {
        processedBy: updateData.processedBy,
        processedDate: new Date().toISOString(),
        dryingMethod: updateData.dryingMethod,
        dryingDuration: updateData.dryingDuration,
        cleaningSteps: updateData.cleaningSteps,
        finalWeight: updateData.finalWeight,
        notes: updateData.notes || "",
      }
      folder.currentStage = "processed"
      folder.status = "processed"
    } else if (role === "lab") {
      folder.labTesting = {
        testedBy: updateData.testedBy,
        testDate: new Date().toISOString(),
        testParameters: updateData.testParameters,
        certificateUrl: updateData.certificateUrl,
        overallResult: updateData.overallResult,
        notes: updateData.notes || "",
      }
      folder.currentStage = updateData.overallResult === "approved" ? "lab-approved" : "lab-rejected"
      folder.status = folder.currentStage
    } else if (role === "manufacturing") {
      folder.manufacturing = {
        batchNumber: updateData.batchNumber,
        manufacturingDate: new Date().toISOString(),
        qrCodeId: `QR_${Date.now()}`,
        finalProductWeight: updateData.finalProductWeight,
        packagingType: updateData.packagingType,
        expiryDate: updateData.expiryDate,
        manufacturedBy: updateData.manufacturedBy,
      }
      folder.currentStage = "completed"
      folder.status = "completed"
    }

    // Tell Mongoose the mixed type fields are modified
    folder.markModified("processing")
    folder.markModified("labTesting")
    folder.markModified("manufacturing")

    await folder.save()

    return NextResponse.json({
      success: true,
      message: "Folder updated successfully",
      folder,
    })
  } catch (error: any) {
    console.error("[v0] Error updating folder:", error)
    return NextResponse.json({ error: "Failed to update folder", details: error.message }, { status: 500 })
  }
}

// PATCH endpoint for admin approval
export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json()
    const { folderId, action, adminUser } = data

    console.log("[v0] Admin action:", action, "on folder:", folderId, "by:", adminUser)
    await connectToDatabase()

    const folder = await Folder.findOne({ id: folderId })

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 })
    }

    if (action === "approve") {
      folder.status = "admin_approved"
      folder.currentStage = "admin_approved"
      folder.approvedBy = adminUser || "Admin User"
      folder.approvedAt = new Date().toISOString()
    } else if (action === "reject") {
      folder.status = "admin_rejected"
      folder.currentStage = "admin_rejected"
      folder.rejectedBy = adminUser || "Admin User"
      folder.rejectedAt = new Date().toISOString()
      folder.rejectionReason = data.reason || "No reason provided"
    }

    await folder.save()

    return NextResponse.json({
      success: true,
      message: `Folder ${action}d successfully`,
      folder,
    })
  } catch (error: any) {
    console.error("[v0] Error in admin action:", error)
    return NextResponse.json({ error: "Failed to process admin action", details: error.message }, { status: 500 })
  }
}
