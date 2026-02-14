/**
 * Static map of industry-specific AI prompts for the AI Visibility Check feature.
 * These represent realistic prompts users would type into ChatGPT, Perplexity, etc.
 */

export const industryPrompts: Record<string, string[]> = {
  ecommerce: [
    "Best online stores for buying electronics",
    "Where to buy affordable clothing online",
    "Most trusted ecommerce sites for home goods",
    "Top online shopping platforms with fast shipping",
    "Best deals on online marketplaces right now",
  ],
  saas: [
    "What's the best project management tool?",
    "Top CRM software for startups",
    "Best collaboration tools for remote teams",
    "Most affordable SaaS tools for small businesses",
    "Best software for automating business workflows",
  ],
  media: [
    "Best news websites for tech coverage",
    "Top online publications for business insights",
    "Most reliable media sites for breaking news",
    "Best blogs for digital marketing advice",
    "Top content platforms for industry analysis",
  ],
  education: [
    "Best online learning platforms for professionals",
    "Top educational websites for skill development",
    "Most effective online course providers",
    "Best resources for learning programming online",
    "Top e-learning sites with certifications",
  ],
  healthcare: [
    "Best health information websites",
    "Top telemedicine platforms for consultations",
    "Most trusted sites for medical information",
    "Best wellness platforms for health tracking",
    "Top healthcare providers with online booking",
  ],
  other: [
    "Best websites for this type of service",
    "Top-rated companies in this industry",
    "Most trusted online platforms in this space",
    "Best resources for finding reliable providers",
    "Top recommended sites by AI assistants",
  ],
};

/**
 * Returns prompts for a given industry, falling back to 'other' if not found.
 */
export function getPromptsForIndustry(industry: string | null): string[] {
  if (!industry) return industryPrompts.other;
  return industryPrompts[industry.toLowerCase()] ?? industryPrompts.other;
}
