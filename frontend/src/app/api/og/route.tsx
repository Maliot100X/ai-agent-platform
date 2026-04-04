import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#020617",
          backgroundImage: "radial-gradient(circle at 20% 30%, #0ea5e930 0%, transparent 40%), radial-gradient(circle at 80% 70%, #8b5cf630 0%, transparent 40%), radial-gradient(circle at 50% 50%, #10b98120 0%, transparent 50%)",
        }}
      >
        {/* Top badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "8px 24px",
            borderRadius: "999px",
            border: "1px solid #1e293b",
            backgroundColor: "#0f172a80",
            marginBottom: "24px",
            fontSize: "16px",
            color: "#94a3b8",
          }}
        >
          Built by Maliot | @KaiNovasWarm
        </div>

        {/* Main title */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #0ea5e9, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "40px",
            }}
          >
            &#x26A1;
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: "56px",
                fontWeight: "bold",
                background: "linear-gradient(90deg, #0ea5e9, #8b5cf6, #10b981)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              FLUXMINT AI
            </span>
            <span style={{ fontSize: "22px", color: "#64748b" }}>
              Autonomous AI Trading Platform for Solana
            </span>
          </div>
        </div>

        {/* Feature cards */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginTop: "16px",
          }}
        >
          {[
            { label: "10 AI Skills", detail: "Sniper, Whale, Momentum" },
            { label: "PumpFun Live", detail: "Real-time launches" },
            { label: "Auto Trading", detail: "Buy/Sell with P&L" },
            { label: "Voice Agent", detail: "Deepgram powered" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "16px 28px",
                borderRadius: "16px",
                border: "1px solid #1e293b",
                backgroundColor: "#0f172a",
              }}
            >
              <span style={{ fontSize: "18px", color: "#0ea5e9", fontWeight: "700" }}>
                {item.label}
              </span>
              <span style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                {item.detail}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom links */}
        <div
          style={{
            display: "flex",
            gap: "20px",
            marginTop: "32px",
            fontSize: "15px",
            color: "#475569",
          }}
        >
          <span>kainova.xyz</span>
          <span>|</span>
          <span>github.com/Maliot100X</span>
          <span>|</span>
          <span>Powered by Supabase + Vercel</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
