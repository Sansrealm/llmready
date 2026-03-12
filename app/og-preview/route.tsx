/**
 * Local preview — OG image draft with narrative flow design.
 * Visit: http://localhost:3001/og-preview
 */
import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const BG = "linear-gradient(145deg, #060D20 0%, #0D1633 55%, #080E22 100%)";

function scoreColor(s: number) {
  if (s >= 80) return "#16A34A";   // green  — passing
  if (s >= 60) return "#F59E0B";   // amber  — warning
  if (s >= 40) return "#EA580C";   // orange — poor
  return "#DC2626";                // red    — critical
}

function verdict(s: number) {
  if (s >= 80) return { label: "STRONG: WELL CITED",     color: "#16A34A" };
  if (s >= 60) return { label: "AT RISK: CITATION GAP",  color: "#EA580C" };
  if (s >= 40) return { label: "CRITICAL: CITATION GAP", color: "#DC2626" };
  return          { label: "CRITICAL: NOT CITED",        color: "#DC2626" };
}

function paramColor(s: number) {
  if (s >= 70) return "#16A34A";
  if (s >= 40) return "#D97706";
  return "#DC2626";
}

const SAMPLE = {
  domain: "caseflood.ai",
  score: 65,
  parameters: [
    { name: "Content Relevance",     score: 70 },
    { name: "Duplication",           score: 40 },
    { name: "Schema Markup",         score: 20 },
    { name: "Mobile Optimization",   score: 80 },
    { name: "Imagery Accessibility", score: 90 },
  ],
};

export async function GET() {
  const { domain, score, parameters } = SAMPLE;
  const sc = scoreColor(score);
  const v  = verdict(score);

  // Worst 2 — Schema first to tell the "why"
  const worst2 = [...parameters].sort((a, b) => a.score - b.score).slice(0, 2);

  const domainFontSize = domain.length > 22 ? 72 : domain.length > 16 ? 84 : 96;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          background: BG,
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* ── Top bar ────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "26px 52px 0",
          }}
        >
          {/* LC badge + wordmark */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "30px",
                height: "30px",
                background: "#3B82F6",
                borderRadius: "7px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "white", fontSize: "11px", fontWeight: 800, letterSpacing: "0.02em" }}>
                LC
              </span>
            </div>
            <span style={{ color: "white", fontSize: "15px", fontWeight: 600 }}>
              LLM Check
            </span>
          </div>

          <span style={{ color: "#475569", fontSize: "13px", fontWeight: 500 }}>
            llmcheck.app
          </span>
        </div>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flex: 1,
            padding: "24px 52px 32px",
            gap: "36px",
          }}
        >
          {/* Left column — narrative */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "space-between",
            }}
          >
            {/* Subject */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span
                style={{
                  color: "white",
                  fontSize: `${domainFontSize}px`,
                  fontWeight: 900,
                  lineHeight: 1.0,
                  letterSpacing: "-0.025em",
                }}
              >
                {domain}
              </span>
              <span
                style={{
                  color: "white",
                  fontSize: "50px",
                  fontWeight: 800,
                  lineHeight: 1.0,
                  letterSpacing: "-0.01em",
                }}
              >
                AI CITATION AUDIT
              </span>
            </div>

            {/* Crisis — score with glow */}
            <div style={{ display: "flex", position: "relative", alignItems: "flex-end", gap: "6px" }}>
              {/* Amber glow disc */}
              <div
                style={{
                  position: "absolute",
                  width: "280px",
                  height: "200px",
                  borderRadius: "50%",
                  background: `radial-gradient(ellipse at center, ${sc}55 0%, ${sc}18 45%, transparent 70%)`,
                  left: "-30px",
                  top: "-40px",
                }}
              />
              <span
                style={{
                  color: sc,
                  fontSize: "148px",
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: "-0.04em",
                }}
              >
                {score}
              </span>
              <span
                style={{
                  color: "#1E293B",
                  fontSize: "38px",
                  fontWeight: 700,
                  marginBottom: "18px",
                }}
              >
                /100
              </span>
            </div>

            {/* Verdict */}
            <span
              style={{
                color: v.color,
                fontSize: "26px",
                fontWeight: 800,
                letterSpacing: "0.04em",
              }}
            >
              {v.label}
            </span>

            {/* CTA */}
            <span
              style={{
                color: "white",
                fontSize: "28px",
                fontWeight: 700,
              }}
            >
              Audit your site → llmcheck.app
            </span>
          </div>

          {/* Right column — white card: worst 2 params */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              width: "370px",
            }}
          >
            <div
              style={{
                background: "white",
                borderRadius: "20px",
                padding: "28px 28px 24px",
                width: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span
                style={{
                  color: "#94A3B8",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  marginBottom: "20px",
                }}
              >
                WEAKEST AREAS
              </span>

              {worst2.map((param, i) => {
                const pc = paramColor(param.score);
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "7px",
                      marginBottom: i === 0 ? "18px" : 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ color: "#1E293B", fontSize: "14px", fontWeight: 600 }}>
                        {param.name}
                      </span>
                      <span style={{ color: pc, fontSize: "17px", fontWeight: 800 }}>
                        {param.score}
                      </span>
                    </div>
                    <div
                      style={{
                        height: "6px",
                        background: "#F1F5F9",
                        borderRadius: "4px",
                        display: "flex",
                      }}
                    >
                      <div
                        style={{
                          width: `${param.score}%`,
                          height: "6px",
                          background: pc,
                          borderRadius: "4px",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Bottom-right diamond ───────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            bottom: "28px",
            right: "48px",
            color: "#1E293B",
            fontSize: "26px",
          }}
        >
          ✦
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
