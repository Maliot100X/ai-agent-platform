import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    providers: ["vercel", "fireworks", "gemini", "ollama", "openai"],
    current: process.env.MODEL_PROVIDER || "vercel",
    model: process.env.MODEL_NAME || "deepseek/deepseek-v3.2",
  });
}
