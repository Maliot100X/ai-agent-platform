import { NextRequest, NextResponse } from "next/server";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const strategy = body.strategy || "momentum";
    const label = body.label || strategy;

    const sb = getSupabase();
    if (sb) {
      const id = `strat-${strategy}-${Date.now()}`;
      const { data, error } = await sb
        .from("strategies")
        .upsert({
          id,
          name: strategy,
          label,
          status: "running",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, strategy: data, storage: "supabase" });
    }

    return NextResponse.json({
      success: true,
      strategy: { name: strategy, label, status: "running", started_at: new Date().toISOString() },
      storage: "memory",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
