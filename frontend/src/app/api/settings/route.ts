import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data } = await sb.from("settings").select("*");
      const settings: Record<string, any> = {};
      for (const row of data || []) {
        settings[row.key] = row.value;
      }
      return NextResponse.json({ settings, storage: "supabase" });
    } catch (e: any) {
      return NextResponse.json({ settings: {}, error: e.message });
    }
  }
  return NextResponse.json({ settings: {}, storage: "no_supabase" });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sb = getSupabase();
    if (!sb) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

    for (const [key, value] of Object.entries(body)) {
      await sb.from("settings").upsert({
        key,
        value: value as any,
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
