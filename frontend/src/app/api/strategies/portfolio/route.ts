import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    balance: 10000,
    initial_balance: 10000,
    total_pnl: 0,
    total_pnl_percent: 0,
    open_positions: 0,
    closed_positions: 0,
    win_rate: 0,
  });
}
