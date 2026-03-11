/**
 * Dynamic OG image for shared analysis reports.
 * Next.js automatically picks this up as og:image for /share/[slug].
 *
 * Layout: dark background matching the site OG style.
 *   Left  — LLM Check badge, domain, large score number, score label
 *   Right — white card with parameter breakdown (top 4 params)
 */

import { ImageResponse } from "next/og";
import { getAnalysisByShareSlug } from "@/lib/db";

export const runtime = "nodejs"; // needs DB access — not edge
export const alt = "LLM Readiness Report";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Match the existing OG colour system
const BG = "linear-gradient(145deg, #060D20 0%, #0D1633 55%, #080E22 100%)";
const ACCENT = "#818CF8";

function scoreColor(s: number) {
  if (s >= 80) return "#16A34A";
  if (s >= 60) return "#2563EB";
  if (s >= 40) return "#D97706";
  return "#DC2626";
}

function scoreLabel(s: number) {
  if (s >= 80) return "Strong AI Readiness";
  if (s >= 60) return "Good AI Readiness";
  if (s >= 40) return "Needs Improvement";
  return "Critical Gaps Found";
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const analysis = await getAnalysisByShareSlug(slug);

  const score = analysis?.overall_score ?? 0;

  let domain = "your site";
  if (analysis?.url) {
    try {
      const u = analysis.url.startsWith("http")
        ? analysis.url
        : `https://${analysis.url}`;
      domain = new URL(u).hostname.replace(/^www\./, "");
    } catch {
      domain = analysis.url;
    }
  }

  const sc = scoreColor(score);
  const sl = scoreLabel(score);
  const params4 = (analysis?.parameters ?? []).slice(0, 4);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          background: BG,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* ── Left column ─────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "64px 40px 64px 72px",
            flex: 1,
          }}
        >
          {/* Badge */}
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
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: ACCENT,
              }}
            />
            <span
              style={{
                color: ACCENT,
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              LLM Check
            </span>
          </div>

          {/* Section label */}
          <span
            style={{
              color: "#475569",
              fontSize: "16px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              display: "block",
              marginBottom: "10px",
            }}
          >
            AI READINESS REPORT
          </span>

          {/* Domain */}
          <span
            style={{
              color: "#F1F5F9",
              fontSize: domain.length > 24 ? "36px" : domain.length > 18 ? "44px" : "52px",
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              display: "block",
              marginBottom: "28px",
            }}
          >
            {domain}
          </span>

          {/* Score number */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "6px",
              marginBottom: "14px",
            }}
          >
            <span
              style={{
                color: sc,
                fontSize: "96px",
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              {score}
            </span>
            <span
              style={{ color: "#334155", fontSize: "44px", fontWeight: 700 }}
            >
              /100
            </span>
          </div>

          {/* Score label pill */}
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              background: `${sc}1A`,
              border: `1px solid ${sc}40`,
              borderRadius: "8px",
              padding: "8px 18px",
            }}
          >
            <span style={{ color: sc, fontSize: "16px", fontWeight: 700 }}>
              {sl}
            </span>
          </div>

          {/* Footer */}
          <span
            style={{
              color: "#1E293B",
              fontSize: "15px",
              marginTop: "36px",
              display: "block",
            }}
          >
            llmcheck.app
          </span>
        </div>

        {/* ── Right column: parameter card ────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 64px 48px 8px",
            width: "460px",
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
            {/* Card header */}
            <span
              style={{
                color: "#94A3B8",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                display: "block",
                marginBottom: "18px",
              }}
            >
              PARAMETER BREAKDOWN
            </span>

            {/* Parameter rows */}
            {params4.map((param, i) => {
              const s =
                typeof param.score === "number" ? param.score : 0;
              const c =
                s >= 70 ? "#16A34A" : s >= 40 ? "#D97706" : "#DC2626";
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "5px",
                    marginBottom:
                      i < params4.length - 1 ? "14px" : "0px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        color: "#1E293B",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      {param.name}
                    </span>
                    <span
                      style={{
                        color: c,
                        fontSize: "14px",
                        fontWeight: 800,
                      }}
                    >
                      {s}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div
                    style={{
                      height: "5px",
                      background: "#F1F5F9",
                      borderRadius: "3px",
                      display: "flex",
                    }}
                  >
                    <div
                      style={{
                        width: `${s}%`,
                        height: "5px",
                        background: c,
                        borderRadius: "3px",
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Divider + CTA */}
            <div
              style={{
                marginTop: "20px",
                paddingTop: "16px",
                borderTop: "1px solid #F1F5F9",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  color: ACCENT,
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              >
                Check your site free → llmcheck.app
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
