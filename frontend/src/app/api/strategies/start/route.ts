import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const strategy = body.strategy || "momentum";
    return NextResponse.json({
      success: true,
      strategy,
      message: `Strategy '${strategy}' started in paper trading mode.`,
      started_at: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
