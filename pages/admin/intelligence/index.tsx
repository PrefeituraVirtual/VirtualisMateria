import React, { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  MessageSquare,
  HelpCircle,
  AlertTriangle,
  RefreshCw,
  Brain,
  CheckCircle,
  Users,
  AlertCircle,
  Lightbulb,
  TrendingUp,
  Database,
  ArrowRight,
} from 'lucide-react'
import { AdminLayout } from '@/components/admin'
import {
  IntelligenceStatsCard,
  type TopQuestion,
  type SentimentData,
  type IntentData,
  type PeriodOption,
  type AlertLevel,
  type ResolutionRateData,
  type UserSegmentData,
  type ConfusionEventData,
} from '@/components/admin/intelligence'
import { adminIntelligenceService } from '@/lib/api'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

// Chart skeleton for loading states
const ChartSkeleton = () => (
  <div className="animate-pulse rounded-xl border border-gray-200 dark:border-gray-800 p-6">
    <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
    <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded" />
  </div>
)

// Lazy load chart components (heavy dependencies: recharts, d3)
const TopQuestionsChart = dynamic(
  () => import('@/components/admin/intelligence').then(mod => ({ default: mod.TopQuestionsChart })),
  { loading: () => <ChartSkeleton />, ssr: false }
)

const SentimentTrendChart = dynamic(
  () => import('@/components/admin/intelligence').then(mod => ({ default: mod.SentimentTrendChart })),
  { loading: () => <ChartSkeleton />, ssr: false }
)

const IntentBreakdownChart = dynamic(
  () => import('@/components/admin/intelligence').then(mod => ({ default: mod.IntentBreakdownChart })),
  { loading: () => <ChartSkeleton />, ssr: false }
)

const ConfusionRateGauge = dynamic(
  () => import('@/components/admin/intelligence').then(mod => ({ default: mod.ConfusionRateGauge })),
  { loading: () => <ChartSkeleton />, ssr: false }
)

/**
 * Intelligence Overview Stats Interface
 */
interface IntelligenceStats {
  totalConversations: number
  totalQuestions: number
  confusionRate: number
  averageSentiment: number
  trends: {
    conversations: number
    questions: number
    confusion: number
    sentiment: number
  }
}

/**
 * Confusion Rate Data Interface
 */
interface ConfusionData {
  rate: number
  target: number
  trend: 'up' | 'down' | 'stable'
  change: number
}

/**
 * Intelligence Dashboard Page
 * Main admin page for conversation intelligence analytics
 */
