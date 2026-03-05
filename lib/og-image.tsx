/**
 * lib/og-image.tsx — reusable OG image renderer.
 *
 * Portable: copy this file into any Next.js 13+ project (App Router).
 * Pair it with an og.config.ts at the project root and a route at
 * app/og/route.tsx that calls generateOgImage().
 *
 * Requires: next (>=13.3) — ImageResponse is part of next/og.
 */

import { ImageResponse } from "next/og";

// ── Types ──────────────────────────────────────────────────────────────────

export interface OgCardRow {
  label: string;
  found: boolean;
}

export interface OgCard {
  header: string;
  domain: string;
  rows: OgCardRow[];
  /** Numeric score shown at the bottom of the card */
  score: number;
  /** Amber warning line below the score */
  warning?: string;
}

export interface OgConfig {
  /** Small branded pill in the top-left */
  badge?: string;
  /**
   * Headline split into lines. The LAST line is rendered in the accent colour.
   * Use 2–3 lines for best results.
   */
  title: string[];
  /** One or two sentences below the headline */
  subtitle: string;
  /** Button label. Omit to hide the CTA button entirely. */
  cta?: string;
  /** Optional right-side mock panel. Omit for a text-only layout. */
  card?: OgCard;
  /** Override default colours */
  theme?: {
    /** Page background — CSS gradient or solid colour */
    background?: string;
    /** Accent colour used on the last title line and the brand pill */
    accent?: string;
    /** CTA button background */
    ctaBackground?: string;
  };
}

// ── Defaults ───────────────────────────────────────────────────────────────

const DEFAULTS = {
  background: "linear-gradient(145deg, #060D20 0%, #0D1633 55%, #080E22 100%)",
  accent: "#818CF8",
  ctaBackground: "#4F46E5",
} as const;

// ── Renderer ───────────────────────────────────────────────────────────────

/**
 * generateOgImage(config)
 *
 * Returns a next/og ImageResponse (1200×630 PNG) from a plain config object.
 * Call this inside an Edge route handler:
 *
 *   export const runtime = "edge";
 *   export async function GET() {
 *     return generateOgImage({ title: ["Hello", "World"], subtitle: "..." });
 *   }
 */
export function generateOgImage(config: OgConfig): ImageResponse {
  const {
    badge,
    title,
    subtitle,
    cta,
    card,
    theme = {},
  } = config;

  const bg      = theme.background    ?? DEFAULTS.background;
  const accent  = theme.accent        ?? DEFAULTS.accent;
  const ctaBg   = theme.ctaBackground ?? DEFAULTS.ctaBackground;

  const hasCard = Boolean(card);
  const leftWidth = hasCard ? "auto" : "100%";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          background: bg,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* ── Left column ──────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: hasCard ? "64px 48px 64px 72px" : "80px 96px",
            flex: 1,
            maxWidth: hasCard ? "700px" : leftWidth,
          }}
        >
          {/* Badge */}
          {badge && (
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
                  background: accent,
                }}
              />
              <span
                style={{
                  color: accent,
                  fontSize: "14px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                }}
              >
                {badge}
              </span>
            </div>
          )}

          {/* Title lines */}
          {title.map((line, i) => (
            <span
              key={i}
              style={{
                color: i === title.length - 1 ? accent : "#F1F5F9",
                fontSize: hasCard ? "56px" : "64px",
                fontWeight: 900,
                lineHeight: i === title.length - 1 ? 1.12 : 1.08,
                letterSpacing: "-0.02em",
                display: "block",
                marginBottom: i === title.length - 1 ? "20px" : "0px",
              }}
            >
              {line}
            </span>
          ))}

          {/* Subtitle */}
          <span
            style={{
              color: "#94A3B8",
              fontSize: hasCard ? "18px" : "22px",
              lineHeight: 1.5,
              marginBottom: cta ? "32px" : "0px",
              display: "block",
              maxWidth: hasCard ? "440px" : "700px",
            }}
          >
            {subtitle}
          </span>

          {/* CTA */}
          {cta && (
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                background: ctaBg,
                borderRadius: "10px",
                padding: "12px 24px",
              }}
            >
              <span style={{ color: "white", fontWeight: 700, fontSize: "16px" }}>
                {cta}
              </span>
            </div>
          )}
        </div>

        {/* ── Right column: mock card ───────────────────────────────────── */}
        {card && (
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
                {card.header.toUpperCase()}
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
                {card.domain}
              </span>

              {/* Scan rows */}
              {card.rows.map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 14px",
                    background: row.found ? "#F0FDF4" : "#FEF2F2",
                    borderRadius: "10px",
                    border: `1px solid ${row.found ? "#BBF7D0" : "#FECACA"}`,
                    marginBottom: i < card.rows.length - 1 ? "8px" : "16px",
                  }}
                >
                  <span style={{ color: "#1E293B", fontSize: "14px", fontWeight: 700 }}>
                    {row.label}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: row.found ? "#22C55E" : "#EF4444",
                      }}
                    />
                    <span
                      style={{
                        color: row.found ? "#16A34A" : "#DC2626",
                        fontSize: "13px",
                        fontWeight: 700,
                      }}
                    >
                      {row.found ? "Mentioned" : "Not found"}
                    </span>
                  </div>
                </div>
              ))}

              {/* Score */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderTop: "1px solid #F1F5F9",
                  paddingTop: "14px",
                  marginBottom: card.warning ? "14px" : "0px",
                }}
              >
                <span style={{ color: "#64748B", fontSize: "13px" }}>
                  AI Visibility Score
                </span>
                <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
                  <span
                    style={{
                      color: card.score >= 70 ? "#16A34A" : card.score >= 40 ? "#D97706" : "#DC2626",
                      fontSize: "30px",
                      fontWeight: 900,
                    }}
                  >
                    {card.score}
                  </span>
                  <span style={{ color: "#CBD5E1", fontSize: "16px" }}>/100</span>
                </div>
              </div>

              {/* Warning nudge */}
              {card.warning && (
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
                    {card.warning}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
