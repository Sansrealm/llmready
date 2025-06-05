import React from 'react';

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
          </div>
        </section>
      </section>

      <section id="technical-structure">
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

        <section id="semantic-html">
          <h3 className="text-2xl font-semibold mt-8 mb-4">Semantic HTML is Your Foundation</h3>
          <p>AI models use HTML structure to understand content hierarchy and meaning. Clean, semantic markup acts like a roadmap for content interpretation.</p>

          <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg my-6">
            <h4 className="font-semibold mb-3">Essential elements:</h4>
            <ul className="list-disc pl-6 space-y-2">
              <li><code>&lt;article&gt;</code> for main content pieces</li>
              <li><code>&lt;h1&gt;</code> through <code>&lt;h6&gt;</code> for logical content hierarchy</li>
              <li><code>&lt;section&gt;</code> for distinct content areas</li>
              <li><code>&lt;blockquote&gt;</code> with <code>cite</code> attributes for quoted material</li>
              <li><code>&lt;figure&gt;</code> and <code>&lt;figcaption&gt;</code> for visual content</li>
            </ul>
          </div>
        </section>
      </section>

      <section id="building-authority">
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
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M12 22V12" />
            <path d="m17 13-5-1-5 1" />
          </svg>
          <h2 className="text-3xl font-bold">Building Authority That AI Models Recognize</h2>
        </div>

        <h3 className="text-2xl font-semibold mt-8 mb-4">Establish Clear Expertise Signals</h3>
        <p>AI models increasingly prioritize content from credible sources. Make your expertise obvious and verifiable.</p>

        <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg my-6">
          <h4 className="font-semibold mb-3">What this includes:</h4>
          <ul className="list-disc pl-6 space-y-2">
            <li>Detailed author bios with credentials and links</li>
            <li>Clear organizational authority and mission statements</li>
            <li>Transparent sourcing and methodology explanations</li>
            <li>Professional profiles and industry recognition</li>
          </ul>
        </div>
      </section>

      <section id="monitoring">
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
            <path d="M19 11V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h7" />
            <path d="m12 12 4 10 1.7-4.3L22 16Z" />
          </svg>
          <h2 className="text-3xl font-bold">Monitoring and Measuring LLM Visibility</h2>
        </div>

        <h3 className="text-2xl font-semibold mt-8 mb-4">Test Your Content with AI Models</h3>
        <p>The most direct way to understand how AI perceives your content is to ask them directly.</p>

        <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg my-6">
          <h4 className="font-semibold mb-3">Testing strategies:</h4>
          <ul className="list-disc pl-6 space-y-2">
            <li>Query AI models with questions related to your expertise</li>
            <li>Ask for summaries of your content and note how it's interpreted</li>
            <li>Track whether your brand gets mentioned in relevant topic discussions</li>
            <li>Monitor the accuracy of AI-generated information about your company</li>
          </ul>
        </div>
      </section>

      <section id="action-plan" className="mb-20">
        <div className="flex items-center gap-3 mb-8">
          <StepsIcon className="w-8 h-8 text-green-600 dark:text-green-500" />
          <h2 className="text-3xl font-bold mt-16">Your Action Plan</h2>
        </div>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-8">Ready to optimize your content for the AI era? Follow these steps to get started:</p>

        <div className="space-y-8">
          <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-lg shadow-sm">
            <div className="flex items-start gap-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-500 font-semibold text-sm">
                1
              </span>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Initial Audit and Assessment</h3>
                <ul className="list-disc pl-6 space-y-3">
                  <li className="text-gray-700 dark:text-gray-300">Run your key pages through llmcheck.app for baseline scores</li>
                  <li className="text-gray-700 dark:text-gray-300">Test AI models with questions related to your expertise</li>
                  <li className="text-gray-700 dark:text-gray-300">Identify gaps in your topic coverage and content structure</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 p-8 rounded-lg shadow-sm">
            <div className="flex items-start gap-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-500 font-semibold text-sm">
                2
              </span>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Implement Quick Wins</h3>
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
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-500 font-semibold text-sm">
                3
              </span>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Content Enhancement</h3>
                <ul className="list-disc pl-6 space-y-3">
                  <li className="text-gray-700 dark:text-gray-300">Expand thin content into comprehensive topic coverage</li>
                  <li className="text-gray-700 dark:text-gray-300">Add credible citations and source links</li>
                  <li className="text-gray-700 dark:text-gray-300">Create FAQ sections for common questions in your field</li>
                  <li className="text-gray-700 dark:text-gray-300">Develop clear expertise signals and author information</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
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
          <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-50">Ready to optimize your website for AI?</h3>
          <p className="text-lg mb-8 text-gray-700 dark:text-gray-300">Get your free LLM optimization score and personalized recommendations.</p>
          <a
            href="https://llmcheck.app"
            className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            Test Your Site Now →
          </a>
        </div>
      </section>
    </>
  );
} 