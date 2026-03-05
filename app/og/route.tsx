import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          background: "linear-gradient(145deg, #060D20 0%, #0D1633 55%, #080E22 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* ── LEFT: copy ─────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "64px 48px 64px 72px",
            flex: 1,
          }}
        >
          {/* Brand pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              alignSelf: "flex-start",
              gap: "8px",
              background: "rgba(99,102,241,0.15)",
              border: "1px solid rgba(99,102,241,0.4)",
              borderRadius: "100px",
              padding: "6px 16px",
              marginBottom: "28px",
            }}
          >
            <div
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#818CF8",
              }}
            />
            <span
              style={{
                color: "#A5B4FC",
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              llmcheck.app
            </span>
          </div>

          {/* Headline */}
          <span
            style={{
              color: "#F1F5F9",
              fontSize: "58px",
              fontWeight: 900,
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
              display: "block",
            }}
          >
            Does ChatGPT
          </span>
          <span
            style={{
              color: "#F1F5F9",
              fontSize: "58px",
              fontWeight: 900,
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
              display: "block",
            }}
          >
            recommend
          </span>
          <span
            style={{
              color: "#818CF8",
              fontSize: "58px",
              fontWeight: 900,
              lineHeight: 1.12,
              letterSpacing: "-0.02em",
              display: "block",
              marginBottom: "20px",
            }}
          >
            your brand?
          </span>

          {/* Sub-text */}
          <span
            style={{
              color: "#94A3B8",
              fontSize: "19px",
              lineHeight: 1.5,
              marginBottom: "32px",
              display: "block",
            }}
          >
            Scan ChatGPT, Gemini, and Perplexity to see{"\n"}if they cite you — or your competitors.
          </span>

          {/* CTA */}
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              background: "#4F46E5",
              borderRadius: "10px",
              padding: "12px 24px",
            }}
          >
            <span style={{ color: "white", fontWeight: 700, fontSize: "16px" }}>
              Free scan — instant results
            </span>
          </div>
        </div>

        {/* ── RIGHT: mock scan card ──────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 64px 48px 16px",
            width: "440px",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "20px",
              padding: "28px",
              width: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Card header */}
            <span
              style={{
                color: "#94A3B8",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                marginBottom: "4px",
                display: "block",
              }}
            >
              AI VISIBILITY CHECK
            </span>
            <span
              style={{
                color: "#0F172A",
                fontSize: "16px",
                fontWeight: 800,
                marginBottom: "18px",
                display: "block",
              }}
            >
              yoursite.com
            </span>

            {/* ChatGPT — found */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "11px 14px",
                background: "#F0FDF4",
                borderRadius: "10px",
                border: "1px solid #BBF7D0",
                marginBottom: "8px",
              }}
            >
              <span style={{ color: "#1E293B", fontSize: "14px", fontWeight: 700 }}>ChatGPT</span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div
                  style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22C55E" }}
                />
                <span style={{ color: "#16A34A", fontSize: "13px", fontWeight: 700 }}>Mentioned</span>
              </div>
            </div>

            {/* Gemini — not found */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "11px 14px",
                background: "#FEF2F2",
                borderRadius: "10px",
                border: "1px solid #FECACA",
                marginBottom: "8px",
              }}
            >
              <span style={{ color: "#1E293B", fontSize: "14px", fontWeight: 700 }}>Gemini</span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div
                  style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#EF4444" }}
                />
                <span style={{ color: "#DC2626", fontSize: "13px", fontWeight: 700 }}>Not found</span>
              </div>
            </div>

            {/* Perplexity — not found */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "11px 14px",
                background: "#FEF2F2",
                borderRadius: "10px",
                border: "1px solid #FECACA",
                marginBottom: "16px",
              }}
            >
              <span style={{ color: "#1E293B", fontSize: "14px", fontWeight: 700 }}>Perplexity</span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div
                  style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#EF4444" }}
                />
                <span style={{ color: "#DC2626", fontSize: "13px", fontWeight: 700 }}>Not found</span>
              </div>
            </div>

            {/* Score */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: "1px solid #F1F5F9",
                paddingTop: "14px",
                marginBottom: "14px",
              }}
            >
              <span style={{ color: "#64748B", fontSize: "13px" }}>AI Visibility Score</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
                <span style={{ color: "#DC2626", fontSize: "30px", fontWeight: 900 }}>33</span>
                <span style={{ color: "#CBD5E1", fontSize: "16px" }}>/100</span>
              </div>
            </div>

            {/* Warning nudge */}
            <div
              style={{
                background: "#FFF7ED",
                border: "1px solid #FED7AA",
                borderRadius: "8px",
                padding: "10px 14px",
                display: "flex",
              }}
            >
              <span
                style={{ color: "#92400E", fontSize: "12px", fontWeight: 600, lineHeight: 1.4 }}
              >
                2 of 3 AI assistants don't know you exist
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
