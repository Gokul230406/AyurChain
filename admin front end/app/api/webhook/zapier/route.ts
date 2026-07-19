import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "../../../../lib/db"
import Folder from "../../../../lib/models/Folder"

interface HarvestWebhookData {
  id: string
  herbName: string
  quantity: number
  unit: string
  quality: string
  notes: string
  timestamp: string
  farmerId: string
  farmerName: string
  location: {
    latitude: number
    longitude: number
  }
  photo: string // Base64 encoded
  triggered_from: string
}

function processBase64Photo(base64Photo: string): { photoUrl: string; thumbnail: string } {
  const photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  return {
    photoUrl: `/api/photos/${photoId}`,
    thumbnail: `/api/photos/${photoId}/thumb`,
  }
}

function validateCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    console.log(`[v0] Webhook received - Request ID: ${requestId}`)
    await connectToDatabase()

    const rawBody = await request.text()
    let data: HarvestWebhookData
    try {
      data = JSON.parse(rawBody)
    } catch (parseError) {
      console.error(`[v0] JSON parsing error:`, parseError)
      return NextResponse.json(
        {
          status: "error",
          message: "Invalid JSON format",
          errors: [{ field: "body", message: "Request body must be valid JSON" }],
          requestId,
        },
        { status: 400 }
      )
    }

    const errors: Array<{ field: string; message: string }> = []

    if (!data.id) errors.push({ field: "id", message: "Harvest ID is required" })
    if (!data.herbName) errors.push({ field: "herbName", message: "Herb name is required" })
    if (!data.quantity || data.quantity <= 0) errors.push({ field: "quantity", message: "Valid quantity is required" })
    if (!data.farmerId) errors.push({ field: "farmerId", message: "Farmer ID is required" })
    if (!data.farmerName) errors.push({ field: "farmerName", message: "Farmer name is required" })
    if (!data.photo) errors.push({ field: "photo", message: "Photo is required" })

    if (!data.location || !validateCoordinates(data.location.latitude, data.location.longitude)) {
      errors.push({ field: "location", message: "Valid latitude and longitude are required" })
    }

    if (errors.length > 0) {
      console.log(`[v0] Validation errors for request ${requestId}:`, errors)
      return NextResponse.json(
        {
          status: "error",
          message: "Validation failed",
          errors,
          requestId,
        },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }
      )
    }

    const { photoUrl } = processBase64Photo(data.photo)

    // Store in MongoDB (using upsert so we don't create duplicates if it's sent twice)
    const folderData = {
      id: data.id,
      herbName: data.herbName,
      quantity: data.quantity,
      geotaggedImage: data.photo, // Save full base64 so it shows up in UI
      location: `${data.location.latitude}, ${data.location.longitude}`,
      farmerName: data.farmerName,
      collectionDate: data.timestamp || new Date().toISOString(),
      additionalNotes: data.notes || "",
      status: "received",
      currentStage: "received",
      createdAt: new Date().toISOString(),
    }

    await Folder.findOneAndUpdate({ id: data.id }, folderData, { upsert: true, new: true })
    console.log(`[v0] Successfully stored harvest ${data.id} in MongoDB`)

    return NextResponse.json(
      {
        status: "success",
        message: "Harvest data received and processed",
        data: {
          harvestId: data.id,
          photoUrl: photoUrl,
          locationVerified: true,
          timestamp: new Date().toISOString(),
        },
        requestId,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    )
  } catch (error: any) {
    console.error(`[v0] Webhook error for request ${requestId}:`, error)
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to process harvest data",
        errors: [{ field: "general", message: error.message }],
        requestId,
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}

export async function GET() {
  try {
    await connectToDatabase()
    const storedHerbs = await Folder.find({}).sort({ createdAt: -1 })
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/api/webhook/zapier`

    return NextResponse.json(
      {
        webhookUrl,
        storedHerbs,
        totalCount: storedHerbs.length,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
