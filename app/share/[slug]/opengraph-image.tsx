/**
 * Dynamic OG image for shared analysis reports.
 * Next.js automatically serves this as og:image for /share/[slug].
 *
 * Layout (1200×630) — mirrors the share page hero:
 *   Primary path (scan available):
 *     Left  — Subject + "AI VISIBILITY AUDIT" label, cited/total, percentage,
 *             verdict derived from citation rate, CTA
 *     Right — Per-engine card: ChatGPT / Gemini / Perplexity cited counts
 *
 *   Fallback path (pre-scan analyses — no ai_visibility_results):
 *     Left  — Subject + "AI READINESS" label, structural score/100,
 *             neutral verdict (no citation language), CTA
 *     Right — Weakest two structural parameters card
 *
 * This file must never 500 — all DB calls are wrapped in catch and fall back
 * to safe defaults so social previews always render.
 */

import { ImageResponse } from "next/og";
import { getAnalysisByShareSlug, getLatestVisibilityScanAnyAge } from "@/lib/db";
import {
  computeCitationStats,
  computeVerdict,
  formatPct,
  type VerdictTone,
} from "@/lib/visibility-report";

export const runtime = "nodejs"; // needs DB access — not edge
export const alt = "AI Visibility Audit";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "linear-gradient(145deg, #060D20 0%, #0D1633 55%, #080E22 100%)";

// ── Colour helpers ──────────────────────────────────────────────────────────

function structColor(s: number) {
  if (s >= 80) return "#16A34A";
  if (s >= 60) return "#F59E0B";
  if (s >= 40) return "#EA580C";
  return "#DC2626";
}

function rateColor(rate: number) {
  if (rate >= 0.8) return "#16A34A";
  if (rate >= 0.6) return "#F59E0B";
  if (rate >= 0.4) return "#EA580C";
  return "#DC2626";
}

function verdictToneColor(tone: VerdictTone) {
  switch (tone) {
    case "strong":   return "#16A34A";
    case "at-risk":  return "#F59E0B";
    case "low":      return "#EA580C";
    case "critical": return "#DC2626";
  }
}

// Fallback verdict (pre-scan) — uses neutral "readiness" language, never
// citation copy, so the preview doesn't misrepresent what wasn't measured.
function structuralVerdict(s: number): { label: string; color: string } {
  if (s >= 80) return { label: "STRONG READINESS",  color: "#16A34A" };
  if (s >= 60) return { label: "NEEDS WORK",        color: "#F59E0B" };
  if (s >= 40) return { label: "POOR READINESS",    color: "#EA580C" };
  return          { label: "CRITICAL: STRUCTURE",  color: "#DC2626" };
}

function paramColor(s: number) {
  if (s >= 70) return "#16A34A";
  if (s >= 40) return "#D97706";
  return "#DC2626";
}

// ── Component ───────────────────────────────────────────────────────────────

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Never let a DB error crash OG image generation.
  const analysis = await getAnalysisByShareSlug(slug).catch((err) => {
    console.error("[og-image] analysis fetch failed:", err);
    return null;
  });

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

  // Fetch visibility scan — falls back silently when missing.
  const scan = analysis?.url
    ? await getLatestVisibilityScanAnyAge(analysis.url).catch((err) => {
        console.error("[og-image] scan fetch failed:", err);
        return null;
      })
    : null;

  const hasScan = !!scan && scan.results.length > 0;
  const stats = hasScan ? computeCitationStats(scan!.results, analysis?.query_buckets ?? null) : null;

  // Pre-scan fallback path — same trigger as share page for consistency.
  const useFallback = !hasScan || !stats || stats.total === 0;

  const domainFontSize = domain.length > 22 ? 64 : domain.length > 16 ? 76 : 88;

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
        {/* ── Top bar ─────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "26px 52px 0",
          }}
        >
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

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flex: 1,
            padding: "24px 52px 32px",
            gap: "36px",
          }}
        >
          {/* ── Left column ──────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "space-between",
            }}
          >
            {/* Subject + label */}
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
                  fontSize: "42px",
                  fontWeight: 800,
                  lineHeight: 1.0,
                  letterSpacing: "-0.01em",
                }}
              >
                {useFallback ? "AI READINESS" : "AI VISIBILITY AUDIT"}
              </span>
            </div>

            {/* Score block with ambient glow */}
            {useFallback ? (
              <FallbackScore score={analysis?.overall_score ?? 0} />
            ) : (
              <VisibilityScore cited={stats!.cited} total={stats!.total} rate={stats!.rate} />
            )}

            {/* Verdict */}
            {useFallback ? (
              <span
                style={{
                  color: structuralVerdict(analysis?.overall_score ?? 0).color,
                  fontSize: "26px",
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                }}
              >
                {structuralVerdict(analysis?.overall_score ?? 0).label}
              </span>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span
                  style={{
                    color: verdictToneColor(computeVerdict(stats!.rate).tone),
                    fontSize: "26px",
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                  }}
                >
                  {computeVerdict(stats!.rate).label.toUpperCase()}
                </span>
                <span
                  style={{
                    color: "#94A3B8",
                    fontSize: "15px",
                    fontWeight: 500,
                    letterSpacing: "0.01em",
                  }}
                >
                  Measured across ChatGPT, Gemini, and Perplexity
                </span>
              </div>
            )}

            {/* CTA */}
            <span style={{ color: "white", fontSize: "28px", fontWeight: 700 }}>
              Audit your site → llmcheck.app
            </span>
          </div>

          {/* ── Right column ─────────────────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "center", width: "380px" }}>
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
              {useFallback
                ? <FallbackRightCard parameters={analysis?.parameters ?? []} />
                : <EngineRightCard byEngine={stats!.byEngine} />
              }
            </div>
          </div>
        </div>

        {/* ── Bottom-right diamond ────────────────────────────────────── */}
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

