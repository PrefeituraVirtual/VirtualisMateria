/**
 * Data Analyst Types
 * TypeScript interfaces for the Admin Data Analyst feature
 * Natural language interface for querying analytics data with auto-generated charts
 */

/**
 * Basic chart type options for visualization
 */
export type BasicChartType = 'line' | 'bar' | 'pie' | 'area'

/**
 * Advanced chart type options for specialized visualizations
 */
export type AdvancedChartType = 'heatmap' | 'treemap' | 'gauge'

/**
 * All chart type options for visualization
 */
export type ChartType = BasicChartType | AdvancedChartType

/**
 * View mode for displaying query results
 */
export type ViewMode = 'table' | 'chart' | 'split'

/**
 * Query status for tracking execution state
 */
export type QueryStatus = 'pending' | 'executing' | 'completed' | 'error'

/**
 * Column metadata for result table
 */
export interface ColumnMetadata {
  /** Column name/key */
  name: string
  /** Display label */
  label: string
  /** Data type */
  type: 'string' | 'number' | 'date' | 'boolean'
  /** Optional format for display */
  format?: string
  /** Whether this column should be used for chart axis */
  isChartAxis?: boolean
  /** Whether this column should be used for chart values */
  isChartValue?: boolean
}

/**
 * Chart configuration for visualization
 */
export interface ChartConfig {
  /** Type of chart to render */
  type: ChartType
  /** Column to use for X axis or labels */
  xAxisKey: string
  /** Column(s) to use for Y axis values */
  yAxisKeys: string[]
  /** Optional title for the chart */
  title?: string
  /** Show legend */
  showLegend?: boolean
  /** Show grid lines */
  showGrid?: boolean
  /** Custom colors for series */
  colors?: string[]
}

/**
 * Query result data structure
 */
export interface QueryResult {
  /** Unique identifier for the query */
  id: string
  /** Original natural language query */
  query: string
  /** Generated SQL query (if applicable) */
  sqlQuery?: string
  /** Result data rows */
  data: Record<string, unknown>[]
  /** Column metadata */
  columns: ColumnMetadata[]
  /** Suggested chart configuration */
  chartConfig?: ChartConfig
  /** AI response/explanation */
  response?: string
  /** Alternative response field */
  message?: string
  /** Chain of thought reasoning */
  reasoning?: string
  /** Query execution status */
  status: QueryStatus
  /** Error message if failed */
  error?: string
  /** Execution time in milliseconds */
  executionTime?: number
  /** Number of rows returned */
  rowCount: number
  /** Number of SQL iterations for auto-correction */
  iterations?: number
  /** Timestamp when query was executed */
  createdAt: string
  /** Whether this query is favorited */
  isFavorite?: boolean
  /** User who executed the query */
  userId?: string
  /** Whether result was served from cache */
  fromCache?: boolean
}

/**
 * Query history item (lighter version for list display)
 */
export interface QueryHistoryItem {
  /** Unique identifier */
  id: string
  /** Original query text */
  query: string
  /** Short preview of response */
  responsePreview?: string
  /** Query status */
  status: QueryStatus
  /** Number of result rows */
  rowCount: number
  /** Execution timestamp */
  createdAt: string
  /** Whether favorited */
  isFavorite: boolean
}

/**
 * Query suggestion for quick actions
 */
export interface QuerySuggestion {
  /** Suggestion text */
  text: string
  /** Category of the suggestion */
  category: string
  /** Icon name (from lucide-react) */
  icon?: string
}

/**
 * Contextual suggestion with priority and metrics
 */
export interface ContextualSuggestion extends QuerySuggestion {
  /** SQL or natural language query to execute */
  query?: string
  /** Priority level for highlighting */
  priority?: 'high' | 'medium' | 'low'
  /** Associated metric data */
  metric?: {
    value: number
    trend?: 'up' | 'down' | 'stable'
  }
}

/**
 * Insight data for dashboard cards
 */
export interface Insight {
  /** Type of insight */
  type: 'alert' | 'info' | 'success'
  /** Severity level for styling */
  severity: 'warning' | 'error' | 'success' | 'info'
  /** Insight title */
  title: string
  /** Detailed description */
  description: string
  /** Associated metric data */
  metric?: {
    current: number
    previous: number
    change: number
  }
  /** Suggested action query */
  action?: string
}

/**
 * API response for suggestions endpoint
 */
export interface SuggestionsResponse {
  /** List of contextual suggestions */
  suggestions: ContextualSuggestion[]
  /** Available categories */
  categories: string[]
  /** Source of suggestions */
  source: 'contextual' | 'static'
}

/**
 * API response for insights endpoint
 */
export interface InsightsResponse {
  /** List of insights */
  insights: Insight[]
}

/**
 * API request for executing a query
 */
export interface QueryRequest {
  /** Natural language query */
  query: string
  /** Optional mode override */
  mode?: 'auto' | 'sql' | 'analysis'
}

/**
 * API response for query execution
 */
export interface QueryResponse {
  /** Whether the request was successful */
  success: boolean
  /** Query result data */
  data?: QueryResult
  /** Error message if failed */
  error?: string
}

/**
 * Pagination params for history
 */
export interface PaginationParams {
  /** Current page (1-indexed) */
  page: number
  /** Items per page */
  limit: number
}

/**
 * History list response
 */
export interface QueryHistoryResponse {
  /** List of query history items */
  items: QueryHistoryItem[]
  /** Total count for pagination */
  total: number
  /** Total number of pages */
  totalPages: number
  /** Current page */
  page: number
  /** Items per page */
  limit: number
}

/**
 * Default chart colors using Virtualis brand palette
 */
export const CHART_COLORS = [
  '#1669B6', // Virtualis Blue (primary)
  '#10b981', // Green
  '#2A89D1', // Secondary Blue
  '#f59e0b', // Amber
  '#2F95CF', // Light Blue
  '#8b5cf6', // Purple
  '#49CFEA', // Accent Blue
  '#ec4899', // Pink
  '#6b7280', // Gray
  '#ef4444', // Red
]

/**
 * Default query suggestions (focused on chatbot analytics)
 */
export const DEFAULT_SUGGESTIONS: QuerySuggestion[] = [
  {
    text: 'Quantas conversas foram criadas nos ultimos 7 dias?',
    category: 'Conversas',
    icon: 'MessageSquare',
  },
  {
    text: 'Qual a taxa de resolucao de conversas este mes?',
    category: 'Performance',
    icon: 'TrendingUp',
  },
  {
    text: 'Distribuicao de sentimento nas conversas recentes',
    category: 'Sentimento',
    icon: 'Heart',
  },
  {
    text: 'Quais sao os eventos de confusao mais comuns?',
    category: 'Performance',
    icon: 'AlertTriangle',
  },
  {
    text: 'Comparar usuarios frequent_user vs power_user',
    category: 'Usuarios',
    icon: 'Users',
  },
  {
    text: 'Top 10 perguntas mais frequentes',
    category: 'Conversas',
    icon: 'HelpCircle',
  },
]

/**
 * Category colors for tags and badges (chatbot analytics focused)
 */
export const CATEGORY_COLORS: Record<string, string> = {
  Conversas: '#1669B6',
  Sentimento: '#10b981',
  Performance: '#f59e0b',
  Usuarios: '#2A89D1',
  geral: '#6b7280',
}
