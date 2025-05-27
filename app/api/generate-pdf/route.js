// app/api/generate-pdf/route.js
// FINAL SOLUTION - Using your exact plan slug for PDF generation

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { put } from '@vercel/blob';
import puppeteer from 'puppeteer';

// Generate HTML template for PDF (same as before)
function generateReportHTML(analysisResult, url, userEmail) {
    const { overall_score, parameters, recommendations } = analysisResult;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>LLM Readiness Report</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
                padding: 40px 20px;
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
            }
            .header p {
                color: #64748b;
                font-size: 1.1rem;
                margin: 10px 0;
            }
            .score-section {
                background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                color: white;
                padding: 30px;
                border-radius: 12px;
                text-align: center;
                margin: 30px 0;
            }
            .score-number {
                font-size: 4rem;
                font-weight: bold;
                margin: 0;
            }
            .score-label {
                font-size: 1.2rem;
                opacity: 0.9;
            }
            .progress-bar {
                width: 100%;
                height: 8px;
                background: rgba(255,255,255,0.3);
                border-radius: 4px;
                margin: 20px 0;
                overflow: hidden;
            }
            .progress-fill {
                height: 100%;
                background: white;
                border-radius: 4px;
                width: ${overall_score}%;
            }
            .section {
                margin: 40px 0;
            }
            .section h2 {
                color: #1e40af;
                font-size: 1.8rem;
                margin-bottom: 20px;
                border-left: 4px solid #3b82f6;
                padding-left: 15px;
            }
            .parameter-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin: 20px 0;
            }
            .parameter-card {
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                padding: 20px;
                background: #f9fafb;
            }
            .parameter-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            .parameter-name {
                font-weight: 600;
                color: #374151;
            }
            .parameter-score {
                font-weight: bold;
                color: #059669;
                font-size: 1.1rem;
            }
            .parameter-bar {
                width: 100%;
                height: 6px;
                background: #e5e7eb;
                border-radius: 3px;
                margin: 10px 0;
            }
            .parameter-fill {
                height: 100%;
                background: #10b981;
                border-radius: 3px;
            }
            .parameter-desc {
                font-size: 0.9rem;
                color: #6b7280;
                margin-top: 10px;
            }
            .recommendation-card {
                border: 1px solid #d1d5db;
                border-radius: 8px;
                padding: 20px;
                margin: 15px 0;
                background: white;
            }
            .recommendation-title {
                font-weight: 600;
                color: #111827;
                margin-bottom: 10px;
            }
            .recommendation-tags {
                margin: 10px 0;
            }
            .tag {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 0.8rem;
                margin-right: 10px;
                font-weight: 500;
            }
            .difficulty-tag {
                background: #dbeafe;
                color: #1e40af;
            }
            .impact-tag {
                background: #d1fae5;
                color: #065f46;
            }
            .recommendation-desc {
                color: #4b5563;
                margin-top: 10px;
            }
            .footer {
                margin-top: 60px;
                text-align: center;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                color: #6b7280;
                font-size: 0.9rem;
            }
            .footer strong {
                color: #1e40af;
            }
            @media print {
                body { margin: 0; padding: 20px; }
                .section { page-break-inside: avoid; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>LLM Readiness Report</h1>
            <p><strong>Website:</strong> ${url}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })}</p>
            ${userEmail ? `<p><strong>Report for:</strong> ${userEmail}</p>` : ''}
        </div>

        <div class="score-section">
            <div class="score-number">${overall_score}</div>
            <div class="score-label">Overall LLM Readiness Score</div>
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <p style="margin-top: 20px; opacity: 0.9;">
                Your website's optimization level for Large Language Models and AI-powered search
            </p>
        </div>

        <div class="section">
            <h2>Analysis Parameters</h2>
            <div class="parameter-grid">
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
        </div>

        <div class="section">
            <h2>Recommendations</h2>
            ${recommendations.map(rec => `
                <div class="recommendation-card">
                    <div class="recommendation-title">${rec.title}</div>
                    <div class="recommendation-tags">
                        <span class="tag difficulty-tag">Difficulty: ${rec.difficulty}</span>
                        <span class="tag impact-tag">Impact: ${rec.impact}</span>
                    </div>
                    <div class="recommendation-desc">${rec.description}</div>
                </div>
            `).join('')}
        </div>

        <div class="footer">
            <p><strong>LLM Ready</strong> - AI-Powered Website Optimization</p>
            <p>This report was generated automatically. For questions or support, contact our team.</p>
        </div>
    </body>
    </html>
    `;
}

export async function POST(request) {
    try {
        // OFFICIAL CLERK BILLING METHOD
        const { has, userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        console.log('🔄 PDF generation request for user:', userId);

        // OFFICIAL: Use has() with your exact plan slug
        const hasPremiumPlan = has({ plan: 'llm_check_premium' });

        if (!hasPremiumPlan) {
            console.log('❌ PDF generation denied: User does not have llm_check_premium plan');
            return NextResponse.json(
                { error: 'Premium subscription required' },
                { status: 403 }
            );
        }

        console.log('✅ PDF generation approved for premium user:', userId);

        // Parse request body
        const { analysisResult, url, email } = await request.json();

        if (!analysisResult || !url) {
            return NextResponse.json(
                { error: 'Missing required data' },
                { status: 400 }
            );
        }

        console.log('🔄 Generating PDF report...');

        // Generate HTML content
        const htmlContent = generateReportHTML(analysisResult, url, email);

        // Launch Puppeteer and generate PDF
        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                bottom: '20px',
                left: '20px',
                right: '20px'
            }
        });

        await browser.close();

        // Generate filename
        const timestamp = new Date().toISOString().split('T')[0];
        const sanitizedUrl = url.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50);
        const filename = `llm-report-${sanitizedUrl}-${timestamp}.pdf`;

        console.log('🔄 Uploading PDF to Vercel Blob...');

        // Upload to Vercel Blob
        const blob = await put(filename, pdfBuffer, {
            access: 'public',
            contentType: 'application/pdf',
        });

        console.log('✅ PDF uploaded successfully:', blob.url);

        // Return download URL
        return NextResponse.json({
            success: true,
            downloadUrl: blob.url,
            filename: filename,
            message: 'PDF report generated successfully'
        });

    } catch (error) {
        console.error('❌ PDF generation failed:', error);
        return NextResponse.json(
            { error: 'Failed to generate PDF report', details: error.message },
            { status: 500 }
        );
    }
}