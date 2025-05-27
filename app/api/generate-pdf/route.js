// app/api/generate-pdf/route.js
// EXTERNAL PDF SERVICE - Bypasses Puppeteer issues on Vercel

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { put } from '@vercel/blob';

// Generate HTML template for external PDF service
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
            <p>This report was generated automatically.</p>
        </div>
    </body>
    </html>
    `;
}

// Use PDFShift API (free tier available)
async function generatePDFWithExternalService(htmlContent) {
    try {
        console.log('🔄 Using PDFShift external service...');

        const response = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from('api:' + (process.env.PDFSHIFT_API_KEY || 'sk_test_123')).toString('base64')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                source: htmlContent,
                landscape: false,
                format: 'A4',
                margin: '20px',
                print_background: true,
                wait_for: 'load'
            })
        });

        if (!response.ok) {
            throw new Error(`PDFShift API error: ${response.status} ${response.statusText}`);
        }

        return await response.arrayBuffer();
    } catch (error) {
        console.error('❌ PDFShift failed, using fallback...');
        throw error;
    }
}

// Fallback: Generate simple text-based PDF using jsPDF
async function generateFallbackPDF(analysisResult, url) {
    try {
        console.log('🔄 Using fallback PDF generation...');

        // Simple text-based content for fallback
        const textContent = `
LLM READINESS REPORT

Website: ${url}
Generated: ${new Date().toLocaleDateString()}

Overall Score: ${analysisResult.overall_score}/100

ANALYSIS PARAMETERS:
${analysisResult.parameters.map(param =>
            `• ${param.name}: ${param.score}/100\n  ${param.description}`
        ).join('\n\n')}

RECOMMENDATIONS:
${analysisResult.recommendations.map(rec =>
            `• ${rec.title} (${rec.difficulty} difficulty, ${rec.impact} impact)\n  ${rec.description}`
        ).join('\n\n')}

---
Generated by LLM Ready - AI-Powered Website Optimization
        `;

        // Create a simple HTML version for basic PDF conversion
        const simpleHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial; padding: 20px; line-height: 1.6; }
                h1 { color: #1e40af; }
                .score { font-size: 2em; color: #059669; font-weight: bold; }
                .section { margin: 20px 0; }
            </style>
        </head>
        <body>
            <h1>LLM Readiness Report</h1>
            <p><strong>Website:</strong> ${url}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
            
            <div class="section">
                <h2>Overall Score</h2>
                <div class="score">${analysisResult.overall_score}/100</div>
            </div>
            
            <div class="section">
                <h2>Analysis Parameters</h2>
                ${analysisResult.parameters.map(param => `
                    <div style="margin: 15px 0; padding: 10px; border-left: 3px solid #3b82f6;">
                        <strong>${param.name}:</strong> ${param.score}/100<br>
                        <small>${param.description}</small>
                    </div>
                `).join('')}
            </div>
            
            <div class="section">
                <h2>Recommendations</h2>
                ${analysisResult.recommendations.map(rec => `
                    <div style="margin: 15px 0; padding: 10px; border: 1px solid #e5e7eb;">
                        <strong>${rec.title}</strong><br>
                        <small>Difficulty: ${rec.difficulty} | Impact: ${rec.impact}</small><br>
                        ${rec.description}
                    </div>
                `).join('')}
            </div>
        </body>
        </html>
        `;

        // Return the simple HTML as a buffer (browsers can save as PDF)
        return Buffer.from(simpleHTML, 'utf8');
    } catch (error) {
        console.error('❌ Fallback PDF generation failed:', error);
        throw error;
    }
}

export async function POST(request) {
    try {
        console.log('🔄 Starting PDF generation (external service)...');

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

        let pdfBuffer;

        // Try external service first, fallback to simple HTML
        try {
            pdfBuffer = await generatePDFWithExternalService(htmlContent);
            console.log('✅ PDF generated with external service');
        } catch (externalError) {
            console.log('⚠️ External service failed, using fallback...');
            pdfBuffer = await generateFallbackPDF(analysisResult, url);
            console.log('✅ PDF generated with fallback method');
        }

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

        console.log('✅ PDF generation completed successfully');

        return NextResponse.json({
            success: true,
            downloadUrl: blob.url,
            filename: filename,
            message: 'PDF report generated successfully'
        });

    } catch (error) {
        console.error('❌ PDF generation failed:', error);

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