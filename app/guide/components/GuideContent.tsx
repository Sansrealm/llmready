import React from 'react';
import Link from 'next/link';

// Import icons for sections
function LightbulbIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  );
}

function ChartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  );
}

function StepsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 12h8" />
      <path d="M4 18h8" />
      <path d="M4 6h8" />
      <path d="m15 9 3 3-3 3" />
    </svg>
  );
}

function ShieldIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function SettingsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v6m0 6v6" />
      <path d="M4.22 4.22l4.24 4.24m7.07 7.07l4.24 4.24" />
      <path d="M1 12h6m6 0h6" />
      <path d="M4.22 19.78l4.24-4.24m7.07-7.07l4.24-4.24" />
    </svg>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function GuideContent() {
  return (
    <>
      <section id="what-is-llm-optimization" className="mb-20">
        <div className="flex items-center gap-3 mb-8">
          <LightbulbIcon className="w-8 h-8 text-green-600 dark:text-green-500" />
          <h2 className="text-3xl font-bold">What is LLM Optimization?</h2>
        </div>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">Think of LLM optimization as the new SEO — except instead of optimizing for Google's crawlers, you're optimizing for AI systems that decide what gets quoted, cited, and recommended in billions of conversations happening right now.</p>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">When someone asks ChatGPT "What's the best project management tool?" or Perplexity "How do I improve team productivity?" — your brand either shows up in that answer, or it doesn't.</p>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">LLM optimization is the practice of structuring your content, authority signals, and digital presence so AI models consistently find, understand, and cite your expertise when it matters most.</p>
        <div className="bg-yellow-50 dark:bg-yellow-950/50 p-6 rounded-lg my-8 shadow-sm">
          <p className="text-gray-800 dark:text-gray-200">The stakes? Gartner predicts that 50% of search engine traffic will be gone by 2028. The opportunity? Most brands haven't figured this out yet.</p>
        </div>
      </section>

      <section id="why-traditional-seo-falls-short" className="mb-20">
        <div className="flex items-center gap-3 mb-8">
          <ChartIcon className="w-8 h-8 text-green-600 dark:text-green-500" />
          <h2 className="text-3xl font-bold">Why Traditional SEO Falls Short</h2>
        </div>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">Google's algorithms taught us to think in keywords, backlinks, and page rankings. But LLMs operate on completely different principles:</p>
        <ul className="space-y-4 mt-8 ml-6">
          <li className="text-gray-700 dark:text-gray-300"><strong className="text-gray-900 dark:text-gray-100">They don't crawl in real time.</strong> Most AI models work from training data snapshots, not live web scraping.</li>
          <li className="text-gray-700 dark:text-gray-300"><strong className="text-gray-900 dark:text-gray-100">They prioritize meaning over metrics.</strong> Instead of counting keyword density, they understand conceptual relationships and semantic proximity.</li>
          <li className="text-gray-700 dark:text-gray-300"><strong className="text-gray-900 dark:text-gray-100">They synthesize, don't just rank.</strong> Rather than showing you a list of 10 blue links, they create new content by pulling from multiple sources.</li>
          <li className="text-gray-700 dark:text-gray-300"><strong className="text-gray-900 dark:text-gray-100">They remember what they learned.</strong> Once your content gets embedded in their training data, it influences thousands of future conversations.</li>
        </ul>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-8">This shift means you need to think beyond "How do I rank #1?" and start asking "How do I become the definitive source AI models turn to when discussing my expertise?"</p>
      </section>

      <section id="core-principles" className="mb-20">
        <div className="flex items-center gap-3 mb-8">
          <svg
            className="w-8 h-8 text-green-600 dark:text-green-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2 2 7l10 5 10-5-10-5Z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <h2 className="text-3xl font-bold">The Core Principles That Actually Matter</h2>
        </div>
        
        <section id="write-for-understanding" className="mb-16">
          <h3 className="text-2xl font-semibold mt-12 mb-6">Write for Understanding, Not Rankings</h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">AI models excel at recognizing clear, well-structured thinking. Your content should explain concepts like you're teaching someone intelligent but unfamiliar with your field.</p>
          
          <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-lg my-8 shadow-sm">
            <h4 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">What this looks like:</h4>
            <ul className="list-disc pl-6 space-y-3">
              <li className="text-gray-700 dark:text-gray-300">Lead with the main point, then support it</li>
              <li className="text-gray-700 dark:text-gray-300">Use short paragraphs (2-3 sentences max)</li>
              <li className="text-gray-700 dark:text-gray-300">Define technical terms in context</li>
              <li className="text-gray-700 dark:text-gray-300">Create logical information hierarchies with proper headers</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-400 mt-4 italic"><strong>Why it works:</strong> LLMs interpret meaning by analyzing the proximity of words and phrases, so clear conceptual relationships make your content easier to parse and cite.</p>
          </div>
        </section>

        <section id="comprehensive-topic-coverage" className="mb-16">
          <h3 className="text-2xl font-semibold mb-6">Build Comprehensive Topic Coverage</h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">Instead of creating thin content around individual keywords, develop deep expertise clusters around core themes. AI models favor sources that demonstrate thorough understanding of a subject area.</p>
          
          <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-lg my-8 shadow-sm">
            <h4 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">What this looks like:</h4>
            <ul className="list-disc pl-6 space-y-3">
              <li className="text-gray-700 dark:text-gray-300">Create pillar content that covers a topic comprehensively</li>
              <li className="text-gray-700 dark:text-gray-300">Link related subtopics together with descriptive anchor text</li>
              <li className="text-gray-700 dark:text-gray-300">Answer the follow-up questions people actually ask</li>
              <li className="text-gray-700 dark:text-gray-300">Update and expand existing content regularly</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-400 mt-4 italic"><strong>Why it works:</strong> Comprehensive coverage signals to AI that you're an authoritative source worth citing across multiple related queries.</p>
          </div>
        </section>

        <section id="ai-friendly-content-elements" className="mb-16">
          <h3 className="text-2xl font-semibold mb-6">Craft AI-Friendly Content Elements</h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">Research shows that websites with quotes, statistics, and citations see 30-40% higher visibility in LLM responses. These elements serve as perfect "quotable moments" for AI systems.</p>
          
          <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-lg my-8 shadow-sm">
            <h4 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">What this looks like:</h4>
            <ul className="list-disc pl-6 space-y-3">
              <li className="text-gray-700 dark:text-gray-300">Include memorable statistics and data points</li>
              <li className="text-gray-700 dark:text-gray-300">Create quotable insights that stand alone</li>
              <li className="text-gray-700 dark:text-gray-300">Cite credible sources for your claims</li>
              <li className="text-gray-700 dark:text-gray-300">Structure key information in scannable formats</li>
            </ul>
            
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
              <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Example transformation:</h5>
              <p className="text-red-600 dark:text-red-400 mb-2"><strong>Instead of:</strong> "Our software helps businesses be more productive."</p>
              <p className="text-green-600 dark:text-green-400"><strong>Try:</strong> "Companies using automated workflow tools report 34% faster project completion rates, according to a 2024 McKinsey study."</p>
            </div>
          </div>
        </section>
      </section>

      <section id="technical-structure" className="mb-20">
        <div className="flex items-center gap-3 mb-8">
          <svg
            className="w-8 h-8 text-green-600 dark:text-green-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M7 7h10" />
            <path d="M7 12h10" />
            <path d="M7 17h10" />
          </svg>
          <h2 className="text-3xl font-bold">Technical Structure That AI Models Love</h2>
        </div>
        
        <section id="semantic-html" className="mb-16">
          <h3 className="text-2xl font-semibold mt-8 mb-4">Semantic HTML is Your Foundation</h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">AI models use HTML structure to understand content hierarchy and meaning. Clean, semantic markup acts like a roadmap for content interpretation.</p>
          
          <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-lg my-6">
            <h4 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Essential elements:</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li className="text-gray-700 dark:text-gray-300"><code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">&lt;article&gt;</code> for main content pieces</li>
              <li className="text-gray-700 dark:text-gray-300"><code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">&lt;h1&gt;</code> through <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">&lt;h6&gt;</code> for logical content hierarchy</li>
              <li className="text-gray-700 dark:text-gray-300"><code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">&lt;section&gt;</code> for distinct content areas</li>
              <li className="text-gray-700 dark:text-gray-300"><code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">&lt;blockquote&gt;</code> with <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">cite</code> attributes for quoted material</li>
              <li className="text-gray-700 dark:text-gray-300"><code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">&lt;figure&gt;</code> and <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">&lt;figcaption&gt;</code> for visual content</li>
            </ul>
          </div>
        </section>

        <section id="strategic-internal-linking" className="mb-16">
          <h3 className="text-2xl font-semibold mb-6">Strategic Internal Linking</h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">AI models learn content relationships through link patterns. A well-connected internal link structure reinforces your topical authority and helps models understand how your expertise areas connect.</p>
          
          <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-lg my-8 shadow-sm">
            <h4 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Best practices:</h4>
            <ul className="list-disc pl-6 space-y-3">
              <li className="text-gray-700 dark:text-gray-300">Link from overview pages to detailed subtopics</li>
              <li className="text-gray-700 dark:text-gray-300">Use descriptive anchor text that explains the destination</li>
              <li className="text-gray-700 dark:text-gray-300">Connect related concepts across different content pieces</li>
              <li className="text-gray-700 dark:text-gray-300">Avoid generic phrases like "click here" or "read more"</li>
            </ul>
          </div>
        </section>

        <section id="multimodal-content-optimization" className="mb-16">
          <h3 className="text-2xl font-semibold mb-6">Optimize for Multiple Content Formats</h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">Modern AI models are increasingly multimodal — they process text, images, audio, and video. Make all your content accessible across formats.</p>
          
          <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-lg my-8 shadow-sm">
            <h4 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Implementation:</h4>
            <ul className="list-disc pl-6 space-y-3">
              <li className="text-gray-700 dark:text-gray-300">Write detailed alt text for images that describes both content and context</li>
              <li className="text-gray-700 dark:text-gray-300">Provide transcripts for audio and video content</li>
              <li className="text-gray-700 dark:text-gray-300">Create visual summaries of complex concepts</li>
              <li className="text-gray-700 dark:text-gray-300">Use captions and descriptions that add value beyond the visual</li>
            </ul>
          </div>
        </section>
      </section>

      <section id="building-authority" className="mb-20">
        <div className="flex items-center gap-3 mb-8">
          <ShieldIcon className="w-8 h-8 text-green-600 dark:text-green-500" />
          <h2 className="text-3xl font-bold">Building Authority That AI Models Recognize</h2>
        </div>
        
        <section id="establish-expertise-signals" className="mb-16">
          <h3 className="text-2xl font-semibold mt-8 mb-4">Establish Clear Expertise Signals</h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">AI models increasingly prioritize content from credible sources. Make your expertise obvious and verifiable.</p>
          
          <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-lg my-6">
            <h4 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">What this includes:</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li className="text-gray-700 dark:text-gray-300">Detailed author bios with credentials and links</li>
              <li className="text-gray-700 dark:text-gray-300">Clear organizational authority and mission statements</li>
              <li className="text-gray-700 dark:text-gray-300">Transparent sourcing and methodology explanations</li>
              <li className="text-gray-700 dark:text-gray-300">Professional profiles and industry recognition</li>
            </ul>
          </div>
        </section>

        <section id="leverage-external-validation" className="mb-16">
          <h3 className="text-2xl font-semibold mb-6">Leverage External Validation</h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">Brand mentions and recommendations in LLMs are strongly tied to Wikipedia presence, since Wikipedia comprises a significant portion of LLM training data. But that's just the starting point.</p>
          
          <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-lg my-8 shadow-sm">
            <h4 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Authority-building strategies:</h4>
            <ul className="list-disc pl-6 space-y-3">
              <li className="text-gray-700 dark:text-gray-300">Seek coverage in industry publications and news sources</li>
              <li className="text-gray-700 dark:text-gray-300">Contribute to relevant professional discussions and forums</li>
              <li className="text-gray-700 dark:text-gray-300">Build partnerships with other recognized authorities</li>
              <li className="text-gray-700 dark:text-gray-300">Document your expertise through case studies and research</li>
            </ul>
          </div>
        </section>

        <section id="create-citable-content" className="mb-16">
          <h3 className="text-2xl font-semibold mb-6">Create Citable Content</h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">AI models love content they can directly quote and attribute. Structure your insights to be easily extractable and shareable.</p>
          
          <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-lg my-8 shadow-sm">
            <h4 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Format examples:</h4>
            <ul className="list-disc pl-6 space-y-3">
              <li className="text-gray-700 dark:text-gray-300">Key definitions in bold or highlighted text</li>
              <li className="text-gray-700 dark:text-gray-300">Numbered insights and frameworks</li>
              <li className="text-gray-700 dark:text-gray-300">Clear data points with proper attribution</li>
              <li className="text-gray-700 dark:text-gray-300">Standalone paragraphs that summarize key concepts</li>
            </ul>
          </div>
        </section>
      </section>

      <section id="action-plan" className="mb-20">
        <div className="flex items-center gap-3 mb-8">
          <StepsIcon className="w-8 h-8 text-green-600 dark:text-green-500" />
          <h2 className="text-3xl font-bold mt-16">Your Action Plan</h2>
        </div>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">Ready to optimize your content for the AI era? Here's your step-by-step roadmap:</p>

        <div className="space-y-8">
          <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-lg shadow-sm">
            <div className="flex items-start gap-4">
              <span className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-500 font-semibold text-lg">
                1
              </span>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Week 1: Audit and Assessment</h3>
                <ul className="list-disc pl-6 space-y-3">
                  <li className="text-gray-700 dark:text-gray-300">Run your key pages through <Link href="/" className="text-green-600 dark:text-green-500 hover:underline">llmcheck.app</Link> for baseline scores</li>
                  <li className="text-gray-700 dark:text-gray-300">Test AI models with questions related to your expertise</li>
                  <li className="text-gray-700 dark:text-gray-300">Identify gaps in your topic coverage and content structure</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-lg shadow-sm">
            <div className="flex items-start gap-4">
              <span className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-500 font-semibold text-lg">
                2
              </span>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Week 2: Quick Wins</h3>
                <ul className="list-disc pl-6 space-y-3">
                  <li className="text-gray-700 dark:text-gray-300">Improve your HTML structure and semantic markup</li>
                  <li className="text-gray-700 dark:text-gray-300">Add clear statistics and quotable insights to existing content</li>
                  <li className="text-gray-700 dark:text-gray-300">Optimize your metadata and page descriptions</li>
                  <li className="text-gray-700 dark:text-gray-300">Create internal links between related content pieces</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-lg shadow-sm">
            <div className="flex items-start gap-4">
              <span className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-500 font-semibold text-lg">
                3
              </span>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Week 3: Content Enhancement</h3>
                <ul className="list-disc pl-6 space-y-3">
                  <li className="text-gray-700 dark:text-gray-300">Expand thin content into comprehensive topic coverage</li>
                  <li className="text-gray-700 dark:text-gray-300">Add credible citations and source links</li>
                  <li className="text-gray-700 dark:text-gray-300">Create FAQ sections for common questions in your field</li>
                  <li className="text-gray-700 dark:text-gray-300">Develop clear expertise signals and author information</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-lg shadow-sm">
            <div className="flex items-start gap-4">
              <span className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-500 font-semibold text-lg">
                4
              </span>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Month 2: Ongoing Optimization</h3>
                <ul className="list-disc pl-6 space-y-3">
                  <li className="text-gray-700 dark:text-gray-300">Set up AI referral traffic tracking</li>
                  <li className="text-gray-700 dark:text-gray-300">Begin regular testing with AI models</li>
                  <li className="text-gray-700 dark:text-gray-300">Start building authority through external mentions and partnerships</li>
                  <li className="text-gray-700 dark:text-gray-300">Plan content refresh cycles for maintaining accuracy</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-lg shadow-sm">
            <div className="flex items-start gap-4">
              <span className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-500 font-semibold text-lg">
                ∞
              </span>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Ongoing: Measurement and Iteration</h3>
                <ul className="list-disc pl-6 space-y-3">
                  <li className="text-gray-700 dark:text-gray-300">Monitor your <Link href="/" className="text-green-600 dark:text-green-500 hover:underline">llmcheck.app</Link> scores over time</li>
                  <li className="text-gray-700 dark:text-gray-300">Track AI mentions and brand visibility</li>
                  <li className="text-gray-700 dark:text-gray-300">Analyze referral traffic patterns and user behavior</li>
                  <li className="text-gray-700 dark:text-gray-300">Adapt strategies based on new AI platform developments</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="technical-details" className="mb-20">
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="w-8 h-8 text-green-600 dark:text-green-500" />
          <h2 className="text-3xl font-bold">The Technical Details That Drive Results</h2>
        </div>

        <section id="metadata-optimization" className="mb-16">
          <h3 className="text-2xl font-semibold mb-6">Metadata That Tells Your Story</h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">Your page metadata serves as the first impression for AI systems scanning your content. Make it count.</p>
          
          <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-lg my-8 shadow-sm">
            <h4 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Optimize these elements:</h4>
            <ul className="list-disc pl-6 space-y-3">
              <li className="text-gray-700 dark:text-gray-300">Title tags that clearly state your main topic and value</li>
              <li className="text-gray-700 dark:text-gray-300">Meta descriptions that summarize your key insights</li>
              <li className="text-gray-700 dark:text-gray-300">Open Graph tags for social sharing contexts</li>
              <li className="text-gray-700 dark:text-gray-300">Clear, descriptive page URLs</li>
            </ul>
          </div>
        </section>

        <section id="performance-accessibility" className="mb-16">
          <h3 className="text-2xl font-semibold mb-6">Performance and Accessibility</h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">Fast, accessible websites signal quality to both users and AI systems. Technical excellence supports content discoverability.</p>
          
          <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-lg my-8 shadow-sm">
            <h4 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Core requirements:</h4>
            <ul className="list-disc pl-6 space-y-3">
              <li className="text-gray-700 dark:text-gray-300">Mobile-responsive design across all devices</li>
              <li className="text-gray-700 dark:text-gray-300">Fast loading speeds (aim for under 3 seconds)</li>
              <li className="text-gray-700 dark:text-gray-300">Clean HTML structure with proper semantic markup</li>
              <li className="text-gray-700 dark:text-gray-300">Keyboard navigation and screen reader compatibility</li>
            </ul>
          </div>
        </section>

        <section id="content-freshness" className="mb-16">
          <h3 className="text-2xl font-semibold mb-6">Content Freshness and Accuracy</h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">AI models prioritize current, accurate information. Outdated content gets left behind.</p>
          
          <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-lg my-8 shadow-sm">
            <h4 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Maintenance practices:</h4>
            <ul className="list-disc pl-6 space-y-3">
              <li className="text-gray-700 dark:text-gray-300">Regular content audits (quarterly minimum)</li>
              <li className="text-gray-700 dark:text-gray-300">Clear "last updated" timestamps</li>
              <li className="text-gray-700 dark:text-gray-300">Fact-checking and source verification</li>
              <li className="text-gray-700 dark:text-gray-300">Removal or updating of outdated information</li>
            </ul>
          </div>
        </section>
      </section>


      <section id="monitoring-visibility" className="mb-20">
        <div className="flex items-center gap-3 mb-8">
          <svg
            className="w-8 h-8 text-green-600 dark:text-green-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" />
            <polyline points="16,7 22,7 22,13" />
          </svg>
          <h2 className="text-3xl font-bold">Monitoring and Measuring LLM Visibility</h2>
        </div>
        
        <section id="track-referral-traffic" className="mb-16">
          <h3 className="text-2xl font-semibold mb-6">Track Referral Traffic from AI Platforms</h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">Recent reports show that platforms like Perplexity are already referring traffic to publishers. Set up tracking to understand this emerging traffic source.</p>
          
          <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-lg my-8 shadow-sm">
            <h4 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Tracking setup:</h4>
            <ul className="list-disc pl-6 space-y-3">
              <li className="text-gray-700 dark:text-gray-300">Configure AI referral tracking in your analytics</li>
              <li className="text-gray-700 dark:text-gray-300">Monitor traffic from platforms like Perplexity, ChatGPT, and others</li>
              <li className="text-gray-700 dark:text-gray-300">Analyze engagement patterns from AI-referred visitors</li>
              <li className="text-gray-700 dark:text-gray-300">Track conversions and behavior differences from AI traffic</li>
            </ul>
          </div>
        </section>

        <section id="monitor-brand-mentions" className="mb-16">
          <h3 className="text-2xl font-semibold mb-6">Monitor Brand Mentions Across Platforms</h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">Understanding where and how your brand appears in AI-generated content helps you identify opportunities and threats.</p>
          
          <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-lg my-8 shadow-sm">
            <h4 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">What to track:</h4>
            <ul className="list-disc pl-6 space-y-3">
              <li className="text-gray-700 dark:text-gray-300">Brand mentions in AI-generated responses</li>
              <li className="text-gray-700 dark:text-gray-300">Accuracy of information being shared about your company</li>
              <li className="text-gray-700 dark:text-gray-300">Competitor mentions in your topic areas</li>
              <li className="text-gray-700 dark:text-gray-300">New topic associations with your brand</li>
            </ul>
          </div>
        </section>
      </section>

      <section id="advanced-strategies" className="mb-20">
        <div className="flex items-center gap-3 mb-8">
          <svg
            className="w-8 h-8 text-green-600 dark:text-green-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9,11 12,14 22,4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          <h2 className="text-3xl font-bold">Advanced Strategies for Maximum Impact</h2>
        </div>

        <section id="topic-driven-strategy" className="mb-16">
          <h3 className="text-2xl font-semibold mb-6">Topic-Driven Content Strategy</h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">Instead of keyword-focused content, develop comprehensive topic expertise that AI models can draw from across multiple queries.</p>
          
          <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-lg my-8 shadow-sm">
            <h4 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Implementation approach:</h4>
            <ul className="list-disc pl-6 space-y-3">
              <li className="text-gray-700 dark:text-gray-300">Map your expertise across broad topic areas</li>
              <li className="text-gray-700 dark:text-gray-300">Create content that covers topics from multiple angles</li>
              <li className="text-gray-700 dark:text-gray-300">Build clear connections between related concepts</li>
              <li className="text-gray-700 dark:text-gray-300">Regularly expand your topic coverage based on audience needs</li>
            </ul>
          </div>
        </section>

        <section id="strategic-partnerships" className="mb-16">
          <h3 className="text-2xl font-semibold mb-6">Strategic Content Partnerships</h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">Collaborate with other authorities in your space to build stronger topic associations and expand your content reach.</p>
          
          <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-lg my-8 shadow-sm">
            <h4 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Partnership types:</h4>
            <ul className="list-disc pl-6 space-y-3">
              <li className="text-gray-700 dark:text-gray-300">Guest contributions to respected industry publications</li>
              <li className="text-gray-700 dark:text-gray-300">Joint research projects and data sharing</li>
              <li className="text-gray-700 dark:text-gray-300">Cross-promotional content with complementary brands</li>
              <li className="text-gray-700 dark:text-gray-300">Industry report collaborations and surveys</li>
            </ul>
          </div>
        </section>

        <section id="community-building" className="mb-16">
          <h3 className="text-2xl font-semibold mb-6">Community Building and Engagement</h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">User-generated content and community discussions contribute to AI training data. Reddit content is specifically noted as a key LLM training source.</p>
          
          <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-lg my-8 shadow-sm">
            <h4 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Community strategies:</h4>
            <ul className="list-disc pl-6 space-y-3">
              <li className="text-gray-700 dark:text-gray-300">Host educational discussions in relevant online communities</li>
              <li className="text-gray-700 dark:text-gray-300">Share insights and answer questions in industry forums</li>
              <li className="text-gray-700 dark:text-gray-300">Encourage customer success stories and case studies</li>
              <li className="text-gray-700 dark:text-gray-300">Build thought leadership through consistent valuable contributions</li>
            </ul>
          </div>
        </section>
      </section>

      <section id="staying-ahead" className="mb-20">
        <div className="flex items-center gap-3 mb-8">
          <svg
            className="w-8 h-8 text-green-600 dark:text-green-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <h2 className="text-3xl font-bold">Staying Ahead of the Curve</h2>
        </div>

        <section id="adaptability" className="mb-16">
          <h3 className="text-2xl font-semibold mb-6">Adaptability is Everything</h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">The AI landscape evolves rapidly. What works today might be outdated in six months. Build systems that can adapt quickly to new developments.</p>
          
          <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-lg my-8 shadow-sm">
            <h4 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Future-proofing approaches:</h4>
            <ul className="list-disc pl-6 space-y-3">
              <li className="text-gray-700 dark:text-gray-300">Follow AI research and model capability announcements</li>
              <li className="text-gray-700 dark:text-gray-300">Test new AI platforms as they emerge</li>
              <li className="text-gray-700 dark:text-gray-300">Maintain flexible content structures that work across platforms</li>
              <li className="text-gray-700 dark:text-gray-300">Build direct relationships with your audience independent of any single platform</li>
            </ul>
          </div>
        </section>

        <section id="ethical-considerations" className="mb-16">
          <h3 className="text-2xl font-semibold mb-6">Ethical Considerations</h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">As AI systems amplify information, the responsibility for accuracy and bias becomes even more critical.</p>
          
          <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-lg my-8 shadow-sm">
            <h4 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Responsible practices:</h4>
            <ul className="list-disc pl-6 space-y-3">
              <li className="text-gray-700 dark:text-gray-300">Rigorous fact-checking and source verification</li>
              <li className="text-gray-700 dark:text-gray-300">Inclusive language and diverse perspectives</li>
              <li className="text-gray-700 dark:text-gray-300">Transparent disclosure of AI tool usage in content creation</li>
              <li className="text-gray-700 dark:text-gray-300">Regular bias audits of your content and recommendations</li>
            </ul>
          </div>
        </section>
      </section>

      <section id="bottom-line" className="mt-20 mb-16">
        <div className="flex items-center gap-3 mb-8">
          <CheckIcon className="w-8 h-8 text-green-600 dark:text-green-500" />
          <h2 className="text-3xl font-bold">The Bottom Line</h2>
        </div>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">LLM optimization isn't just about getting mentioned in AI responses — it's about building a digital presence that thrives in an AI-first world.</p>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">The brands that start now will define how their industries are represented in AI conversations. The ones that wait will find themselves invisible in the streams of information that increasingly power how people discover, evaluate, and choose solutions.</p>
        <p className="text-gray-800 dark:text-gray-200 text-lg font-semibold mb-12">Your content either flows in the right direction, or it gets left behind.</p>
        
        <div className="bg-blue-50 dark:bg-blue-950/50 p-10 rounded-lg text-center shadow-sm">
          <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-50">Want to see how your website performs with AI models?</h3>
          <p className="text-lg mb-8 text-gray-700 dark:text-gray-300">
            <Link href="/" className="text-green-600 dark:text-green-500 hover:underline font-medium">Test your site with llmcheck.app</Link> and get specific recommendations for improving your LLM optimization.
          </p>
          <p className="text-base text-gray-600 dark:text-gray-400 mb-8">The future of content discovery is happening now. Make sure you're part of it.</p>
          <Link 
            href="/" 
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            Test Your Site Now →
          </Link>
        </div>
      </section>
    </>
  );
}