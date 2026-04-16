# The Fan-Out Effect — AirOps x Kevin Indig (April 2026)

Source: https://www.airops.com/report/the-fan-out-effect-what-happens-between-a-query-and-a-citation
Scale: 16,851 queries, 353,799 pages, ChatGPT retrieval pipeline only (Bing-backed). Not API — scraped from UI.

## Key Findings

1. **Retrieval rank is #1 signal** — position 1 = 58% citation rate, position 10 = 14%. 4x gap. Content quality alone cannot close it.
2. **Heading-query match beats breadth** — headings closely matching the query = 41% citation vs 29% weak match. Strongest on-page lever.
3. **Focused pages beat comprehensive guides** — 26-50% fan-out coverage outperforms 100%. Breadth dilutes. "Ultimate guide" playbook hurts.
4. **Schema markup is independent signal** — JSON-LD = +6.5pp citation advantage controlling for all other signals. Top types: FAQPage (45.6%), BreadcrumbList (46.2%), Organization (44.3%).
5. **Word count sweet spot: 500-2,000 words** — 5,000+ words underperforms sub-500. Length works against you.
6. **Readability: FK grade 16-17 optimal** — college-level writing = 35.9% citation rate. Simple writing underperforms.
7. **Domain authority not correlated** — DA and backlinks slightly inversely correlated. Always-cited pages have lower DA (53) than never-cited (56).

## Caveat
ChatGPT only. Gemini and Perplexity have different retrieval mechanisms — findings on retrieval rank and DA may not apply equally to all three engines LLMCheck scans.

## Implications for LLMCheck Scoring (to be analysed)
- `answer_ready_content` — heading match validated, but FAQ breadth less supported
- `structured_data_depth` — strongly validated
- `eeat_authority_signals` — directly contradicted by DA finding
- `intent_coverage_breadth` — contradicted by breadth-hurts finding
- `citable_content_quality` — word count and readability signals missing
- Retrieval rank — unmeasured, may need proxy or explicit callout in recommendations