export default function IntelligenceDashboardPage() {
  // State for data
  const [stats, setStats] = useState<IntelligenceStats | null>(null)
  const [topQuestions, setTopQuestions] = useState<TopQuestion[]>([])
  const [confusionData, setConfusionData] = useState<ConfusionData | null>(null)
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([])
  const [intentData, setIntentData] = useState<IntentData[]>([])

  // State for new metrics
  const [resolutionData, setResolutionData] = useState<ResolutionRateData | null>(null)
  const [userSegments, setUserSegments] = useState<UserSegmentData[]>([])
  const [confusionEvents, setConfusionEvents] = useState<ConfusionEventData | null>(null)
  const [sentimentComparison, setSentimentComparison] = useState<{
    previous_total_positive: number
    previous_total_negative: number
    previous_total_neutral: number
  } | null>(null)

  // State for UI
  const [period, setPeriod] = useState<PeriodOption>('30d')
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [loadingConfusion, setLoadingConfusion] = useState(true)
  const [loadingSentiment, setLoadingSentiment] = useState(true)
  const [loadingIntents, setLoadingIntents] = useState(true)
  const [loadingResolution, setLoadingResolution] = useState(true)
  const [loadingSegments, setLoadingSegments] = useState(true)
  const [loadingConfusionEvents, setLoadingConfusionEvents] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  /**
   * Load overview stats
   */
  const loadStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const response = await adminIntelligenceService.getOverview(period)
      if (response) {
        const overviewData = response as Record<string, any>
        // Map snake_case backend response to camelCase frontend format
        const sentimentDist = overviewData.sentiment_distribution || {}
        const totalSentiment = (sentimentDist.positive?.count || 0) +
                              (sentimentDist.negative?.count || 0) +
                              (sentimentDist.neutral?.count || 0)

        // Calculate average sentiment score (-1 to 1 scale, mapped to 0-1)
        const avgSentiment = totalSentiment > 0
          ? ((sentimentDist.positive?.count || 0) - (sentimentDist.negative?.count || 0)) / totalSentiment
          : 0

        setStats({
          totalConversations: overviewData.total_conversations_analyzed || 0,
          totalQuestions: overviewData.total_messages_analyzed || 0,
          confusionRate: parseFloat(overviewData.confusion_rate) || 0,
          averageSentiment: (avgSentiment + 1) / 2, // Map from -1..1 to 0..1
          trends: {
            conversations: 0, // TODO: calculate from historical data
            questions: 0,
            confusion: 0,
            sentiment: 0,
          },
        })
      }
    } catch (error) {
      console.error('Error loading intelligence stats:', error)
      setStats({
        totalConversations: 0,
        totalQuestions: 0,
        confusionRate: 0,
        averageSentiment: 0,
        trends: {
          conversations: 0,
          questions: 0,
          confusion: 0,
          sentiment: 0,
        },
      })
    } finally {
      setLoadingStats(false)
    }
  }, [period])

  /**
   * Load top questions
   */
  const loadTopQuestions = useCallback(async () => {
    setLoadingQuestions(true)
    try {
      const response = await adminIntelligenceService.getTopQuestions(period, 10)
      const questionsResponse = response as { questions?: TopQuestion[] }
      if (questionsResponse?.questions) {
        setTopQuestions(questionsResponse.questions)
      }
    } catch (error) {
      console.error('Error loading top questions:', error)
      // Set mock data for development
      setTopQuestions([
        { rank: 1, question: 'Como funciona o processo de votacao de um projeto de lei?', count: 342, trend: 'rising', category: 'legislativo' },
        { rank: 2, question: 'Qual o prazo para tramitacao de uma materia?', count: 287, trend: 'stable', category: 'tramitacao' },
        { rank: 3, question: 'Como acompanhar uma sessao plenaria?', count: 234, trend: 'rising', category: 'sessao' },
        { rank: 4, question: 'Quais documentos sao necessarios para protocolar um projeto?', count: 198, trend: 'declining', category: 'documento' },
        { rank: 5, question: 'Como funciona o quorum para aprovacao?', count: 176, trend: 'stable', category: 'votacao' },
        { rank: 6, question: 'Qual a diferenca entre projeto de lei e indicacao?', count: 154, trend: 'rising', category: 'legislativo' },
        { rank: 7, question: 'Como solicitar pauta de sessao?', count: 132, trend: 'stable', category: 'sessao' },
        { rank: 8, question: 'Quais sao os tipos de materia legislativa?', count: 118, trend: 'declining', category: 'legislativo' },
        { rank: 9, question: 'Como funciona a comissao permanente?', count: 97, trend: 'stable', category: 'tramitacao' },
        { rank: 10, question: 'Qual o prazo de resposta para requerimentos?', count: 85, trend: 'rising', category: 'documento' },
      ])
    } finally {
      setLoadingQuestions(false)
    }
  }, [period])

  /**
   * Load confusion rate data
   */
  const loadConfusionRate = useCallback(async () => {
    setLoadingConfusion(true)
    try {
      const response = await adminIntelligenceService.getConfusionRate(period)
      if (response) {
        const confusionResponse = response as {
          trend?: { direction?: string; change_percentage?: string }
          avg_confusion_rate?: string
        }
        // Map backend response to frontend format
        const trendDirection = confusionResponse.trend?.direction || 'stable'
        const changePercentage = parseFloat(confusionResponse.trend?.change_percentage ?? '0') || 0
        setConfusionData({
          rate: parseFloat(confusionResponse.avg_confusion_rate ?? '0') || 0,
          target: 0.15, // Default target threshold
          trend: trendDirection as 'up' | 'down' | 'stable',
          change: changePercentage,
        })
      }
    } catch (error) {
      console.error('Error loading confusion rate:', error)
      setConfusionData({
        rate: 0,
        target: 0.15,
        trend: 'stable',
        change: 0,
      })
    } finally {
      setLoadingConfusion(false)
    }
  }, [period])

  /**
   * Load sentiment trends
   */
  const loadSentimentTrends = useCallback(async () => {
    setLoadingSentiment(true)
    try {
      const response = await adminIntelligenceService.getSentimentTrends(period)
      // Map backend daily_trends to frontend format
      const sentimentResponse = response as {
        daily_trends?: Array<{ date: string; positive: number; negative: number; neutral: number }>
        previous_totals?: { positive: number; negative: number; neutral: number }
      }
      if (sentimentResponse?.daily_trends && sentimentResponse.daily_trends.length > 0) {
        const mapped = sentimentResponse.daily_trends.map((item) => ({
          date: item.date.split('T')[0],
          positive: item.positive || 0,
          negative: item.negative || 0,
          neutral: item.neutral || 0,
        }))
        setSentimentData(mapped)
      } else {
        setSentimentData([])
      }
      // Capture previous_totals for comparison
      if (sentimentResponse?.previous_totals) {
        setSentimentComparison({
          previous_total_positive: sentimentResponse.previous_totals.positive || 0,
          previous_total_negative: sentimentResponse.previous_totals.negative || 0,
          previous_total_neutral: sentimentResponse.previous_totals.neutral || 0,
        })
      } else {
        setSentimentComparison(null)
      }
    } catch (error) {
      console.error('Error loading sentiment trends:', error)
      setSentimentData([])
      setSentimentComparison(null)
    } finally {
      setLoadingSentiment(false)
    }
  }, [period])

  /**
   * Load intent distribution
   */
  const loadIntentDistribution = useCallback(async () => {
    setLoadingIntents(true)
    try {
      const response = await adminIntelligenceService.getIntentDistribution(period)
      // Map backend distribution to frontend format
      const intentResponse = response as { distribution?: Array<{ intent_category: string; count: number; percentage: number }> }
      if (intentResponse?.distribution && intentResponse.distribution.length > 0) {
        const intentLabels: Record<string, string> = {
          'procedural_question': 'Consulta Procedimental',
          'status_inquiry': 'Consulta de Status',
          'document_request': 'Solicitacao de Documento',
          'regimento_inquiry': 'Consulta Regimento',
          'member_inquiry': 'Consulta Vereador',
          'statistics_request': 'Solicitacao Estatistica',
          'general_greeting': 'Saudacao',
          'complaint_feedback': 'Reclamacao/Feedback',
          'other': 'Outros',
        }
        const mapped = intentResponse.distribution.map((item) => ({
          intent: intentLabels[item.intent_category] || item.intent_category,
          count: parseInt(String(item.count)) || 0,
          percentage: item.percentage || 0,
        }))
        setIntentData(mapped)
      } else {
        setIntentData([])
      }
    } catch (error) {
      console.error('Error loading intent distribution:', error)
      setIntentData([])
    } finally {
      setLoadingIntents(false)
    }
  }, [period])

  /**
   * Load resolution rate data
   */
  const loadResolutionRate = useCallback(async () => {
    setLoadingResolution(true)
    try {
      const response = await adminIntelligenceService.getResolutionRate(period)
      setResolutionData(response as ResolutionRateData)
    } catch (error) {
      console.error('Error loading resolution rate:', error)
      setResolutionData(null)
    } finally {
      setLoadingResolution(false)
    }
  }, [period])

  /**
   * Load user segments data
   */
  const loadUserSegments = useCallback(async () => {
    setLoadingSegments(true)
    try {
      const response = await adminIntelligenceService.getUserSegments(period)
      const segmentsResponse = response as { segments?: UserSegmentData[] }
      setUserSegments(segmentsResponse?.segments || [])
    } catch (error) {
      console.error('Error loading user segments:', error)
      setUserSegments([])
    } finally {
      setLoadingSegments(false)
    }
  }, [period])

  /**
   * Load confusion events data
   */
  const loadConfusionEvents = useCallback(async () => {
    setLoadingConfusionEvents(true)
    try {
      const response = await adminIntelligenceService.getRecentConfusions(period)
      setConfusionEvents(response as ConfusionEventData)
    } catch (error) {
      console.error('Error loading confusion events:', error)
      setConfusionEvents(null)
    } finally {
      setLoadingConfusionEvents(false)
    }
  }, [period])

  /**
   * Refresh all data
   */
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        loadStats(),
        loadTopQuestions(),
        loadConfusionRate(),
        loadSentimentTrends(),
        loadIntentDistribution(),
        loadResolutionRate(),
        loadUserSegments(),
        loadConfusionEvents(),
      ])
      toast.success('Dados atualizados com sucesso')
    } catch {
      toast.error('Erro ao atualizar dados')
    } finally {
      setIsRefreshing(false)
    }
  }

  /**
   * Trigger reprocess
   */
  const handleReprocess = async () => {
    try {
      await adminIntelligenceService.triggerReprocess()
      toast.success('Reprocessamento iniciado')
      // Refresh data after a delay
      setTimeout(handleRefresh, 2000)
    } catch {
      toast.error('Erro ao iniciar reprocessamento')
    }
  }

  /**
   * Handle period change
   */
  const handlePeriodChange = (newPeriod: PeriodOption) => {
    setPeriod(newPeriod)
  }

  /**
   * Handle question click
   */
  const handleQuestionClick = (question: TopQuestion) => {
    console.log('Question clicked:', question)
    // Could navigate to detailed view or show modal
  }

  /**
   * Handle intent click
   */
  const handleIntentClick = (intent: IntentData) => {
    console.log('Intent clicked:', intent)
    // Could filter data or navigate to detailed view
  }

  /**
   * Determine alert level based on confusion rate
   */
  const getConfusionAlertLevel = (rate: number): AlertLevel => {
    if (rate < 0.15) return 'success'
    if (rate < 0.30) return 'warning'
    return 'danger'
  }

  /**
   * Determine alert level based on sentiment
   */
  const getSentimentAlertLevel = (sentiment: number): AlertLevel => {
    if (sentiment >= 0.6) return 'success'
    if (sentiment >= 0.4) return 'warning'
    return 'danger'
  }

  /**
   * Determine alert level based on resolution rate
   */
  const getResolutionAlertLevel = (rate: number): AlertLevel => {
    if (rate >= 70) return 'success'
    if (rate >= 50) return 'warning'
    return 'danger'
  }

  /**
   * Get power user segment from segments array
   */
  const getPowerUserSegment = (): UserSegmentData | null => {
    return userSegments.find(s => s.segment === 'power_user') || null
  }

  /**
   * Get unresolved confusion count
   */
  const getUnresolvedConfusionCount = (): number => {
    return confusionEvents?.unresolved_top?.length || 0
  }

  /**
   * Get total confusions count (from backend or sum of by_type counts)
   */
  const getTotalConfusionsCount = (): number => {
    if (confusionEvents?.total_confusions !== undefined) {
      return confusionEvents.total_confusions
    }
    if (!confusionEvents?.by_type) return 0
    return confusionEvents.by_type.reduce((sum, item) => sum + item.count, 0)
  }

  /**
   * Get total active users count (sum of all segments)
   */
  const getTotalActiveUsers = (): number => {
    return userSegments.reduce((sum, s) => sum + s.count, 0)
  }

  /**
   * Get dominant segment (the one with most users)
   */
  const getDominantSegment = (): UserSegmentData | null => {
    if (userSegments.length === 0) return null
    return userSegments.reduce((max, s) => s.count > max.count ? s : max, userSegments[0])
  }

  /**
   * Get segment label in Portuguese
   */
  const getSegmentLabel = (segment: string): string => {
    const labels: Record<string, string> = {
      'power_user': 'Power Users',
      'frequent_user': 'Frequentes',
      'casual_user': 'Casuais'
    }
    return labels[segment] || segment
  }

  // Load all data on mount and when period changes
  useEffect(() => {
    loadStats()
    loadTopQuestions()
    loadConfusionRate()
    loadSentimentTrends()
    loadIntentDistribution()
    loadResolutionRate()
    loadUserSegments()
    loadConfusionEvents()
  }, [loadStats, loadTopQuestions, loadConfusionRate, loadSentimentTrends, loadIntentDistribution, loadResolutionRate, loadUserSegments, loadConfusionEvents])

  return (
    <AdminLayout
      title="Intelligence Dashboard"
      description="Analise de inteligencia das conversas com IA"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-virtualis-blue-100 dark:bg-virtualis-blue-900/30 rounded-lg">
              <Brain className="h-5 w-5 text-virtualis-blue-600 dark:text-virtualis-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Metricas de Inteligencia
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Analise de padroes e insights das conversas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700',
                isRefreshing && 'opacity-50 cursor-not-allowed'
              )}
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              Atualizar
            </button>
            <button
              onClick={handleReprocess}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                'bg-virtualis-blue-600 text-white hover:bg-virtualis-blue-700',
                'dark:bg-virtualis-blue-500 dark:hover:bg-virtualis-blue-600'
              )}
            >
              <Brain className="h-4 w-4" />
              Reprocessar
            </button>
          </div>
        </div>

        {/* KPI Cards Grid - Primary metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <IntelligenceStatsCard
            title="Conversas Analisadas"
            value={stats?.totalConversations || 0}
            change={stats?.trends.conversations}
            changeLabel="vs. periodo anterior"
            icon={<MessageSquare className="h-6 w-6" />}
            alert="info"
            loading={loadingStats}
          />
          <IntelligenceStatsCard
            title="Perguntas Identificadas"
            value={stats?.totalQuestions || 0}
            change={stats?.trends.questions}
            changeLabel="vs. periodo anterior"
            icon={<HelpCircle className="h-6 w-6" />}
            alert="info"
            loading={loadingStats}
          />
          <IntelligenceStatsCard
            title="Taxa de Confusao"
            value={((stats?.confusionRate || 0) * 100).toFixed(1)}
            valueSuffix="%"
            change={stats?.trends.confusion}
            changeLabel="vs. periodo anterior"
            icon={<AlertTriangle className="h-6 w-6" />}
            alert={stats ? getConfusionAlertLevel(stats.confusionRate) : undefined}
            loading={loadingStats}
          />
          <IntelligenceStatsCard
            title="Sentimento Medio"
            value={((stats?.averageSentiment || 0) * 100).toFixed(0)}
            valueSuffix="%"
            change={stats?.trends.sentiment}
            changeLabel="vs. periodo anterior"
            subtitle="Satisfacao geral"
            alert={stats ? getSentimentAlertLevel(stats.averageSentiment) : undefined}
            loading={loadingStats}
          />
        </div>

        {/* KPI Cards Grid - Secondary metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <IntelligenceStatsCard
            title="Taxa de Resolucao"
            value={resolutionData?.current?.resolved?.percentage?.toFixed(1) || '0'}
            valueSuffix="%"
            change={resolutionData?.trend?.change_percentage}
            changeLabel="vs. periodo anterior"
            subtitle={`Media: ${typeof resolutionData?.avg_turns_to_resolution === 'number' ? resolutionData.avg_turns_to_resolution.toFixed(1) : '0'} turnos`}
            icon={<CheckCircle className="h-6 w-6" />}
            alert={resolutionData ? getResolutionAlertLevel(resolutionData.current?.resolved?.percentage || 0) : undefined}
            loading={loadingResolution}
          />
          <IntelligenceStatsCard
            title="Usuarios Power"
            value={getPowerUserSegment()?.count || 0}
            change={getPowerUserSegment()?.percentage}
            changeLabel="do total de usuarios"
            subtitle={`Avg: ${typeof getPowerUserSegment()?.avg_messages_per_session === 'number' ? getPowerUserSegment()?.avg_messages_per_session.toFixed(1) : '0'} msgs/sessao`}
            icon={<Users className="h-6 w-6" />}
            alert="info"
            loading={loadingSegments}
          />
          <IntelligenceStatsCard
            title="Usuarios Ativos"
            value={getTotalActiveUsers()}
            change={getDominantSegment()?.percentage}
            changeLabel={getDominantSegment() ? getSegmentLabel(getDominantSegment()!.segment) : 'do total'}
            subtitle={`Maioria: ${getDominantSegment() ? getSegmentLabel(getDominantSegment()!.segment) : 'N/A'}`}
            icon={<Users className="h-6 w-6" />}
            alert="info"
            loading={loadingSegments}
          />
          <IntelligenceStatsCard
            title="Total Confusoes"
            value={getTotalConfusionsCount()}
            subtitle={`${getUnresolvedConfusionCount()} nao resolvidas`}
            icon={<AlertCircle className="h-6 w-6" />}
            alert={getUnresolvedConfusionCount() > 5 ? 'danger' : getUnresolvedConfusionCount() > 0 ? 'warning' : 'success'}
            loading={loadingConfusionEvents}
          />
        </div>

        {/* Sentiment Trend Chart (Full Width) */}
        <SentimentTrendChart
          data={sentimentData}
          period={period}
          onPeriodChange={handlePeriodChange}
          loading={loadingSentiment}
          comparison={sentimentComparison}
        />

        {/* Two Column Layout: Top Questions + Confusion Gauge */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Questions (2/3 width) */}
          <div className="lg:col-span-2">
            <TopQuestionsChart
              data={topQuestions}
              loading={loadingQuestions}
              onQuestionClick={handleQuestionClick}
              maxItems={10}
            />
          </div>

          {/* Confusion Gauge (1/3 width) */}
          <div className="lg:col-span-1">
            <ConfusionRateGauge
              rate={confusionData?.rate || 0}
              target={confusionData?.target || 0.15}
              trend={confusionData?.trend || 'stable'}
              change={confusionData?.change}
              loading={loadingConfusion}
              subtitle="Conversas sem resposta satisfatoria"
              autoAlert={true}
            />
          </div>
        </div>

        {/* Intent Distribution (Full Width) */}
        <IntentBreakdownChart
          data={intentData}
          loading={loadingIntents}
          onIntentClick={handleIntentClick}
        />

        {/* Insights Rapidos Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Insights Rapidos
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Resumo de pontos de atencao e acesso rapido
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Top Confusoes Card */}
            <div className="p-5 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/10">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <h3 className="font-semibold text-red-900 dark:text-red-100">Top Confusoes</h3>
              </div>
              {loadingConfusionEvents ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-4 bg-red-200 dark:bg-red-800/30 rounded w-full" />
                  <div className="h-4 bg-red-200 dark:bg-red-800/30 rounded w-3/4" />
                  <div className="h-4 bg-red-200 dark:bg-red-800/30 rounded w-5/6" />
                </div>
              ) : confusionEvents?.by_type && confusionEvents.by_type.length > 0 ? (
                <ul className="space-y-2">
                  {confusionEvents.by_type.slice(0, 3).map((item, index) => (
                    <li key={index} className="flex items-center justify-between text-sm">
                      <span className="text-red-800 dark:text-red-200 truncate mr-2">{item.type}</span>
                      <span className="text-red-600 dark:text-red-400 font-medium whitespace-nowrap">
                        {item.count} ({item.resolved_count} resolvidos)
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-red-600 dark:text-red-400">Nenhuma confusao detectada</p>
              )}
            </div>

            {/* Segmentos Ativos Card */}
            <div className="p-5 rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/10">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Segmentos Ativos</h3>
              </div>
              {loadingSegments ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-4 bg-blue-200 dark:bg-blue-800/30 rounded w-full" />
                  <div className="h-4 bg-blue-200 dark:bg-blue-800/30 rounded w-3/4" />
                  <div className="h-4 bg-blue-200 dark:bg-blue-800/30 rounded w-5/6" />
                </div>
              ) : userSegments.length > 0 ? (
                <ul className="space-y-2">
                  {userSegments.slice(0, 3).map((segment, index) => (
                    <li key={index} className="flex items-center justify-between text-sm">
                      <span className="text-blue-800 dark:text-blue-200 capitalize truncate mr-2">
                        {segment.segment.replace(/_/g, ' ')}
                      </span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">
                        {segment.count} ({segment.percentage.toFixed(1)}%)
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-blue-600 dark:text-blue-400">Nenhum segmento disponivel</p>
              )}
            </div>

            {/* Link para Data Analyst Card */}
            <Link
              href="/admin/data-analyst"
              className="p-5 rounded-xl border border-purple-200 dark:border-purple-800/50 bg-purple-50 dark:bg-purple-900/10 hover:bg-purple-100 dark:hover:bg-purple-900/20 transition-colors group"
            >
              <div className="flex items-center gap-2 mb-3">
                <Database className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-semibold text-purple-900 dark:text-purple-100">Data Analyst</h3>
              </div>
              <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
                Explore dados detalhados com consultas em linguagem natural
              </p>
              <div className="flex items-center gap-1 text-sm font-medium text-purple-600 dark:text-purple-400 group-hover:gap-2 transition-all">
                <span>Acessar</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
