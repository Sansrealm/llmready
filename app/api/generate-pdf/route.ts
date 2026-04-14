// app/api/generate-pdf/route.ts
// Generates a print-ready HTML report for the user to save as PDF.
//
// Leads with AI Visibility (real citation data from ChatGPT / Gemini /
// Perplexity), mirroring the live /results page and the public share page.
// Structural AI Readiness score is a supporting section below the fold.

import { NextRequest, NextResponse } from 'next/server';
import { validatePremiumAccess } from '@/lib/auth-utils';
import { AnalysisResult, QueryBucket } from '@/lib/types';
import {
  getLatestVisibilityScanAnyAge,
  type VisibilityResultRow,
} from '@/lib/db';
import {
  computeCitationStats,
  computeVerdict,
  computeParamContribution,
  formatPct,
  ENGINES,
  type CitationStats,
  type Verdict,
  type VerdictTone,
} from '@/lib/visibility-report';

// ── Colour helpers ────────────────────────────────────────────────────────────

function verdictColor(tone: VerdictTone): string {
  switch (tone) {
    case 'strong':   return '#10b981';  // emerald
    case 'at-risk':  return '#f59e0b';  // amber
    case 'low':      return '#f97316';  // orange
    case 'critical': return '#ef4444';  // red
  }
}

function rateBarColor(rate: number): string {
  if (rate >= 0.8) return '#10b981';
  if (rate >= 0.6) return '#f59e0b';
  if (rate >= 0.4) return '#f97316';
  return '#ef4444';
}

// ── Per-query aggregate (mirrors share page) ──────────────────────────────────

function buildPerQueryRows(
  results: VisibilityResultRow[],
  queryBuckets: QueryBucket[] | null | undefined,
) {
  const queryTypeMap = new Map<string, string>();
  if (queryBuckets) for (const b of queryBuckets) queryTypeMap.set(b.query, b.type);

  // citedBy carries optional rank per engine; NULL when no URL evidence
  // (Layer 1/3 credit). See PRODUCT_GUARDRAILS.md #9.
  const byQuery = new Map<string, { prompt: string; queryType: string; citedBy: Array<{ model: string; position: number | null }> }>();
  for (const r of results) {
    const cited = r.cited === true || r.found === true;
    const existing = byQuery.get(r.prompt);
    if (existing) {
      if (cited) existing.citedBy.push({ model: r.model, position: r.citation_position ?? null });
    } else {
      byQuery.set(r.prompt, {
        prompt: r.prompt,
        queryType: queryTypeMap.get(r.prompt) ?? '',
        citedBy: cited ? [{ model: r.model, position: r.citation_position ?? null }] : [],
      });
    }
  }
  return [...byQuery.values()];
}

// ── HTML generation ───────────────────────────────────────────────────────────

interface VisibilityContext {
  stats: CitationStats;
  verdict: Verdict;
  perQueryRows: ReturnType<typeof buildPerQueryRows>;
  totalQueriesMeta: number;
}