// ── Sub-renderers ────────────────────────────────────────────────────────────

function VisibilityScore({ cited, total, rate }: { cited: number; total: number; rate: number }) {
  const sc = rateColor(rate);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {/* Row 1 — cited / total */}
      <div
        style={{
          display: "flex",
          position: "relative",
          alignItems: "flex-end",
          gap: "6px",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "320px",
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
            fontSize: "140px",
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: "-0.04em",
          }}
        >
          {cited}
        </span>
        <span
          style={{
            color: "#64748B",
            fontSize: "56px",
            fontWeight: 800,
            marginBottom: "14px",
          }}
        >
          /{total}
        </span>
      </div>
      {/* Row 2 — percentage on its own line. Previously rendered inline with
          a middle-dot separator ("· 90%"), which at small sizes looked like
          a decimal (".90%"). Stacking matches the live share-page hero. */}
      <span
        style={{
          color: "#E2E8F0",
          fontSize: "30px",
          fontWeight: 700,
          letterSpacing: "0.01em",
        }}
      >
        {formatPct(rate)}% cited
      </span>
    </div>
  );
}

function FallbackScore({ score }: { score: number }) {
  const sc = structColor(score);
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        alignItems: "flex-end",
        gap: "6px",
      }}
    >
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
          color: "#64748B",
          fontSize: "38px",
          fontWeight: 700,
          marginBottom: "18px",
        }}
      >
        /100
      </span>
    </div>
  );
}

function EngineRightCard({
  byEngine,
}: {
  byEngine: Array<{ id: string; label: string; cited: number; total: number; rate: number }>;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span
        style={{
          color: "#94A3B8",
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.1em",
          marginBottom: "20px",
        }}
      >
        BY AI ENGINE
      </span>
      {byEngine.map((e, i) => {
        const pc = rateColor(e.rate);
        const pct = formatPct(e.rate);
        return (
          <div
            key={e.id}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "7px",
              marginBottom: i < byEngine.length - 1 ? "16px" : 0,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ color: "#1E293B", fontSize: "15px", fontWeight: 600 }}>
                {e.label}
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
                <span style={{ color: pc, fontSize: "16px", fontWeight: 800 }}>{e.cited}</span>
                <span style={{ color: "#94A3B8", fontSize: "12px", fontWeight: 600 }}>/{e.total}</span>
                <span style={{ color: "#94A3B8", fontSize: "12px", fontWeight: 600, marginLeft: "6px" }}>
                  {pct}%
                </span>
              </div>
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
                  width: `${pct}%`,
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
  );
}

function FallbackRightCard({
  parameters,
}: {
  parameters: Array<{ name: string; score: number }>;
}) {
  const worst2 = [...parameters]
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
    .slice(0, 2);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
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
        const s  = typeof param.score === "number" ? param.score : 0;
        const pc = paramColor(s);
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
                {s}
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
                  width: `${s}%`,
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
  );
}
