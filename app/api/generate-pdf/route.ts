// app/api/generate-pdf/route.ts
// SIMPLE HTML DOWNLOAD - Guaranteed to work, users can save as PDF

import { NextRequest, NextResponse } from 'next/server';
import { validatePremiumAccess } from '@/lib/auth-utils';
import { AnalysisResult, CitationGap, QueryBucket, getPrimaryCompetitor } from '@/lib/types';

// ── Bucket helpers (mirrors share page logic) ──────────────────────────────────

const BUCKET_ORDER = ['brand', 'problem', 'category', 'comparison'] as const;
const BUCKET_LABELS: Record<string, string> = {
  brand: 'Brand',
  problem: 'Problem',
  category: 'Category',
  comparison: 'Comparison',
};

function buildBucketRows(citationGaps: CitationGap[], queryBuckets: QueryBucket[]) {
  const queryTypeMap = new Map(queryBuckets.map((b) => [b.query, b.type]));
  return BUCKET_ORDER.map((type) => {
    const rows = citationGaps.filter((g) => queryTypeMap.get(g.query) === type);
    const cited = rows.filter((g) => g.status === 'cited').length;
    const total = rows.length;
    const competitor = (() => {
      for (const g of rows) {
        if (g.status === 'not_cited') {
          const c = getPrimaryCompetitor(g);
          if (c) return c;
        }
      }
      return null;
    })();
    return { type, label: BUCKET_LABELS[type] ?? type, cited, total, competitor };
  }).filter((r) => r.total > 0);
}

