import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"

// Mock herb data for demo
const HERBS = [
  {
    id: "herb_001",
    farmerId: "farmer_123",
    herbName: "Ashwagandha",
    scientificName: "Withania somnifera",
    harvestDate: "2024-01-15",
    quantity: 50,
    location: "Karnataka, India",
    organicCertified: true,
    status: "synced",
    processingDetails: null,
    labResults: null,
    manufacturingDetails: null,
  },
  {
    id: "herb_002",
    farmerId: "farmer_456",
    herbName: "Turmeric",
    scientificName: "Curcuma longa",
    harvestDate: "2024-01-20",
    quantity: 75,
    location: "Tamil Nadu, India",
    organicCertified: true,
    status: "processing",
    processingDetails: {
      method: "Sun drying",
      duration: "7 days",
      finalWeight: 45,
      processedBy: "processor1",
      processedDate: "2024-01-22",
    },
    labResults: null,
    manufacturingDetails: null,
  },
]

function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }

  try {
    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as any
    return decoded
  } catch (error) {
    return null
  }
}

export async function GET(request: NextRequest) {
  const user = verifyToken(request)
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  // Filter herbs based on user role and status
  let filteredHerbs = HERBS

  if (user.role === "processing") {
    filteredHerbs = HERBS.filter((herb) => herb.status === "synced" || herb.status === "processing")
  } else if (user.role === "lab") {
    filteredHerbs = HERBS.filter((herb) => herb.status === "processing" || herb.status === "testing")
  } else if (user.role === "manufacturing") {
    filteredHerbs = HERBS.filter((herb) => herb.status === "approved" || herb.status === "manufacturing")
  }

  return NextResponse.json(filteredHerbs)
}

export async function PUT(request: NextRequest) {
  const user = verifyToken(request)
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { herbId, updateData } = await request.json()

    // Find herb and update based on user role
    const herbIndex = HERBS.findIndex((h) => h.id === herbId)
    if (herbIndex === -1) {
      return NextResponse.json({ message: "Herb not found" }, { status: 404 })
    }

    const herb = HERBS[herbIndex]

    if (user.role === "processing" && herb.status === "synced") {
      herb.processingDetails = updateData
      herb.status = "processing"
    } else if (user.role === "lab" && herb.status === "processing") {
      herb.labResults = updateData
      herb.status = updateData.result === "approved" ? "approved" : "rejected"
    } else if (user.role === "manufacturing" && herb.status === "approved") {
      herb.manufacturingDetails = updateData
      herb.status = "completed"
    } else {
      return NextResponse.json({ message: "Invalid operation for current herb status" }, { status: 400 })
    }

    return NextResponse.json({ message: "Herb updated successfully", herb })
  } catch (error) {
    console.error("Update error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
