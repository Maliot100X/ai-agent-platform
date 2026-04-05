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
          backgroundImage: "radial-gradient(circle at 25% 25%, #0ea5e920 0%, transparent 50%), radial-gradient(circle at 75% 75%, #8b5cf620 0%, transparent 50%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "30px",
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
                fontSize: "60px",
                fontWeight: "bold",
                background: "linear-gradient(90deg, #0ea5e9, #8b5cf6)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              FLUXMINT AI
            </span>
            <span style={{ fontSize: "24px", color: "#94a3b8" }}>
              Trading Platform v2.0
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "40px",
            marginTop: "20px",
          }}
        >
          {[
            { label: "PumpFun Sniper", icon: "target" },
            { label: "Whale Watcher", icon: "eye" },
            { label: "Momentum Trader", icon: "trending" },
            { label: "10+ Skills", icon: "skills" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "16px 24px",
                borderRadius: "16px",
                border: "1px solid #1e293b",
                backgroundColor: "#0f172a80",
              }}
            >
              <span style={{ fontSize: "18px", color: "#0ea5e9", fontWeight: "600" }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: "20px",
            marginTop: "40px",
            fontSize: "16px",
            color: "#64748b",
          }}
        >
          <span>kainova.xyz</span>
          <span>|</span>
          <span>@KaiNovasWarm</span>
          <span>|</span>
          <span>Powered by DeepSeek v3.2</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
