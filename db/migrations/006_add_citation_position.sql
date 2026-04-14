-- 006_add_citation_position.sql
-- Per-engine retrieval position for the target brand within ai_visibility_results.
-- 1-based index into the structured cited_urls[] array; NULL when:
--   - the engine returned no cited_urls (e.g. ChatGPT Tier 3 fallback)
--   - the brand domain isn't present in the cited_urls array
--   - the row was credited via Layer 1 (text match) or Layer 3 (query-context
--     fallback) — see PRODUCT_GUARDRAILS.md #9. Honest NULL avoids pretending
--     a structured rank exists when it doesn't.
--
-- Run manually via Neon console. Idempotent.

ALTER TABLE ai_visibility_results
  ADD COLUMN IF NOT EXISTS citation_position INTEGER;
