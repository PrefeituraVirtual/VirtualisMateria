/**
 * Intelligence Dashboard Types
 * TypeScript interfaces for conversation intelligence analytics
 */

/**
 * Top question data structure
 */
export interface TopQuestion {
  /** Ranking position (1-10) */
  rank: number
  /** The question text */
  question: string
  /** Number of times this question was asked */
  count: number
  /** Trend direction over the period */
  trend: 'rising' | 'stable' | 'declining'
  /** Question category */
  category: string
  /** Optional percentage of total questions */
  percentage?: number
}

/**
 * Confusion rate data structure
 */
export interface ConfusionRate {
  /** Current confusion rate (0-1) */
  rate: number
  /** Target threshold for acceptable confusion */
  target: number
  /** Trend direction */
  trend: 'up' | 'down' | 'stable'
  /** Change from previous period */
  change?: number
  /** Total confused conversations count */
  confusedCount?: number
  /** Total conversations analyzed */
  totalConversations?: number
}

/**
 * Sentiment data point for trend chart
 */
export interface SentimentData {
  /** Date string (e.g., '2024-01-15') */
  date: string
  /** Positive sentiment count */
  positive: number
  /** Negative sentiment count */
  negative: number
  /** Neutral sentiment count */
  neutral: number
}

/**
 * Intent distribution data
 */
export interface IntentData {
  /** Intent name/category */
  intent: string
  /** Count of conversations with this intent */
  count: number
  /** Percentage of total */
  percentage: number
  /** Color for visualization */
  color?: string
}

/**
 * Intelligence overview statistics
 */
export interface IntelligenceOverview {
  /** Total conversations analyzed */
  totalConversations: number
  /** Total unique questions identified */
  totalQuestions: number
  /** Average sentiment score (-1 to 1) */
  averageSentiment: number
  /** Overall confusion rate */
  confusionRate: number
  /** Trend compared to previous period */
  trends: {
    conversations: number
    questions: number
    sentiment: number
    confusion: number
  }
}

/**
 * Stats card alert levels
 */
export type AlertLevel = 'success' | 'warning' | 'danger' | 'info'

/**
 * Period options for filtering
 */
export type PeriodOption = '7d' | '30d' | '90d'

/**
 * Period labels for display
 */
export const PERIOD_LABELS: Record<PeriodOption, string> = {
  '7d': '7 dias',
  '30d': '30 dias',
  '90d': '90 dias',
}

/**
 * Category colors for charts - usando paleta azul do sistema Virtualis
 */
export const CATEGORY_COLORS: Record<string, string> = {
  legislativo: '#1669B6', // Virtualis Blue (primary)
  tramitacao: '#10b981', // Green
  sessao: '#2A89D1', // Secondary Blue
  documento: '#2F95CF', // Light Blue
  geral: '#6b7280', // Gray
  votacao: '#49CFEA', // Accent Blue
  outro: '#64748b', // Slate (neutral)
}

/**
 * Sentiment colors
 */
export const SENTIMENT_COLORS = {
  positive: '#10b981', // Green
  negative: '#ef4444', // Red
  neutral: '#6b7280', // Gray
}

/**
 * Trend icons mapping
 */
export const TREND_ICONS = {
  rising: 'trending-up',
  stable: 'minus',
  declining: 'trending-down',
  up: 'arrow-up',
  down: 'arrow-down',
}

/**
 * Resolution rate data structure
 */
export interface ResolutionRateData {
  /** Current period resolution metrics */
  current: {
    resolved: { count: number; percentage: number }
    unresolved: { count: number; percentage: number }
    partial: { count: number; percentage: number }
  }
  /** Previous period resolution metrics for comparison */
  previous: {
    resolved: { count: number; percentage: number }
    unresolved: { count: number; percentage: number }
    partial: { count: number; percentage: number }
  }
  /** Trend direction and change percentage */
  trend: { direction: 'up' | 'down' | 'stable'; change_percentage: number }
  /** Average number of turns to resolve a conversation */
  avg_turns_to_resolution: number
}

/**
 * User segment data structure
 */
export interface UserSegmentData {
  /** Segment identifier (e.g., 'power_user', 'casual', 'new') */
  segment: string
  /** Number of users in this segment */
  count: number
  /** Percentage of total users */
  percentage: number
  /** Average session duration in seconds */
  avg_session_duration: number
  /** Average messages per session */
  avg_messages_per_session: number
}

/**
 * Confusion event data structure
 */
export interface ConfusionEventData {
  /** Confusion events grouped by type */
  by_type: Array<{
    type: string
    count: number
    resolved_count: number
    avg_resolution_turns: number
  }>
  /** Confusion events grouped by topic/category */
  by_topic: Array<{
    category: string
    count: number
    percentage: number
  }>
  /** Top unresolved confusion events */
  unresolved_top: Array<{
    conversation_id: string
    type: string
    topic: string
    detected_at: string
  }>
  /** Total number of confusion events */
  total_confusions?: number
}
