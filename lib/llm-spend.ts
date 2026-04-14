/**
 * LLM spend tracking — step 1 (read-only logging).
 *
 * Call `logLlmSpend()` right after every outbound LLM request so we can
 * reconstruct per-user / per-endpoint / per-provider cost baselines. Writes
 * go to the `llm_spend` table (migration 005). Budget enforcement is step 2,
 * wired through `getUserSpendTotal()` later.
 *
 * Rules:
 *   - Non-blocking. Never await this in a way that could fail a user request.
 *     Internal `.catch()` logs errors and swallows them.
 *   - Pricing is hard-coded in this file. Update the PRICING table when
 *     providers change rates. If a model isn't in the table, we log with
 *     cost_usd = 0 plus a console warning so ops can add it later.
 *   - User id is always present — the guest path to /api/analyze was closed
 *     (see auth gate in /api/analyze). Scan + generate-fix are premium-only.
 */

import { sql } from '@vercel/postgres';

// ----------------------------------------------------------------------------
// Pricing — USD per 1M tokens. Input / output split.
// ----------------------------------------------------------------------------
//
// Sources (verify before big spend decisions):
//   - Anthropic: https://www.anthropic.com/pricing
//   - OpenAI:    https://openai.com/api/pricing
//   - Google:    https://ai.google.dev/pricing
//   - Perplexity Sonar: https://docs.perplexity.ai/guides/pricing
//
// Numbers below are snapshot values. For per-request surcharges (e.g. search
// tools on Perplexity Sonar, Responses API web_search_preview), we currently
// approximate with token-only costs — the floor estimate is fine for trend
// analysis and budget sizing. Upgrade to more precise models later if needed.

interface ModelRate {
  /** USD per million input tokens */
  inputPerM:  number;
  /** USD per million output tokens */
  outputPerM: number;
}

const PRICING: Record<string, ModelRate> = {
  // Anthropic
  'claude-sonnet-4-6':          { inputPerM: 3.00,  outputPerM: 15.00 },
  'claude-haiku-4-5-20251001':  { inputPerM: 1.00,  outputPerM: 5.00  },

  // OpenAI
  'gpt-4o':                     { inputPerM: 2.50,  outputPerM: 10.00 },
  'gpt-4o-search-preview':      { inputPerM: 2.50,  outputPerM: 10.00 },

  // Perplexity
  'sonar':                      { inputPerM: 1.00,  outputPerM: 1.00  },

  // Google
  'gemini-2.5-flash':           { inputPerM: 0.075, outputPerM: 0.30  },
};

export type SpendProvider = 'anthropic' | 'openai' | 'google' | 'perplexity';

export type SpendEndpoint =
  | 'analyze'
  | 'ai-visibility-scan'      // the 3-LLM fan-out
  | 'extract-brands'          // batched Haiku call inside ai-visibility-scan
  | 'generate-fix';

export interface LogSpendInput {
  userId:     string;
  endpoint:   SpendEndpoint;
  provider:   SpendProvider;
  model:      string;
  tokensIn:   number;
  tokensOut:  number;
  requestId?: string | null;
  analysisId?: string | null;
  scanId?:     string | null;
}

/**
 * Compute USD cost from token counts. Returns 0 and warns if the model is
 * missing from the pricing table — we never throw, since spend logging is
 * a non-blocking side effect and must not fail the user request.
 */
function computeCost(model: string, tokensIn: number, tokensOut: number): number {
  const rate = PRICING[model];
  if (!rate) {
    console.warn(`[llm-spend] no pricing entry for model "${model}" — logging cost as 0. Update lib/llm-spend.ts.`);
    return 0;
  }
  const cost = (tokensIn / 1_000_000) * rate.inputPerM + (tokensOut / 1_000_000) * rate.outputPerM;
  return Math.round(cost * 1_000_000) / 1_000_000; // 6-decimal precision (matches NUMERIC(10, 6))
}

/**
 * Record one LLM call. Fire-and-forget — always returns immediately; internal
 * failures are logged but do not bubble up. Callers should NOT await with
 * concern for errors, but awaiting is fine if the caller wants to sequence.
 */
export async function logLlmSpend(input: LogSpendInput): Promise<void> {
  try {
    const cost = computeCost(input.model, input.tokensIn, input.tokensOut);
    await sql`
      INSERT INTO llm_spend
        (user_id, endpoint, provider, model, tokens_in, tokens_out, cost_usd, request_id, analysis_id, scan_id)
      VALUES
        (${input.userId},
         ${input.endpoint},
         ${input.provider},
         ${input.model},
         ${input.tokensIn},
         ${input.tokensOut},
         ${cost},
         ${input.requestId ?? null},
         ${input.analysisId ?? null},
         ${input.scanId ?? null})
    `;
  } catch (err) {
    console.error('[llm-spend] write failed (non-fatal):', err);
  }
}

// ----------------------------------------------------------------------------
// Aggregation helpers — reserved for step 2 (budget enforcement)
// ----------------------------------------------------------------------------

/**
 * Total USD spend for a user, optionally since a given timestamp.
 *
 * Not wired into any enforcement path yet — call this once we decide on
 * per-tier budget caps. Returns 0 if the user has no rows (or if the table
 * doesn't exist yet in local dev).
 */
export async function getUserSpendTotal(
  userId: string,
  since?: Date,
): Promise<number> {
  try {
    const rows = since
      ? await sql`
          SELECT COALESCE(SUM(cost_usd), 0) AS total
          FROM llm_spend
          WHERE user_id = ${userId}
            AND created_at >= ${since.toISOString()}::timestamptz
        `
      : await sql`
          SELECT COALESCE(SUM(cost_usd), 0) AS total
          FROM llm_spend
          WHERE user_id = ${userId}
        `;
    const total = Number(rows.rows[0]?.total ?? 0);
    return Number.isFinite(total) ? total : 0;
  } catch (err) {
    console.error('[llm-spend] getUserSpendTotal failed (non-fatal):', err);
    return 0;
  }
}
