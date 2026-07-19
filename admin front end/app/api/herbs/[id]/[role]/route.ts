import { type NextRequest, NextResponse } from "next/server"

// Mock database - replace with actual MongoDB operations
const herbFolders = [
  {
    id: "herb-001",
    herbName: "Ashwagandha",
    quantity: "50 kg",
    geotaggedImage: "/ashwagandha-herbs-in-field.jpg",
    location: "Rajasthan, India",
    farmerName: "Ramesh Kumar",
    collectionDate: "2024-01-15",
    additionalNotes: "High quality roots, organic certified",
    status: "received",
    processingData: null,
    labData: null,
    manufacturingData: null,
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "herb-002",
    herbName: "Turmeric",
    quantity: "75 kg",
    geotaggedImage: "/turmeric-roots-harvest.jpg",
    location: "Kerala, India",
    farmerName: "Priya Nair",
    collectionDate: "2024-01-16",
    additionalNotes: "Fresh harvest, high curcumin content",
    status: "processing",
    processingData: {
      dryingMethod: "sun-dried",
      duration: "7",
      cleaningSteps: "Washed and sorted",
      finalWeight: "25",
    },
    labData: null,
    manufacturingData: null,
    createdAt: "2024-01-16T09:30:00Z",
  },
]

export async function POST(request: NextRequest, { params }: { params: { id: string; role: string } }) {
  try {
    const { id, role } = params
    const body = await request.json()

    // Find the herb folder
    const herbIndex = herbFolders.findIndex((herb) => herb.id === id)
    if (herbIndex === -1) {
      return NextResponse.json({ error: "Herb folder not found" }, { status: 404 })
    }

    const herb = herbFolders[herbIndex]

    // Update based on role
    switch (role) {
      case "processing":
        herb.processingData = body
        herb.status = "processing"
        break
      case "lab":
        herb.labData = body
        herb.status = body.testResult === "passed" ? "lab_testing" : "processing"
        break
      case "manufacturing":
        herb.manufacturingData = body
        herb.status = "manufacturing"
        break
      default:
        return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    // Update the herb in our mock database
    herbFolders[herbIndex] = herb

    return NextResponse.json({
      success: true,
      message: `${role} data added successfully`,
      herb,
    })
  } catch (error) {
    console.error("Error updating herb data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