function generatePrintReadyHTML(
  analysisResult: AnalysisResult,
  url: string,
  userEmail: string | null,
  industry: string | null | undefined,
  visibility: VisibilityContext | null,
): string {
  const { overall_score, parameters, recommendations } = analysisResult;
  const resolvedIndustry = industry || analysisResult.industry || null;

  const usesFallback = !visibility || visibility.stats.total === 0;

  // ── Shared styles ──
  const styles = `
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      line-height: 1.6;
      color: #0f172a;
      max-width: 820px;
      margin: 0 auto;
      padding: 24px;
      background: white;
    }

    .download-banner {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: white;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 30px;
      text-align: center;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .download-banner h2 { margin: 0 0 10px 0; font-size: 1.5rem; }
    .download-banner p { margin: 5px 0; opacity: 0.9; }
    .shortcut {
      background: rgba(255, 255, 255, 0.2);
      padding: 8px 16px;
      border-radius: 6px;
      display: inline-block;
      margin: 10px 5px;
      font-weight: 600;
    }

    @media print {
      .download-banner { display: none; }
      body { padding: 0; margin: 0; }
      .section { page-break-inside: avoid; }
    }

    .header {
      margin-bottom: 40px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 20px;
    }
    .header-label {
      color: #6366f1;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin: 0 0 8px 0;
    }
    .header h1 { color: #0f172a; font-size: 2.25rem; margin: 0; font-weight: 800; }
    .header-url { color: #64748b; font-size: 0.875rem; margin: 4px 0 0 0; word-break: break-all; }
    .header-meta { color: #64748b; font-size: 0.8125rem; margin-top: 10px; }

    .fallback-banner {
      background: #fffbeb;
      border: 1px solid #fcd34d;
      color: #92400e;
      padding: 14px 18px;
      border-radius: 10px;
      margin: 20px 0;
      font-size: 0.9rem;
    }

    /* Visibility hero */
    .visibility-hero {
      background: linear-gradient(135deg, #0f172a, #1e293b);
      color: white;
      padding: 40px;
      border-radius: 16px;
      text-align: center;
      margin: 32px 0;
    }
    .vh-label {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 16px;
    }
    .vh-score {
      font-size: 4.5rem;
      font-weight: 900;
      line-height: 1;
      margin: 0;
    }
    .vh-score-total { font-size: 2rem; color: #475569; font-weight: 700; }
    .vh-pct { font-size: 1.5rem; font-weight: 700; color: #e2e8f0; margin-top: 8px; }
    .vh-verdict { font-size: 1.125rem; font-weight: 700; margin-top: 12px; }
    .vh-meta { font-size: 0.8125rem; color: #64748b; margin-top: 10px; }
    .vh-bar-track { max-width: 360px; margin: 20px auto 0; height: 8px; background: #334155; border-radius: 4px; overflow: hidden; }
    .vh-bar-fill { height: 100%; border-radius: 4px; }

    /* Section */
    .section { margin: 40px 0; }
    .section h2 { color: #0f172a; font-size: 1.35rem; margin: 0 0 6px 0; font-weight: 700; }
    .section-subtitle { color: #64748b; font-size: 0.875rem; margin: 0 0 18px 0; }

    /* Engine cards */
    .engine-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .engine-card {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
      background: #f8fafc;
    }
    .engine-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
    .engine-name { font-weight: 600; color: #334155; font-size: 0.875rem; }
    .engine-count { font-weight: 700; color: #0f172a; font-size: 0.95rem; }
    .engine-count-total { font-size: 0.75rem; color: #94a3b8; font-weight: 500; }
    .engine-bar-track { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; margin-bottom: 4px; }
    .engine-bar-fill { height: 100%; border-radius: 4px; }
    .engine-pct { font-size: 0.75rem; color: #64748b; }

    /* Query-type table */
    .qt-table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
    .qt-table th { background: #f8fafc; padding: 10px 16px; text-align: left; font-size: 0.7rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #e2e8f0; }
    .qt-table td { padding: 12px 16px; font-size: 0.875rem; border-bottom: 1px solid #f1f5f9; }
    .qt-table tr:last-child td { border-bottom: none; }
    .qt-bar-wrap { display: flex; align-items: center; gap: 10px; }
    .qt-bar-track { height: 6px; width: 100px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
    .qt-bar-fill { height: 100%; border-radius: 3px; }
    .qt-pct { font-size: 0.75rem; color: #64748b; min-width: 38px; }

    /* Per-query cards */
    .pq-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .pq-card { display: flex; align-items: flex-start; gap: 10px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; padding: 12px 14px; }
    .pq-icon { font-size: 0.95rem; flex-shrink: 0; margin-top: 1px; }
    .pq-query { font-size: 0.875rem; color: #334155; line-height: 1.4; }
    .pq-meta { font-size: 0.75rem; color: #94a3b8; margin-top: 3px; }

    /* Recommendations */
    .rec-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 12px 0; background: #f8fafc; }
    .rec-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 8px; }
    .rec-title { font-weight: 700; color: #0f172a; font-size: 1rem; }
    .rec-tag { font-size: 0.7rem; font-weight: 700; padding: 3px 8px; border-radius: 6px; flex-shrink: 0; }
    .rec-tag-high { background: #fee2e2; color: #b91c1c; }
    .rec-tag-med { background: #fef3c7; color: #b45309; }
    .rec-tag-low { background: #f1f5f9; color: #64748b; }
    .rec-desc { color: #475569; font-size: 0.9rem; }

    /* Structural support section */
    .support-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
    .support-score { font-size: 1.5rem; font-weight: 700; }
    .support-score-total { font-size: 0.875rem; font-weight: 400; color: #94a3b8; }

    .param-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 18px; }
    .param-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; background: #f8fafc; }
    .param-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
    .param-name { font-weight: 600; font-size: 0.875rem; color: #334155; }
    .param-score { font-weight: 700; font-size: 1.125rem; }
    .param-bar { width: 100%; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; margin-bottom: 10px; }
    .param-bar-fill { height: 100%; border-radius: 3px; }
    .param-desc { color: #64748b; font-size: 0.8125rem; line-height: 1.5; }

    .footer { margin-top: 60px; text-align: center; padding-top: 24px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 0.8125rem; }
    .footer strong { color: #6366f1; }

    @media (max-width: 768px) {
      body { padding: 16px; }
      .vh-score { font-size: 3.5rem; }
      .engine-grid { grid-template-columns: 1fr; }
      .pq-grid { grid-template-columns: 1fr; }
      .param-grid { grid-template-columns: 1fr; }
    }
  `;

  // ── Colour helpers for structural scores (unchanged palette) ──
  const structColor = (s: number) =>
    s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : s >= 40 ? '#f97316' : '#ef4444';

  // ── Fragment: header ──
  const headerHTML = `
    <div class="header">
      <p class="header-label">AI Visibility Audit</p>
      <h1>${escapeHtml(url)}</h1>
      <p class="header-url">${escapeHtml(url)}</p>
      <p class="header-meta">
        Report generated ${new Date().toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
        })}
        ${userEmail ? ` · For ${escapeHtml(userEmail)}` : ''}
        ${resolvedIndustry ? ` · Industry: ${escapeHtml(resolvedIndustry.charAt(0).toUpperCase() + resolvedIndustry.slice(1))}` : ''}
      </p>
    </div>
  `;

  // ── Fragment: fallback hero (pre-scan case) ──
  const fallbackHTML = usesFallback
    ? `
      <div class="fallback-banner">
        <strong>Heads up:</strong> This report was generated before AI citation scanning was
        available. Re-analyse this URL to get full citation data across ChatGPT, Gemini, and
        Perplexity.
      </div>

      <div class="visibility-hero">
        <div class="vh-label">AI Readiness Score</div>
        <div class="vh-score" style="color: ${structColor(overall_score)};">
          ${overall_score}<span class="vh-score-total">/100</span>
        </div>
        <div class="vh-meta">Structural and markup readiness for AI crawlers</div>
        <div class="vh-bar-track">
          <div class="vh-bar-fill" style="width: ${overall_score}%; background: ${structColor(overall_score)};"></div>
        </div>
      </div>

      <div class="section">
        <h2>Readiness breakdown</h2>
        <div class="param-grid">
          ${parameters.map(p => renderParamCard(p.name, p.score, p.description)).join('')}
        </div>
      </div>
    `
    : '';

  // ── Fragment: primary visibility-led hero + breakdowns ──
  const primaryHTML = (!usesFallback && visibility)
    ? `
      <div class="visibility-hero">
        <div class="vh-label">AI Visibility</div>
        <div class="vh-score" style="color: white;">
          ${visibility.stats.cited}<span class="vh-score-total">/${visibility.stats.total}</span>
        </div>
        <div class="vh-pct">${formatPct(visibility.stats.rate)}% cited</div>
        <div class="vh-verdict" style="color: ${verdictColor(visibility.verdict.tone)};">
          ${visibility.verdict.label}
        </div>
        <div class="vh-meta">
          Across ChatGPT, Gemini, and Perplexity · ${visibility.totalQueriesMeta} customer queries
        </div>
        <div class="vh-bar-track">
          <div class="vh-bar-fill" style="width: ${formatPct(visibility.stats.rate)}%; background: ${rateBarColor(visibility.stats.rate)};"></div>
        </div>
      </div>

      <div class="section">
        <h2>By AI engine</h2>
        <p class="section-subtitle">How often each engine cited this site across the customer queries</p>
        <div class="engine-grid">
          ${visibility.stats.byEngine.map(e => `
            <div class="engine-card">
              <div class="engine-row">
                <span class="engine-name">${escapeHtml(e.label)}</span>
                <span class="engine-count">${e.cited}<span class="engine-count-total">/${e.total}</span></span>
              </div>
              <div class="engine-bar-track">
                <div class="engine-bar-fill" style="width: ${formatPct(e.rate)}%; background: ${rateBarColor(e.rate)};"></div>
              </div>
              <div class="engine-pct">${formatPct(e.rate)}% cited</div>
            </div>
          `).join('')}
        </div>
      </div>

      ${visibility.stats.byQueryType.length > 0 ? `
        <div class="section">
          <h2>By query type</h2>
          <p class="section-subtitle">Visibility across brand, problem, category, and comparison searches</p>
          <table class="qt-table">
            <thead>
              <tr>
                <th>Query type</th>
                <th style="text-align:center;">Cited</th>
                <th>Rate</th>
              </tr>
            </thead>
            <tbody>
              ${visibility.stats.byQueryType.map(row => `
                <tr>
                  <td style="font-weight:500;color:#334155;">${escapeHtml(row.label)}</td>
                  <td style="text-align:center;font-weight:600;color:#0f172a;">
                    ${row.cited}<span style="font-size:0.75rem;color:#94a3b8;font-weight:400;">/${row.total}</span>
                  </td>
                  <td>
                    <div class="qt-bar-wrap">
                      <div class="qt-bar-track">
                        <div class="qt-bar-fill" style="width: ${formatPct(row.rate)}%; background: ${rateBarColor(row.rate)};"></div>
                      </div>
                      <span class="qt-pct">${formatPct(row.rate)}%</span>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      ${visibility.perQueryRows.length > 0 ? `
        <div class="section">
          <h2>How this site appears in AI search</h2>
          <p class="section-subtitle">Which engines cited your site for each customer query</p>
          <div class="pq-grid">
            ${visibility.perQueryRows.map(row => {
              const anyCited = row.citedBy.length > 0;
              // Show #N when a structured rank exists; bare label otherwise.
              const citedLabels = row.citedBy
                .map((c) => {
                  const label = ENGINES.find((e) => e.id === c.model)?.label ?? c.model;
                  return c.position ? `${label} (#${c.position})` : label;
                })
                .join(', ');
              return `
                <div class="pq-card">
                  <span class="pq-icon">${anyCited ? '✅' : '❌'}</span>
                  <div style="flex:1;min-width:0;">
                    <div class="pq-query">${escapeHtml(row.prompt)}</div>
                    <div class="pq-meta">
                      ${row.queryType ? `<span style="text-transform:capitalize;">${escapeHtml(row.queryType)}</span>` : ''}
                      ${row.queryType && anyCited ? ' · ' : ''}
                      ${anyCited ? `Cited by ${escapeHtml(citedLabels)}` : 'Not cited'}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}
    `
    : '';

  // ── Fragment: recommendations ──
  const recsHTML = (recommendations && recommendations.length > 0) ? `
    <div class="section">
      <h2>Recommendations</h2>
      <p class="section-subtitle">Specific improvements to lift the visibility numbers above</p>
      ${recommendations.map(rec => `
        <div class="rec-card">
          <div class="rec-head">
            <div class="rec-title">${escapeHtml(rec.title)}</div>
            <span class="rec-tag ${
              rec.impact === 'High' ? 'rec-tag-high'
              : rec.impact === 'Medium' ? 'rec-tag-med'
              : 'rec-tag-low'
            }">${escapeHtml(rec.impact.toUpperCase())}</span>
          </div>
          <div class="rec-desc">${escapeHtml(rec.description)}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  // ── Fragment: structural support section (only on non-fallback path) ──
  // Heading flips on citation rate: "extend" framing only makes sense for
  // strong-visibility sites. For sites that need to climb, surface the gap.
  const supportHeading = visibility && visibility.stats.rate >= 0.6
    ? 'How to extend your visibility further'
    : 'Why your score could be even higher';

  const supportHTML = !usesFallback ? `
    <div class="section">
      <div class="support-header">
        <h2>${supportHeading}</h2>
        <span class="support-score" style="color: ${structColor(overall_score)};">
          ${overall_score}<span class="support-score-total">/100</span>
        </span>
      </div>
      <p class="section-subtitle">
        Structural and markup signals that make content easier for AI models to parse and cite.
        Each card shows how many points the parameter contributes toward the 100-point total —
        the levers to pull to lift the visibility numbers above.
      </p>
      <div class="param-grid">
        ${parameters.map(p => renderParamCard(p.name, p.score, p.description)).join('')}
      </div>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>AI Visibility Report — ${escapeHtml(url)}</title>
  <style>${styles}</style>
</head>
<body>
  <div class="download-banner">
    <h2>📄 Save This Report as PDF</h2>
    <p>To download this report as a PDF file:</p>
    <div>
      <span class="shortcut">Press Ctrl+P (Windows)</span>
      <span class="shortcut">Press Cmd+P (Mac)</span>
    </div>
    <p>Then select "Save as PDF" or "Microsoft Print to PDF" as your printer</p>
  </div>

  ${headerHTML}
  ${fallbackHTML}
  ${primaryHTML}
  ${recsHTML}
  ${supportHTML}

  <div class="footer">
    <p><strong>LLM Check</strong> — AI visibility audits for ChatGPT, Gemini, and Perplexity</p>
    <p>Visit <strong><a href="https://www.llmcheck.app" style="color:#6366f1;text-decoration:none;">www.llmcheck.app</a></strong> to run your own analysis</p>
  </div>
</body>
</html>`;
}

function renderParamCard(name: string, score: number, description: string): string {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';
  const contribution = computeParamContribution(name, score);
  const scoreHtml = contribution
    ? `${contribution.contribution} <span style="font-size:0.75rem;color:#94a3b8;font-weight:500;">/ ${contribution.max} pts</span>`
    : `${score}`;
  return `
    <div class="param-card">
      <div class="param-head">
        <div class="param-name">${escapeHtml(name)}</div>
        <div class="param-score" style="color: ${color};">${scoreHtml}</div>
      </div>
      <div class="param-bar">
        <div class="param-bar-fill" style="width: ${score}%; background: ${color};"></div>
      </div>
      <div class="param-desc">${escapeHtml(description)}</div>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting AI Visibility report generation...');

    const access = await validatePremiumAccess();
    if (!access.allowed) {
      console.log('❌ PDF generation denied:', access.reason);
      return NextResponse.json(
        { error: access.reason || 'Access denied' },
        { status: 403 }
      );
    }

    const { analysisResult, url, email, industry } = await request.json();
    if (!analysisResult || !url) {
      return NextResponse.json(
        { error: 'Missing analysis data or URL' },
        { status: 400 }
      );
    }

    // Fetch visibility scan server-side — any age, since a cached scan for
    // the same URL is the authoritative citation picture.
    let visibility: VisibilityContext | null = null;
    try {
      const scan = await getLatestVisibilityScanAnyAge(url);
      if (scan && scan.results.length > 0) {
        const stats = computeCitationStats(scan.results, analysisResult.queryBuckets ?? null);
        if (stats.total > 0) {
          visibility = {
            stats,
            verdict: computeVerdict(stats.rate),
            perQueryRows: buildPerQueryRows(scan.results, analysisResult.queryBuckets ?? null),
            totalQueriesMeta: scan.scan.total_queries ?? 20,
          };
        }
      }
    } catch (err) {
      console.error('[pdf] visibility scan fetch failed (non-fatal):', err);
      // Fall through to structural-led fallback layout
    }

    const htmlContent = generatePrintReadyHTML(
      analysisResult as AnalysisResult,
      url,
      email ?? null,
      industry ?? null,
      visibility,
    );

    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedUrl = String(url).replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30);
    const filename = `ai-visibility-report-${sanitizedUrl}-${timestamp}.html`;

    console.log(`✅ Visibility report ready (${visibility ? 'primary path' : 'fallback path'})`);

    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('❌ Report generation failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Report generation failed',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