// Generate a beautiful, print-ready HTML report
function generatePrintReadyHTML(
    analysisResult: AnalysisResult,
    url: string,
    userEmail: string | null,
    industry?: string | null
): string {
    const { overall_score, parameters, recommendations, visibilityQueries, citationGaps, queryBuckets } = analysisResult;
    const resolvedIndustry = industry || analysisResult.industry || null;
    const hasCitationData = Array.isArray(citationGaps) && citationGaps.length > 0;
    const bucketRows = hasCitationData && Array.isArray(queryBuckets) && queryBuckets.length > 0
      ? buildBucketRows(citationGaps!, queryBuckets)
      : [];

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>LLM Readiness Report</title>
        <style>
            * { box-sizing: border-box; }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background: white;
            }
            
            /* Print Instructions Banner */
            .download-banner {
                background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                color: white;
                padding: 20px;
                border-radius: 12px;
                margin-bottom: 30px;
                text-align: center;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .download-banner h2 {
                margin: 0 0 10px 0;
                font-size: 1.5rem;
            }
            .download-banner p {
                margin: 5px 0;
                opacity: 0.9;
            }
            .download-banner .shortcut {
                background: rgba(255, 255, 255, 0.2);
                padding: 8px 16px;
                border-radius: 6px;
                display: inline-block;
                margin: 10px 5px;
                font-weight: 600;
            }
            
            /* Hide banner when printing */
            @media print {
                .download-banner { display: none; }
                body { padding: 0; margin: 0; }
                .section { page-break-inside: avoid; }
            }
            
            .header {
                text-align: center;
                margin-bottom: 40px;
                border-bottom: 3px solid #2563eb;
                padding-bottom: 20px;
            }
            .header h1 {
                color: #1e40af;
                font-size: 2.5rem;
                margin: 0;
                font-weight: 700;
            }
            .header p {
                color: #64748b;
                margin: 10px 0;
                font-size: 1.1rem;
            }
            
            .score-section {
                background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                color: white;
                padding: 40px;
                border-radius: 16px;
                text-align: center;
                margin: 40px 0;
                box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
            }
            .score-number {
                font-size: 5rem;
                font-weight: 800;
                margin: 0;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            .score-label {
                font-size: 1.3rem;
                margin-top: 15px;
                opacity: 0.95;
                font-weight: 500;
            }
            .progress-bar {
                width: 100%;
                height: 12px;
                background: rgba(255,255,255,0.3);
                border-radius: 6px;
                margin: 25px 0;
                overflow: hidden;
            }
            .progress-fill {
                height: 100%;
                background: white;
                border-radius: 6px;
                width: ${overall_score}%;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            
            .section {
                margin: 50px 0;
            }
            .section h2 {
                color: #1e40af;
                font-size: 2rem;
                margin-bottom: 25px;
                border-left: 6px solid #3b82f6;
                padding-left: 20px;
                font-weight: 600;
            }
            
            .parameter-card, .recommendation-card {
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                padding: 25px;
                margin: 20px 0;
                background: #f9fafb;
                transition: all 0.3s ease;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            }
            .parameter-card:hover, .recommendation-card:hover {
                border-color: #3b82f6;
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
            }
            
            .parameter-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }
            .parameter-name, .recommendation-title {
                font-weight: 700;
                color: #374151;
                font-size: 1.2rem;
            }
            .parameter-score {
                font-weight: 800;
                color: #059669;
                font-size: 1.3rem;
                background: #d1fae5;
                padding: 8px 16px;
                border-radius: 8px;
            }
            
            .parameter-bar {
                width: 100%;
                height: 8px;
                background: #e5e7eb;
                border-radius: 4px;
                margin: 15px 0;
                overflow: hidden;
            }
            .parameter-fill {
                height: 100%;
                background: linear-gradient(90deg, #10b981, #059669);
                border-radius: 4px;
                transition: width 0.3s ease;
            }
            
            .parameter-desc, .recommendation-desc {
                color: #6b7280;
                margin-top: 15px;
                line-height: 1.7;
                font-size: 1rem;
            }
            
            .recommendation-tags {
                margin: 15px 0;
            }
            .tag {
                display: inline-block;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 0.9rem;
                margin-right: 12px;
                font-weight: 600;
                margin-bottom: 8px;
            }
            .difficulty-tag {
                background: #dbeafe;
                color: #1e40af;
                border: 1px solid #3b82f6;
            }
            .impact-tag {
                background: #d1fae5;
                color: #065f46;
                border: 1px solid #10b981;
            }
            
            .footer {
                margin-top: 60px;
                text-align: center;
                padding-top: 30px;
                border-top: 2px solid #e5e7eb;
                color: #6b7280;
            }
            .footer strong {
                color: #1e40af;
                font-size: 1.2rem;
            }
            
            /* Citation gap cards */
            .citation-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                margin-top: 16px;
            }
            .citation-card {
                display: flex;
                align-items: flex-start;
                gap: 10px;
                border: 1px solid #e5e7eb;
                border-radius: 10px;
                background: #f9fafb;
                padding: 12px 14px;
            }
            .citation-icon { font-size: 1rem; flex-shrink: 0; margin-top: 1px; }
            .citation-query { font-size: 0.875rem; color: #374151; line-height: 1.4; }
            .citation-meta { font-size: 0.75rem; color: #9ca3af; margin-top: 3px; }
            .citation-pos { font-size: 0.75rem; font-weight: 600; color: #059669; flex-shrink: 0; }

            /* Bucket summary table */
            .bucket-table { width: 100%; border-collapse: collapse; margin-top: 16px; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
            .bucket-table th { background: #f9fafb; padding: 10px 16px; text-align: left; font-size: 0.75rem; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb; }
            .bucket-table td { padding: 12px 16px; font-size: 0.875rem; border-bottom: 1px solid #f3f4f6; }
            .bucket-table tr:last-child td { border-bottom: none; }
            .bucket-bar-wrap { display: flex; flex-direction: column; align-items: center; gap: 4px; }
            .bucket-bar-track { height: 6px; width: 64px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }

            /* Responsive design */
            @media (max-width: 768px) {
                body { padding: 15px; }
                .score-number { font-size: 3.5rem; }
                .section h2 { font-size: 1.5rem; }
                .parameter-header { flex-direction: column; align-items: flex-start; }
                .parameter-score { margin-top: 10px; }
                .citation-grid { grid-template-columns: 1fr; }
            }
            @media print {
                .citation-grid { grid-template-columns: 1fr 1fr; }
            }
        </style>
    </head>
    <body>
        <!-- Download Instructions (hidden when printing) -->
        <div class="download-banner">
            <h2>📄 Save This Report as PDF</h2>
            <p>To download this report as a PDF file:</p>
            <div>
                <span class="shortcut">Press Ctrl+P (Windows)</span>
                <span class="shortcut">Press Cmd+P (Mac)</span>
            </div>
            <p>Then select "Save as PDF" or "Microsoft Print to PDF" as your printer</p>
        </div>

        <div class="header">
            <h1>LLM Readiness Report</h1>
            <p><strong>Website Analyzed:</strong> ${url}</p>
            <p><strong>Report Generated:</strong> ${new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })}</p>
            ${userEmail ? `<p><strong>Report For:</strong> ${userEmail}</p>` : ''}
            ${resolvedIndustry ? `<p><strong>Industry:</strong> ${resolvedIndustry.charAt(0).toUpperCase() + resolvedIndustry.slice(1)}</p>` : ''}
        </div>

        <div class="score-section">
            <div class="score-number">${overall_score}</div>
            <div class="score-label">Overall LLM Readiness Score</div>
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <p style="margin-top: 20px; font-size: 1.1rem; opacity: 0.9;">
                Your website's optimization level for Large Language Models and AI-powered search
            </p>
        </div>

        <div class="section">
            <h2>📊 Analysis Parameters</h2>
            ${parameters.map(param => `
                <div class="parameter-card">
                    <div class="parameter-header">
                        <span class="parameter-name">${param.name}</span>
                        <span class="parameter-score">${param.score}/100</span>
                    </div>
                    <div class="parameter-bar">
                        <div class="parameter-fill" style="width: ${param.score}%"></div>
                    </div>
                    <div class="parameter-desc">${param.description}</div>
                </div>
            `).join('')}
        </div>

        <div class="section">
            <h2>💡 Recommendations</h2>
            ${recommendations.map((rec, index) => `
                <div class="recommendation-card">
                    <div class="recommendation-title">${index + 1}. ${rec.title}</div>
                    <div class="recommendation-tags">
                        <span class="tag difficulty-tag">Difficulty: ${rec.difficulty}</span>
                        <span class="tag impact-tag">Impact: ${rec.impact}</span>
                    </div>
                    <div class="recommendation-desc">${rec.description}</div>
                </div>
            `).join('')}
        </div>

        ${hasCitationData ? `
        <div class="section">
            <h2>🔍 AI Citation Audit</h2>
            <p style="color:#6b7280;margin-bottom:4px;">Whether Perplexity cites this site across 20 customer search queries</p>
            <div class="citation-grid">
                ${citationGaps!.map((gap) => `
                    <div class="citation-card">
                        <span class="citation-icon">${gap.status === 'cited' ? '✅' : '❌'}</span>
                        <div style="flex:1;min-width:0;">
                            <div class="citation-query">${gap.query}</div>
                            <div class="citation-meta">
                                ${gap.query_type ? `<span style="text-transform:capitalize;">${gap.query_type}</span>` : ''}
                                ${gap.status === 'not_cited' && getPrimaryCompetitor(gap) ? `· ${getPrimaryCompetitor(gap)}` : ''}
                            </div>
                        </div>
                        ${gap.status === 'cited' && gap.citation_position ? `<span class="citation-pos">#${gap.citation_position}</span>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        ${bucketRows.length > 0 ? `
        <div class="section">
            <h2>📊 Visibility by Query Type</h2>
            <p style="color:#6b7280;margin-bottom:4px;">How often Perplexity cites this site across different search intents</p>
            <table class="bucket-table">
                <thead>
                    <tr>
                        <th>Query Type</th>
                        <th style="text-align:center;">Perplexity</th>
                        <th>Displacing</th>
                    </tr>
                </thead>
                <tbody>
                    ${bucketRows.map((row) => {
                        const pct = row.total > 0 ? Math.round((row.cited / row.total) * 100) : 0;
                        const barColor = row.cited >= 4 ? '#34d399' : row.cited >= 2 ? '#fbbf24' : '#f87171';
                        const textColor = row.cited >= 4 ? '#059669' : row.cited >= 2 ? '#d97706' : '#dc2626';
                        return `
                    <tr>
                        <td style="font-weight:500;color:#374151;">${row.label}</td>
                        <td>
                            <div class="bucket-bar-wrap">
                                <span style="font-size:0.875rem;font-weight:600;color:${textColor};">${row.cited}<span style="font-size:0.75rem;font-weight:400;color:#9ca3af;">/${row.total}</span></span>
                                <div class="bucket-bar-track"><div style="height:100%;border-radius:3px;background:${barColor};width:${pct}%;"></div></div>
                            </div>
                        </td>
                        <td style="font-size:0.75rem;color:#9ca3af;">${row.competitor ?? '—'}</td>
                    </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        <div class="footer">
            <p><strong>LLM Check</strong> - AI-Powered Website Optimization</p>
            <p>Report generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            <p>For questions or support, visit <strong><a href="https://www.llmcheck.app">www.llmcheck.app</a></strong></p>
        </div>
    </body>
    </html>
    `;
}

export async function POST(request: NextRequest) {
    try {
        console.log('🔄 Starting HTML report generation...');

        // PREMIUM ACCESS & LIMIT VALIDATION
        const access = await validatePremiumAccess();

        if (!access.allowed) {
            console.log('❌ PDF generation denied:', access.reason);
            return NextResponse.json(
                { error: access.reason || 'Access denied' },
                { status: 403 }
            );
        }

        console.log('✅ Premium user validated with limit check');

        // PARSE REQUEST
        const { analysisResult, url, email, industry } = await request.json();

        if (!analysisResult || !url) {
            return NextResponse.json(
                { error: 'Missing analysis data or URL' },
                { status: 400 }
            );
        }

        console.log('🔄 Generating beautiful HTML report...');

        // GENERATE HTML REPORT
        const htmlContent = generatePrintReadyHTML(analysisResult, url, email, industry);

        // GENERATE FILENAME
        const timestamp = new Date().toISOString().split('T')[0];
        const sanitizedUrl = url.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30);
        const filename = `llm-readiness-report-${sanitizedUrl}-${timestamp}.html`;

        console.log('✅ HTML report ready for download');

        // RETURN HTML FILE FOR DOWNLOAD
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
        console.error('❌ HTML report generation failed:', error);

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