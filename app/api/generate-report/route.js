// /src/app/api/generate-report/route.js
import { NextResponse } from 'next/server';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '@/lib/firebase';
import { doc, increment, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import puppeteer from 'puppeteer';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
    try {
        const { userId, email, websiteUrl, analysisData } = await req.json();
        const websiteHost = new URL(websiteUrl).hostname;
        const timestamp = Date.now();
        const pdfName = `${timestamp}_${websiteHost}.pdf`;

        // Generate HTML
        const html = buildHTMLReport(websiteUrl, analysisData);

        // Launch Puppeteer
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4' });
        await browser.close();

        // Upload to Firebase Storage
        const storage = getStorage();
        const fileRef = ref(storage, `reports/${userId}/${pdfName}`);
        await uploadBytes(fileRef, pdfBuffer, { contentType: 'application/pdf' });
        const downloadUrl = await getDownloadURL(fileRef);

        // Increment user's report count (create if not exists)
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, { reportsGenerated: increment(1), lastGenerated: serverTimestamp() }, { merge: true });

        // Send email via Resend
        await resend.emails.send({
            from: 'LLMCheck <reports@llmcheck.app>',
            to: email,
            subject: `Your LLMCheck report for ${websiteHost}`,
            html: `<p>Your report is ready. <a href="${downloadUrl}" target="_blank">Download it here</a>.</p>`
        });

        return NextResponse.json({ success: true, url: downloadUrl });
    } catch (err) {
        console.error('PDF generation error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

function buildHTMLReport(websiteUrl, data) {
    return `
    <html>
      <head>
        <style>
          body { font-family: sans-serif; padding: 2rem; }
          h1 { color: #333; }
          .param, .rec { margin: 1rem 0; padding: 1rem; border: 1px solid #eee; border-radius: 6px; }
        </style>
      </head>
      <body>
        <h1>LLM Optimization Report</h1>
        <p><strong>Website:</strong> ${websiteUrl}</p>
        <p><strong>Overall Score:</strong> ${data.overall_score}</p>

        <h2>Parameters</h2>
        ${data.parameters.map(p => `
          <div class="param">
            <strong>${p.name}</strong> — Score: ${p.score}<br/>
            ${p.description}
          </div>`).join('')}

        <h2>Recommendations</h2>
        ${data.recommendations.map(r => `
          <div class="rec">
            <strong>${r.title}</strong> — (${r.difficulty}, ${r.impact})<br/>
            ${r.description}
          </div>`).join('')}
      </body>
    </html>
  `;
}