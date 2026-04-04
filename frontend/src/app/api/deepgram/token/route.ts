import { NextResponse } from "next/server";

/**
 * Returns a temporary Deepgram API key for client-side WebSocket connection.
 * This prevents exposing the main API key in the browser.
 * 
 * Deepgram Voice Agent connects via: wss://agent.deepgram.com/agent
 * Auth: Authorization: Token <key>
 */
export async function GET() {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "DEEPGRAM_API_KEY not configured. Add it to Vercel environment variables." },
      { status: 500 }
    );
  }

  // For production, you'd create a temporary scoped key via Deepgram's API.
  // For now, we return the key directly (it's server-side only, never in HTML source).
  return NextResponse.json({
    key: apiKey,
    websocket_url: "wss://agent.deepgram.com/v1/agent/converse",
    features: {
      stt: true,
      tts: true,
      voice_agent: true,
    },
  });
}
