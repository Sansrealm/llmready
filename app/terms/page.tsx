// app/terms/page.tsx
// Terms of Service 

import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export default function TermsOfService() {
    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">
                <div className="container mx-auto px-4 py-8 max-w-4xl">
                    <div className="prose prose-lg max-w-none">
                        <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>
                        <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Welcome to LLM Ready</h2>
                            <p className="text-gray-700 dark:text-gray-300">
                                These Terms of Service ("Terms") govern your use of LLM Ready (available at llmcheck.app),
                                an AI-powered website analysis service that evaluates your website's readiness for Large Language Models
                                and AI-powered search engines. By accessing or using our service, you agree to be bound by these Terms.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Service Description</h2>
                            <p className="text-gray-700 dark:text-gray-300">
                                LLM Ready provides automated analysis of websites to assess their optimization for Large Language Models,
                                AI search engines, and related technologies. Our service includes:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                                <li>Website structure and content analysis</li>
                                <li>SEO and technical optimization assessments</li>
                                <li>Recommendations for LLM and AI search optimization</li>
                                <li>Detailed reports and scoring metrics</li>
                                <li>Premium features including downloadable reports</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. User Accounts and Registration</h2>
                            <p className="text-gray-700 dark:text-gray-300">
                                To access certain features of our service, you must create an account through our authentication provider, Clerk.
                                You agree to:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                                <li>Provide accurate and complete information during registration</li>
                                <li>Maintain the security of your account credentials</li>
                                <li>Notify us immediately of any unauthorized access</li>
                                <li>Accept responsibility for all activities under your account</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Subscription Plans and Billing</h2>
                            <p className="text-gray-700 dark:text-gray-300">
                                LLM Ready offers both free and premium subscription plans:
                            </p>
                            <div className="mb-4">
                                <h3 className="text-xl font-medium text-gray-900 mb-2">Free Plan</h3>
                                <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
                                    <li>Limited number of website analyses per month</li>
                                    <li>Basic analysis reports</li>
                                    <li>Standard recommendations</li>
                                </ul>
                            </div>
                            <div className="mb-4">
                                <h3 className="text-xl font-medium text-gray-900 mb-2">Premium Plan</h3>
                                <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
                                    <li>Unlimited website analyses</li>
                                    <li>Detailed analysis reports with advanced insights</li>
                                    <li>Downloadable PDF reports</li>
                                    <li>Email report delivery</li>
                                    <li>Priority customer support</li>
                                </ul>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300">
                                Premium subscriptions are billed monthly or annually through Stripe. You may cancel your subscription
                                at any time through your account settings. Refunds are handled on a case-by-case basis.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Acceptable Use</h2>
                            <p className="text-gray-700 dark:text-gray-300">
                                You agree to use LLM Ready only for lawful purposes and in accordance with these Terms. You may not:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                                <li>Use the service to analyze websites you do not own or have permission to analyze</li>
                                <li>Attempt to reverse engineer, hack, or exploit our service</li>
                                <li>Submit malicious URLs or attempt to compromise our systems</li>
                                <li>Use automated tools to abuse our service or exceed rate limits</li>
                                <li>Resell or redistribute our analysis reports without permission</li>
                                <li>Use the service for any illegal or unauthorized purpose</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data and Privacy</h2>
                            <p className="text-gray-700 dark:text-gray-300">
                                We take your privacy seriously. Our collection and use of personal information is governed by our
                                Privacy Policy, which is incorporated into these Terms by reference. By using our service, you consent to:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                                <li>Our automated analysis of websites you submit</li>
                                <li>Storage of analysis results and reports</li>
                                <li>Use of cookies and tracking technologies as described in our Privacy Policy</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Intellectual Property</h2>
                            <p className="text-gray-700 dark:text-gray-300">
                                LLM Ready and all related content, features, and technology are owned by us and protected by copyright,
                                trademark, and other intellectual property laws. You are granted a limited, non-exclusive, non-transferable
                                license to use our service for its intended purpose.
                            </p>
                            <p className="text-gray-700 dark:text-gray-300">
                                Analysis reports generated for your websites are provided for your use, but the underlying analysis
                                technology and methodologies remain our intellectual property.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Disclaimer of Warranties</h2>
                            <p className="text-gray-700 dark:text-gray-300">
                                LLM Ready is provided "as is" without warranties of any kind. We do not guarantee:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                                <li>The accuracy or completeness of our analysis results</li>
                                <li>That our recommendations will improve your website's performance</li>
                                <li>Uninterrupted or error-free service</li>
                                <li>That our service will meet your specific requirements</li>
                            </ul>
                            <p className="text-gray-700 dark:text-gray-300">
                                Our analysis is automated and should be considered as guidance rather than definitive advice.
                                We recommend consulting with SEO and web development professionals for critical optimization decisions.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Limitation of Liability</h2>
                            <p className="text-gray-700 dark:text-gray-300">
                                To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special,
                                consequential, or punitive damages, including but not limited to loss of profits, data, or business
                                opportunities arising from your use of LLM Ready.
                            </p>
                            <p className="text-gray-700 dark:text-gray-300">
                                Our total liability for any claims related to the service shall not exceed the amount you have paid
                                us in the twelve months preceding the claim.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Termination</h2>
                            <p className="text-gray-700 dark:text-gray-300">
                                You may terminate your account at any time by contacting us or using the account deletion features
                                in your profile. We may suspend or terminate your access to our service at our discretion if you
                                violate these Terms or engage in harmful activities.
                            </p>
                            <p className="text-gray-700 dark:text-gray-300">
                                Upon termination, your right to use the service will cease immediately, though certain provisions
                                of these Terms will survive termination.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to Terms</h2>
                            <p className="text-gray-700 dark:text-gray-300">
                                We reserve the right to modify these Terms at any time. We will notify users of significant changes
                                by email or through our service. Your continued use of LLM Ready after changes constitute acceptance
                                of the new Terms.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contact Information</h2>
                            <p className="text-gray-700 dark:text-gray-300">
                                If you have questions about these Terms of Service, please contact us:
                            </p>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-gray-700 mb-2"><strong>Email:</strong> legal@llmcheck.app</p>
                                <p className="text-gray-700 mb-2"><strong>Website:</strong> <a href="https://llmcheck.app" className="text-blue-600 hover:underline">llmcheck.app</a></p>
                                <p className="text-gray-700"><strong>Support:</strong> support@llmcheck.app</p>
                            </div>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Governing Law</h2>
                            <p className="text-gray-700 leading-relaxed">
                                These Terms shall be governed by and construed in accordance with the laws of the United States.
                                Any disputes arising under these Terms shall be resolved through binding arbitration in accordance
                                with the rules of the American Arbitration Association.
                            </p>
                        </section>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}