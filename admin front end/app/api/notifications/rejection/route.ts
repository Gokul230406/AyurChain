import { NextResponse, type NextRequest } from "next/server";

// In-memory store for demo notification flow
const rejections: Array<{
  hash: string;
  farmerId?: string;
  farmerName?: string;
  herbName?: string;
  reason: string;
  timestamp: string;
}> = [];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const item = {
      hash: body.hash,
      farmerId: body.farmerId,
      farmerName: body.farmerName,
      herbName: body.herbName,
      reason: body.reason || "",
      timestamp: new Date().toISOString(),
    };
    rejections.push(item);
    // Here you could integrate SMS/email/push or call a webhook to notify the farmer
    console.log("[notify] rejection recorded:", item);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: true, rejections });
}
