// app/privacy/page.tsx
// Privacy Policy page

import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export const metadata: Metadata = {
  title: "Privacy Policy — LLM Check",
  description:
    "Read LLM Check's Privacy Policy. Learn how we collect, use, and protect your data when you use our AI website analysis and visibility tools.",
  openGraph: {
    title: "Privacy Policy — LLM Check",
    description:
      "Read LLM Check's Privacy Policy. Learn how we collect, use, and protect your data when you use our AI website analysis and visibility tools.",
    url: "https://llmcheck.app/privacy",
    type: "website",
    images: [{ url: "https://llmcheck.app/og-image.png", width: 1200, height: 630 }],
  },
};

export default function PrivacyPolicy() {
    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">
                <div className="container mx-auto px-4 py-8 max-w-4xl">
                    <div className="prose prose-lg max-w-none">
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">Privacy Policy</h1>
                        <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Introduction</h2>
                            <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300 leading-relaxed mb-4">
                                Welcome to LLM Check ("we," "our," or "us"). We are committed to protecting your privacy and ensuring
                                the security of your personal information. This Privacy Policy explains how we collect, use, disclose,
                                and safeguard your information when you use our website analysis service available at llmcheck.app.
                            </p>
                            <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300 leading-relaxed mb-4">
                                By using our service, you agree to the collection and use of information in accordance with this policy.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">1. Information We Collect</h2>

                            <div className="mb-6">
                                <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">Personal Information</h3>
                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                                    We collect personal information that you voluntarily provide when using our service:
                                </p>
                                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
                                    <li><strong>Account Information:</strong> Email address, name, and profile information when you create an account through Clerk</li>
                                    <li><strong>Contact Information:</strong> Email address when you contact us for support</li>
                                    <li><strong>Payment Information:</strong> Billing details processed securely through Stripe (we do not store payment card information)</li>
                                    <li><strong>Website URLs:</strong> URLs of websites you submit for analysis</li>
                                </ul>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">Automatically Collected Information</h3>
                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                                    We automatically collect certain information when you use our service:
                                </p>
                                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
                                    <li><strong>Usage Data:</strong> Pages visited, time spent, features used, and interaction patterns</li>
                                    <li><strong>Device Information:</strong> Browser type, operating system, device identifiers</li>
                                    <li><strong>Log Data:</strong> IP address, access times, pages requested, and referrer URLs</li>
                                    <li><strong>Cookies and Tracking:</strong> Session cookies, authentication tokens, and analytics data</li>
                                </ul>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">Website Analysis Data</h3>
                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                                    When you submit a website for analysis, we collect:
                                </p>
                                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
                                    <li>Website content, structure, and metadata</li>
                                    <li>Technical specifications and performance metrics</li>
                                    <li>SEO and optimization data</li>
                                    <li>Analysis results and scoring metrics</li>
                                </ul>
                            </div>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">2. How We Use Your Information</h2>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                                We use the collected information for the following purposes:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
                                <li><strong>Service Provision:</strong> To provide website analysis, generate reports, and deliver requested features</li>
                                <li><strong>Account Management:</strong> To create and maintain your account, process subscriptions, and manage billing</li>
                                <li><strong>Communication:</strong> To send service-related notifications, support responses, and important updates</li>
                                <li><strong>Improvement:</strong> To analyze usage patterns, improve our algorithms, and enhance user experience</li>
                                <li><strong>Security:</strong> To detect fraud, prevent abuse, and maintain the security of our service</li>
                                <li><strong>Legal Compliance:</strong> To comply with applicable laws and regulations</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">3. Information Sharing and Disclosure</h2>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                                We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:
                            </p>

                            <div className="mb-6">
                                <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">Service Providers</h3>
                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                                    We work with trusted third-party service providers who assist us in operating our service:
                                </p>
                                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
                                    <li><strong>Clerk:</strong> Authentication and user management services</li>
                                    <li><strong>Stripe:</strong> Payment processing and subscription management</li>
                                    <li><strong>Vercel:</strong> Hosting and infrastructure services</li>
                                    <li><strong>Analytics Providers:</strong> Website usage analytics and performance monitoring</li>
                                </ul>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">Legal Requirements</h3>
                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                                    We may disclose your information if required by law or in response to:
                                </p>
                                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
                                    <li>Valid legal process or government requests</li>
                                    <li>Enforcement of our Terms of Service</li>
                                    <li>Protection of our rights, property, or safety</li>
                                    <li>Prevention of fraud or illegal activities</li>
                                </ul>
                            </div>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">4. Data Security</h2>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                                We implement appropriate technical and organizational measures to protect your personal information:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
                                <li><strong>Encryption:</strong> All data transmission is encrypted using SSL/TLS protocols</li>
                                <li><strong>Access Controls:</strong> Strict access controls and authentication requirements</li>
                                <li><strong>Regular Audits:</strong> Regular security assessments and vulnerability testing</li>
                                <li><strong>Data Minimization:</strong> We collect only the information necessary for our service</li>
                                <li><strong>Secure Infrastructure:</strong> Industry-standard cloud security practices</li>
                            </ul>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                                However, no method of transmission over the Internet or electronic storage is 100% secure.
                                While we strive to protect your information, we cannot guarantee absolute security.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">5. Data Retention</h2>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                                We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this policy:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
                                <li><strong>Account Data:</strong> Retained while your account is active and for a reasonable period after deletion</li>
                                <li><strong>Analysis Data:</strong> Website analysis results are retained to provide historical reporting and service improvement</li>
                                <li><strong>Usage Logs:</strong> Typically retained for 12 months for security and analytical purposes</li>
                                <li><strong>Billing Records:</strong> Retained as required by law and accounting standards</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">6. Your Privacy Rights</h2>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                                Depending on your location, you may have the following rights regarding your personal information:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
                                <li><strong>Access:</strong> Request access to your personal information</li>
                                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                                <li><strong>Portability:</strong> Request a copy of your data in a portable format</li>
                                <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
                                <li><strong>Objection:</strong> Object to processing of your personal information</li>
                            </ul>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                                To exercise these rights, please contact us using the information provided below. We will respond to your request within a reasonable timeframe.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">7. Cookies and Tracking Technologies</h2>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                                We use cookies and similar tracking technologies to enhance your experience:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
                                <li><strong>Essential Cookies:</strong> Required for authentication and core service functionality</li>
                                <li><strong>Analytics Cookies:</strong> Help us understand how you use our service</li>
                                <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                            </ul>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                                You can control cookie settings through your browser, but disabling certain cookies may affect service functionality.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">8. International Data Transfers</h2>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                                Our service is hosted in the United States. If you are accessing our service from outside the United States,
                                your information may be transferred to, stored, and processed in the United States. We ensure appropriate
                                safeguards are in place for international data transfers in compliance with applicable privacy laws.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">9. Children's Privacy</h2>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                                Our service is not intended for individuals under 18 years of age. We do not knowingly collect personal
                                information from children under 18. If we become aware that we have collected personal information from
                                a child under 18, we will take steps to delete such information promptly.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">10. Changes to This Privacy Policy</h2>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                                We may update this Privacy Policy from time to time to reflect changes in our practices or applicable laws.
                                We will notify you of any material changes by:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 mb-4">
                                <li>Posting the updated policy on our website</li>
                                <li>Sending email notifications for significant changes</li>
                                <li>Updating the "Last updated" date at the top of this policy</li>
                            </ul>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                                Your continued use of our service after changes to this policy constitutes acceptance of the updated terms.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">11. Contact Us</h2>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                                If you have questions about this Privacy Policy or our privacy practices, please contact us:
                            </p>
                            <div className="mb-8">
                                <p className="text-gray-700 dark:text-gray-300 mb-2"><strong>Website:</strong> <a href="https://llmcheck.app" className="text-blue-600 hover:underline">www.llmcheck.app</a></p>
                            </div>
                        </section>

                        <section className="mb-8">
                            <p className="text-gray-600 text-sm">
                                This Privacy Policy is effective as of the date listed above and applies to all information collected by LLMCheck.
                            </p>
                        </section>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}