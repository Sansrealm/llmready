import { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Complete Guide to LLM Optimization - LLM Ready Analyzer",
  description: "Learn how to optimize your website for Large Language Models with our comprehensive guide. Get expert tips, best practices, and actionable insights for AI-ready content.",
  
  openGraph: {
    title: "The Complete Guide to LLM Optimization - LLM Ready Analyzer",
    description: "Master website optimization for AI and LLMs with our comprehensive guide. Learn expert strategies for making your content AI-friendly.",
    type: "article",
    url: "https://llmcheck.app/guide",
    siteName: "LLM Ready Analyzer",
  },

  twitter: {
    card: "summary_large_image",
    title: "The Complete Guide to LLM Optimization",
    description: "Master website optimization for AI and LLMs with our comprehensive guide. Learn expert strategies for making your content AI-friendly.",
  },

  keywords: [
    "LLM optimization guide",
    "AI content optimization",
    "website AI readiness",
    "LLM SEO guide",
    "AI search optimization",
    "ChatGPT optimization",
    "semantic SEO guide",
    "AI content strategy"
  ],

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export const guideMetadata = {
  title: "The Complete Guide to LLM Optimization",
  description: "Learn how to optimize your website for AI-powered search and improve your visibility in LLM responses. A comprehensive guide covering technical structure, content optimization, and authority building.",
  publishedDate: "2025-05-19",
  modifiedDate: "2025-06-04",
  authors: [
    {
      name: "LLM Check Team",
      url: "https://llmcheck.app/about"
    }
  ],
  keywords: [
    "LLM optimization",
    "AI SEO",
    "content optimization",
    "semantic search",
    "website visibility",
    "AI-powered search",
    "LLM-ready content",
    "AI content structure",
    "semantic markup",
    "technical SEO for AI"
  ],
  section: "Guides",
  estimatedReadingTime: "15 minutes"
};

export const guideSchema = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": guideMetadata.title,
  "description": guideMetadata.description,
  "keywords": guideMetadata.keywords.join(", "),
  "datePublished": guideMetadata.publishedDate,
  "dateModified": guideMetadata.modifiedDate,
  "author": {
    "@type": "Organization",
    "name": guideMetadata.authors[0].name,
    "url": guideMetadata.authors[0].url
  },
  "publisher": {
    "@type": "Organization",
    "name": "LLM Check",
    "logo": {
      "@type": "ImageObject",
      "url": "https://llmcheck.app/logo.png"
    }
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://llmcheck.app/guide"
  },
  "articleSection": guideMetadata.section,
  "timeRequired": "PT15M"
}; 