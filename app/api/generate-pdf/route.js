// app/api/generate-pdf/route.js
// PRODUCTION-ONLY PDF GENERATION - Optimized for Vercel serverless

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { put } from '@vercel/blob';
import puppeteer from 'puppeteer';

// Production-optimized Puppeteer configuration for Vercel
const getBrowser = async () => {
    console.log('🔄 Launching browser for production...');

    return await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-extensions',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-default-apps',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--memory-pressure-off'
        ],
        timeout: 60000, // 60 second timeout for production
        protocolTimeout: 60000
    });
};

// Lightweight HTML template optimized for PDF generation
function generateReportHTML(analysisResult, url, userEmail) {
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
                font-family: Arial, sans-serif;
                line-height: 1.5;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                font-size: 14px;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #2563eb;
                padding-bottom: 15px;
            }
            .header h1 {
                color: #1e40af;
                font-size: 2rem;
                margin: 0 0 10px 0;
            }
            .header p {
                color: #64748b;
                margin: 5px 0;
            }
            .score-section {
                background: #3b82f6;
                color: white;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
                margin: 20px 0;
            }
            .score-number {
                font-size: 3rem;
                font-weight: bold;
                margin: 0;
            }
            .score-label {
                font-size: 1.1rem;
                margin-top: 10px;
            }
            .progress-bar {
                width: 100%;
                height: 6px;
                background: rgba(255,255,255,0.3);
                border-radius: 3px;
                margin: 15px 0;
            }
            .progress-fill {
                height: 100%;
                background: white;
                border-radius: 3px;
                width: ${overall_score}%;
            }
            .section {
                margin: 30px 0;
                page-break-inside: avoid;
            }
            .section h2 {
                color: #1e40af;
                font-size: 1.5rem;
                margin-bottom: 15px;
                border-left: 3px solid #3b82f6;
                padding-left: 10px;
            }
            .parameter-card, .recommendation-card {
                border: 1px solid #e5e7eb;
                border-radius: 6px;
                padding: 15px;
                margin: 10px 0;
                background: #f9fafb;
                page-break-inside: avoid;
            }
            .parameter-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            .parameter-name, .recommendation-title {
                font-weight: 600;
                color: #374151;
            }
            .parameter-score {
                font-weight: bold;
                color: #059669;
            }
            .parameter-bar {
                width: 100%;
                height: 4px;
                background: #e5e7eb;
                border-radius: 2px;
                margin: 8px 0;
            }
            .parameter-fill {
                height: 100%;
                background: #10b981;
                border-radius: 2px;
            }
            .parameter-desc, .recommendation-desc {
                font-size: 0.9rem;
                color: #6b7280;
                margin-top: 8px;
            }
            .recommendation-tags {
                margin: 8px 0;
            }
            .tag {
                display: inline-block;
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 0.75rem;
                margin-right: 8px;
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
                margin-top: 40px;
                text-align: center;
                padding-top: 15px;
                border-top: 1px solid #e5e7eb;
                color: #6b7280;
                font-size: 0.85rem;
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
            <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
            ${userEmail ? `<p><strong>Report for:</strong> ${userEmail}</p>` : ''}
        </div>

        <div class="score-section">
            <div class="score-number">${overall_score}</div>
            <div class="score-label">Overall LLM Readiness Score</div>
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
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
            <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
    </body>
    </html>
    `;
}

export async function POST(request) {
    let browser = null;
    const startTime = Date.now();

    try {
        console.log('🔄 Starting PDF generation process...');

        // CLERK BILLING CHECK
        const { has, userId } = await auth();

        if (!userId) {
            console.log('❌ No user ID found');
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

        console.log('🔄 Launching browser (this may take 10-15 seconds on cold start)...');

        // LAUNCH BROWSER
        browser = await getBrowser();

        console.log('🔄 Creating page and setting content...');

        // CREATE PAGE
        const page = await browser.newPage();

        // Set smaller viewport for faster rendering
        await page.setViewport({ width: 800, height: 600 });

        // Set content with reduced wait time
        await page.setContent(htmlContent, {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        console.log('🔄 Generating PDF...');

        // GENERATE PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '15px',
                bottom: '15px',
                left: '15px',
                right: '15px'
            },
            preferCSSPageSize: true,
            timeout: 30000
        });

        console.log('✅ PDF generated successfully');

        // CLOSE BROWSER EARLY
        await browser.close();
        browser = null;

        // GENERATE FILENAME
        const timestamp = Date.now();
        const sanitizedUrl = url.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30);
        const filename = `llm-report-${sanitizedUrl}-${timestamp}.pdf`;

        console.log('🔄 Uploading to Vercel Blob...');

        // UPLOAD TO BLOB
        const blob = await put(filename, pdfBuffer, {
            access: 'public',
            contentType: 'application/pdf',
        });

        const totalTime = Date.now() - startTime;
        console.log(`✅ PDF generation completed in ${totalTime}ms`);

        return NextResponse.json({
            success: true,
            downloadUrl: blob.url,
            filename: filename,
            message: 'PDF report generated successfully',
            processingTime: `${totalTime}ms`
        });

    } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error(`❌ PDF generation failed after ${totalTime}ms:`, error.name, error.message);
        console.error('❌ Full error:', error);

        return NextResponse.json(
            {
                error: 'PDF generation failed',
                details: error.message,
                errorType: error.name,
                processingTime: `${totalTime}ms`
            },
            { status: 500 }
        );
    } finally {
        // CLEANUP
        if (browser) {
            try {
                await browser.close();
                console.log('🔄 Browser cleanup completed');
            } catch (closeError) {
                console.error('❌ Browser cleanup error:', closeError);
            }
        }
    }
}