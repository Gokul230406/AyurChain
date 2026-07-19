import { type NextRequest, NextResponse } from "next/server"
import { herbDatabase } from "../zapier/route"

export async function GET() {
  return NextResponse.json({
    message: "Webhook test endpoint is working",
    timestamp: new Date().toISOString(),
    storedHerbsCount: herbDatabase.length,
    lastFewHerbs: herbDatabase.slice(-3), // Show last 3 entries
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://your-app.vercel.app"}/api/webhook/zapier`,
  })
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    console.log("[v0] Test webhook received data:", JSON.stringify(data, null, 2))

    // Store test data
    const testEntry = {
      ...data,
      id: `test_${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: "test_entry",
    }

    herbDatabase.push(testEntry)

    return NextResponse.json({
      success: true,
      message: "Test data received successfully",
      receivedData: data,
      storedAs: testEntry,
      totalEntries: herbDatabase.length,
    })
  } catch (error) {
    console.error("[v0] Test webhook error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
