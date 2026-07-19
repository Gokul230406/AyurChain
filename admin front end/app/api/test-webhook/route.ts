import { NextResponse } from "next/server"

export async function POST() {
  try {
    const testData = {
      herbName: "Test Herb",
      quantity: 10.5,
      geotaggedImage: "https://example.com/test-image.jpg",
      location: "Test Location, India",
      farmerName: "Test Farmer",
      collectionDate: new Date().toISOString(),
      additionalNotes: "This is a test entry from the test endpoint",
    }

    console.log("[v0] Testing webhook with data:", testData)

    // Call our own webhook endpoint
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhook/zapier`

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testData),
    })

    const result = await response.json()
    console.log("[v0] Webhook test result:", result)

    return NextResponse.json({
      success: true,
      message: "Test webhook called successfully",
      webhookResponse: result,
      testData,
    })
  } catch (error) {
    console.error("[v0] Test webhook error:", error)
    return NextResponse.json(
      {
        error: "Test webhook failed",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Use POST to test the webhook endpoint",
    testUrl: "/api/test-webhook",
    webhookUrl: "/api/webhook/zapier",
  })
}
