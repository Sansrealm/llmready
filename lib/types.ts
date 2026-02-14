/**
 * Core type definitions for LLM Check application
 * Used across analysis, results display, and database operations
 */

// ============================================================================
// User & Authentication Types
// ============================================================================

/**
 * User plan tiers
 */
export enum UserPlan {
  GUEST = 'guest',
  FREE = 'free',
  PREMIUM = 'premium',
}

/**
 * User subscription status from Clerk publicMetadata
 * These field names must match exactly what's stored in Clerk
 */
export interface UserSubscription {
  premiumUser?: boolean; // True if user has active premium subscription
  analysisCount?: number; // Number of analyses used by free users
  subscriptionStatus?: string; // Stripe subscription status (active, canceled, etc.)
  subscriptionId?: string; // Stripe subscription ID
  customerId?: string; // Stripe customer ID
  updatedAt?: string; // ISO timestamp of last metadata update
  lastAnalysisReset?: string; // ISO timestamp of last analysis count reset
}

// ============================================================================
// Analysis Types
// ============================================================================

/**
 * Individual site metric/parameter from analysis
 * Represents a single scoring dimension (e.g., "Semantic HTML", "Meta Description")
 */
export interface SiteMetric {
  name: string;
  score: number; // 0-100
  isPremium: boolean;
  description: string;
}

/**
 * Difficulty level for recommendations
 */
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

/**
 * Impact level for recommendations
 */
export type ImpactLevel = 'Low' | 'Medium' | 'High';

/**
 * A single actionable recommendation from the analysis
 */
export interface Recommendation {
  title: string;
  description: string;
  difficulty: DifficultyLevel;
  impact: ImpactLevel;
  isPremium: boolean;
}

/**
 * Complete analysis result returned by OpenAI
 * This is the main data structure for website analysis
 */
export interface AnalysisResult {
  id?: string; // Analysis ID from database (optional for backward compatibility)
  overall_score: number; // 0-100
  parameters: SiteMetric[];
  recommendations: Recommendation[];
  remainingAnalyses?: number; // Only present for free users
}

/**
 * Request payload for website analysis
 */
export interface AnalysisRequest {
  url: string;
  email?: string;
  industry?: string;
}

// ============================================================================
// Database Types
// ============================================================================

/**
 * Analysis record as stored in the database
 */
export interface DbAnalysis {
  id: string;
  user_id: string;
  url: string;
  normalized_url: string;
  overall_score: number;
  parameters: SiteMetric[];
  analyzed_at: string; // ISO timestamp
  created_at: string; // ISO timestamp
  // Sharing fields
  share_slug?: string | null;
  is_public?: boolean;
  shared_at?: string | null;
  share_expires_at?: string | null;
}

/**
 * Trend direction for analysis history
 */
export type TrendDirection = 'improving' | 'declining' | 'stable' | 'none';

/**
 * Trend statistics for a URL's analysis history
 */
export interface TrendData {
  trend: TrendDirection;
  change: number;
  firstScore: number;
  latestScore: number;
}

/**
 * Analysis history response
 */
export interface AnalysisHistory {
  analyses: DbAnalysis[];
  total: number;
  trend: TrendData;
}

/**
 * Response from creating a public share
 */
export interface ShareResponse {
  share_slug: string;
  expires_at: Date;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Standard API success response
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
  status?: number;
}

/**
 * Generic API response type
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Premium check result from API
 */
export interface PremiumCheckResult {
  isPremium: boolean;
  userId: string | null;
  method?: 'clerk_billing' | 'metadata';
  debug?: Record<string, unknown>;
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Debug information state for components
 */
export interface DebugInfo {
  userLoaded?: boolean;
  userId?: string | null;
  hasPlan?: boolean;
  apiResponse?: unknown;
  apiError?: string | null;
  [key: string]: unknown;
}

/**
 * PDF generation state
 */
export interface PdfGenerationState {
  generating: boolean;
  error: string | null;
  success: string | null;
}

// ============================================================================
// Stripe Types (for webhook handling)
// ============================================================================

/**
 * User lookup result from Stripe helpers
 */
export interface UserLookupResult {
  userId: string | null;
  found: boolean;
  method?: 'subscription' | 'customer' | 'email';
  error?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a value is an AnalysisResult
 */
export function isAnalysisResult(value: unknown): value is AnalysisResult {
  if (typeof value !== 'object' || value === null) return false;

  const result = value as Partial<AnalysisResult>;
  return (
    typeof result.overall_score === 'number' &&
    Array.isArray(result.parameters) &&
    Array.isArray(result.recommendations)
  );
}

/**
 * Type guard to check if an API response is an error
 */
export function isApiError(response: ApiResponse): response is ApiErrorResponse {
  return 'error' in response;
}

/**
 * Type guard to check if difficulty level is valid
 */
export function isDifficultyLevel(value: string): value is DifficultyLevel {
  return ['Easy', 'Medium', 'Hard'].includes(value);
}

/**
 * Type guard to check if impact level is valid
 */
export function isImpactLevel(value: string): value is ImpactLevel {
  return ['Low', 'Medium', 'High'].includes(value);
}

// ============================================================================
// Guest Email Types
// ============================================================================

/**
 * Guest email record from database
 * Represents an unauthenticated user who provided their email during analysis
 */
export interface GuestEmail {
  id: string;
  email: string;
  first_captured_at: string; // ISO timestamp
  last_analysis_at: string; // ISO timestamp
  analysis_count: number;
  opted_out: boolean;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Result from capturing a guest email
 * Returned by captureGuestEmail() function
 */
export interface GuestEmailCaptureResult {
  id: string;
  email: string;
  is_new: boolean; // TRUE if first capture, FALSE if returning user
  analysis_count: number;
}

// ============================================================================
// Visibility Waitlist Types
// ============================================================================

/**
 * Visibility waitlist entry from database
 * Tracks interest signups for the AI Visibility Tracking feature
 */
export interface VisibilityWaitlistEntry {
  id: string;
  email: string;
  url: string | null;
  industry: string | null;
  user_id: string | null;
  source: string;
  created_at: string;
}
