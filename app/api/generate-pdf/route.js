// app/api/generate-pdf/route.js
// SIMPLE HTML DOWNLOAD - Guaranteed to work, users can save as PDF

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Generate a beautiful, print-ready HTML report
function generatePrintReadyHTML(analysisResult, url, userEmail) {
    const { overall_score, parameters, recommendations } = analysisResult;

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
            
            /* Responsive design */
            @media (max-width: 768px) {
                body { padding: 15px; }
                .score-number { font-size: 3.5rem; }
                .section h2 { font-size: 1.5rem; }
                .parameter-header { flex-direction: column; align-items: flex-start; }
                .parameter-score { margin-top: 10px; }
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

        <div class="footer">
            <p><strong>LLM Check</strong> - AI-Powered Website Optimization</p>
            <p>Report generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            <p>For questions or support, visit <strong><a href="https://www.llmcheck.app">www.llmcheck.app</a></strong></p>
        </div>
    </body>
    </html>
    `;
}

export async function POST(request) {
    try {
        console.log('🔄 Starting HTML report generation...');

        // CLERK BILLING CHECK
        const { has, userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const hasPremiumPlan = has({ plan: 'llm_check_premium' });

        if (!hasPremiumPlan) {
            console.log('❌ User does not have premium plan:', userId);
            return NextResponse.json(
                { error: 'Premium subscription required' },
                { status: 403 }
            );
        }

        console.log('✅ Premium user confirmed:', userId);

        // PARSE REQUEST
        const { analysisResult, url, email } = await request.json();

        if (!analysisResult || !url) {
            return NextResponse.json(
                { error: 'Missing analysis data or URL' },
                { status: 400 }
            );
        }

        console.log('🔄 Generating beautiful HTML report...');

        // GENERATE HTML REPORT
        const htmlContent = generatePrintReadyHTML(analysisResult, url, email);

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

        return NextResponse.json(
            {
                error: 'Report generation failed',
                details: error.message
            },
            { status: 500 }
        );
    }
}