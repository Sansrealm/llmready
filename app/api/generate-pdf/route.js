// app/api/generate-pdf/route.js
// DIRECT PDF DOWNLOAD - Returns PDF directly without blob storage

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Generate clean HTML template for PDF
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
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #2563eb;
                padding-bottom: 20px;
            }
            .header h1 {
                color: #1e40af;
                font-size: 2.5rem;
                margin: 0;
            }
            .header p {
                color: #64748b;
                margin: 10px 0;
            }
            .score-section {
                background: #3b82f6;
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
                margin-top: 10px;
            }
            .progress-bar {
                width: 100%;
                height: 8px;
                background: rgba(255,255,255,0.3);
                border-radius: 4px;
                margin: 20px 0;
            }
            .progress-fill {
                height: 100%;
                background: white;
                border-radius: 4px;
                width: ${overall_score}%;
            }
            .section {
                margin: 40px 0;
                page-break-inside: avoid;
            }
            .section h2 {
                color: #1e40af;
                font-size: 1.8rem;
                margin-bottom: 20px;
                border-left: 4px solid #3b82f6;
                padding-left: 15px;
            }
            .parameter-card, .recommendation-card {
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 20px;
                margin: 15px 0;
                background: #f9fafb;
                page-break-inside: avoid;
            }
            .parameter-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            .parameter-name, .recommendation-title {
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
            .parameter-desc, .recommendation-desc {
                font-size: 0.9rem;
                color: #6b7280;
                margin-top: 10px;
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
            .footer {
                margin-top: 60px;
                text-align: center;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                color: #6b7280;
                font-size: 0.9rem;
            }
            @media print {
                body { margin: 0; padding: 15px; }
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
            <p style="margin-top: 20px;">
                Your website's optimization level for Large Language Models and AI-powered search
            </p>
        </div>

        <div class="section">
            <h2>Analysis Parameters</h2>
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
            <p>This report was generated automatically on ${new Date().toLocaleDateString()}</p>
        </div>
    </body>
    </html>
    `;
}

// Convert HTML to PDF using external API
async function htmlToPdf(htmlContent) {
    try {
        console.log('🔄 Converting HTML to PDF...');

        // Using htmlcsstoimage.com API (free tier available)
        const response = await fetch('https://htmlcsstoimage.com/demo_run', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                html: htmlContent,
                css: '',
                google_fonts: 'Arial',
                selector: 'body',
                device_scale: 1,
                format: 'pdf',
                width: 800,
                height: 1200,
                quality: 100
            })
        });

        if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            console.log('✅ PDF generated with external API');
            return Buffer.from(arrayBuffer);
        } else {
            throw new Error(`External API failed: ${response.status}`);
        }
    } catch (error) {
        console.log('⚠️ External API failed, using HTML fallback...');
        throw error;
    }
}

// Create downloadable HTML file as fallback
function createDownloadableHTML(htmlContent, filename) {
    console.log('✅ Creating downloadable HTML file');

    // Add download instructions to the HTML
    const downloadableHTML = htmlContent.replace(
        '<body>',
        `<body>
        <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; margin-bottom: 20px; border-radius: 8px;">
            <h3 style="color: #92400e; margin: 0 0 10px 0;">📄 Download Instructions</h3>
            <p style="color: #92400e; margin: 0; font-size: 14px;">
                To save this report as a PDF: Press <strong>Ctrl+P</strong> (or Cmd+P on Mac), 
                then select "Save as PDF" as the destination.
            </p>
        </div>`
    );

    return Buffer.from(downloadableHTML, 'utf8');
}

export async function POST(request) {
    try {
        console.log('🔄 Starting direct PDF generation...');

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

        console.log('🔄 Generating HTML content...');

        // GENERATE HTML
        const htmlContent = generateReportHTML(analysisResult, url, email);

        // GENERATE FILENAME
        const timestamp = Date.now();
        const sanitizedUrl = url.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30);
        const filename = `llm-report-${sanitizedUrl}-${timestamp}`;

        let fileBuffer;
        let contentType;
        let downloadFilename;

        // Try PDF conversion, fallback to HTML
        try {
            fileBuffer = await htmlToPdf(htmlContent);
            contentType = 'application/pdf';
            downloadFilename = `${filename}.pdf`;
            console.log('✅ PDF generated successfully');
        } catch (pdfError) {
            console.log('⚠️ PDF conversion failed, providing HTML download...');
            fileBuffer = createDownloadableHTML(htmlContent, filename);
            contentType = 'text/html';
            downloadFilename = `${filename}.html`;
            console.log('✅ HTML download ready');
        }

        console.log('🔄 Returning file for download...');

        // RETURN FILE DIRECTLY
        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${downloadFilename}"`,
                'Content-Length': fileBuffer.length.toString(),
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

    } catch (error) {
        console.error('❌ Direct PDF generation failed:', error);

        return NextResponse.json(
            {
                error: 'PDF generation failed',
                details: error.message,
                suggestion: 'Please try again in a moment'
            },
            { status: 500 }
        );
    }
}