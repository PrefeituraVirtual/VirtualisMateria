import React, { useState } from 'react'
import { MainLayout } from '@/components/layout/MainLayout'
import { SEOHead } from '@/components/common/SEOHead'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { DeepSeekAnalysis, AnalysisResult } from '@/components/ai/DeepSeekAnalysis'
import { useDeepSeekCache } from '@/hooks/useDeepSeekCache'
import { useAnalysisNotifications } from '@/hooks/useAnalysisNotifications'
import { useAuth } from '@/hooks/useAuth'
import {
  Brain, Zap, Database, Target, Microscope, Check, Plus, Eye, Download, Share2,
  Clock, Cpu, Trash2, Bell
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function AnalisePage() {
  const { user, loading } = useAuth()
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null)
  const [recentAnalyses, setRecentAnalyses] = useState<AnalysisResult[]>([])

  const { getCacheStats, getTopEntries, clear } = useDeepSeekCache({
    maxSize: 50,
    maxAge: 24
  })

  const {
    requestNotificationPermission,
    notificationPermission
  } = useAnalysisNotifications({
    enabled: true,
    desktop: true,
    sound: true
  })

  React.useEffect(() => {
    if (notificationPermission === 'default') {
      requestNotificationPermission()
    }

    const topEntries = getTopEntries(5)
    setRecentAnalyses(topEntries.map(entry => entry.entry.result))
  }, [notificationPermission, requestNotificationPermission, getTopEntries])

  const handleAnalysisComplete = (result: AnalysisResult) => {
    setCurrentAnalysis(result)
    setRecentAnalyses(prev => [result, ...prev.slice(0, 4)]) // Keep only 5 most recent
    toast.success('Análise concluída com sucesso!')
  }

  const handleNewAnalysis = () => {
    setCurrentAnalysis(null)
  }

  const cacheStats = getCacheStats()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will be redirected by useAuth
  }

  return (
    <>
      <SEOHead title="Análise IA Avançada" description="Análise legislativa avançada com Virtualis" />
      <MainLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl">
                <Brain className="h-8 w-8 text-white" />
              </div>
              Análise IA Avançada
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
              Realize análises legislativas detalhadas com Virtualis ou análises rápidas com Virtualis Chat
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass glass-dark border-0">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <Zap className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">Rápido</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">5-15 segundos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass glass-dark border-0">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-800">
                    <Brain className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">Profundo</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">60-120 segundos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass glass-dark border-0">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                    <Database className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{cacheStats.size}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Análises em cache</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass glass-dark border-0">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-800">
                    <Target className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{cacheStats.hitRate}%</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Taxa de acerto</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Analysis Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Analysis Component */}
            <div className="lg:col-span-2">
              <Card className="glass glass-dark border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Microscope className="h-5 w-5" />
                    Nova Análise
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!currentAnalysis ? (
                    <DeepSeekAnalysis
                      onAnalysisComplete={handleAnalysisComplete}
                    />
                  ) : (
                    <div className="space-y-6">
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                          <Check className="h-8 w-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                          Análise Concluída com Sucesso!
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                          Sua análise foi processada e está disponível para revisão
                        </p>
                        <Button onClick={handleNewAnalysis} variant="primary" className="mb-6">
                          <Plus className="h-4 w-4 mr-2" />
                          Realizar Nova Análise
                        </Button>
                      </div>

                      {/* Analysis Result Summary */}
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                          Resumo da Análise
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">{currentAnalysis.confidence}%</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Confiança</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-blue-600">{currentAnalysis.processingTime}s</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Tempo</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-purple-600">{currentAnalysis.result.compliance.score}%</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Conformidade</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-amber-600">{currentAnalysis.result.recommendations.length}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Recomendações</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-medium">Consulta:</span> {currentAnalysis.query}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                          <span className="font-medium">Resumo:</span> {currentAnalysis.result.summary}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <Button variant="primary" className="flex-1">
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <Download className="h-4 w-4 mr-2" />
                          Exportar
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <Share2 className="h-4 w-4 mr-2" />
                          Compartilhar
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Recent Analyses */}
              {recentAnalyses.length > 0 && (
                <Card className="glass glass-dark border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Análises Recentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentAnalyses.map((analysis, index) => (
                        <div
                          key={`${analysis.id}-${index}`}
                          className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                          onClick={() => setCurrentAnalysis(analysis)}
                        >
                          <div className="flex items-start gap-2">
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                              analysis.mode.id === 'deep' ? 'bg-purple-500' : 'bg-blue-500'
                            }`}></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {analysis.query}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {analysis.mode.name} • {analysis.confidence}% confiança
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Cache Info */}
              <Card className="glass glass-dark border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="h-5 w-5" />
                    Informações do Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Uso do Cache
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {cacheStats.size}/{cacheStats.totalEntries}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                          style={{ width: `${(cacheStats.size / cacheStats.totalEntries) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Taxa de Acerto
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {cacheStats.hitRate}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                          style={{ width: `${cacheStats.hitRate}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Memória Usada
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {cacheStats.memoryUsage}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        onClick={clear}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Limpar Cache
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notification Settings */}
              <Card className="glass glass-dark border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notificações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Notificações Desktop
                      </span>
                      <div className={`w-3 h-3 rounded-full ${
                        notificationPermission === 'granted'
                          ? 'bg-green-500'
                          : notificationPermission === 'denied'
                          ? 'bg-red-500'
                          : 'bg-amber-500'
                      }`}></div>
                    </div>

                    {notificationPermission !== 'granted' && (
                      <Button
                        onClick={requestNotificationPermission}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Bell className="h-4 w-4 mr-2" />
                        Ativar Notificações
                      </Button>
                    )}

                    {notificationPermission === 'granted' && (
                      <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <Check className="h-3 w-3" aria-hidden="true" /> Notificações ativadas para análises longas
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </MainLayout>
    </>
  )
}