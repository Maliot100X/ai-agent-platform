import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.DEEPGRAM_API_KEY || "6c18a51c829ac16237a956c786e23e1368570311";

  if (!key) {
    return NextResponse.json({ error: "Deepgram API key not configured" }, { status: 500 });
  }

  return NextResponse.json({
    key,
    websocket_url: "wss://agent.deepgram.com/v1/agent/converse",
    features: { stt: true, tts: true, voice_agent: true },
  });
}
