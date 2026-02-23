import React from 'react'
import { Button } from '@/components/ui/Button'
import { Brain, Download, Save, X, Eye, AlertTriangle } from 'lucide-react'
import type { AnalysisResult } from '@/components/ai/DeepSeekAnalysis'

export interface AnalysisPanelProps {
  analysis: AnalysisResult
  onClose: () => void
  onExport: (analysis: AnalysisResult) => void
  onSave: (analysis: AnalysisResult) => void
  onViewFull: () => void
}

/**
 * AnalysisPanel - Displays detailed analysis results in a collapsible panel
 * This component is lazy-loaded to reduce initial bundle size
 */
export function AnalysisPanel({
  analysis,
  onClose,
  onExport,
  onSave,
  onViewFull,
}: AnalysisPanelProps) {
  return (
    <div
      role="region"
      aria-label="Painel de análise detalhada"
      className="mx-6 mb-4 border-t border-white/10 pt-4"
    >
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Análise Detalhada
          </h4>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport(analysis)}
              aria-label="Exportar análise"
              className="text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onSave(analysis)}
              aria-label="Salvar análise"
              className="bg-green-600 hover:bg-green-700 text-white border-none shadow-sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar nos Meus Documentos
            </Button>
            <button
              onClick={onClose}
              aria-label="Fechar painel de análise"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div role="status" className="text-center">
            <p className="text-lg font-bold text-purple-600">{analysis.confidence}%</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Confiança</p>
          </div>
          <div role="status" className="text-center">
            <p className="text-lg font-bold text-blue-600">{analysis.processingTime}s</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Tempo</p>
          </div>
          <div role="status" className="text-center">
            <p className="text-lg font-bold text-green-600">{analysis.result.compliance.score}%</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Conformidade</p>
          </div>
          <div role="status" className="text-center">
            <p className="text-lg font-bold text-amber-600">{analysis.result.recommendations.length}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Recomendações</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-medium">Resumo:</span> {analysis.result.summary}
          </p>

          {analysis.result.compliance.issues.length > 0 && (
            <div
              role="alert"
              aria-live="assertive"
              className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2"
            >
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
                Pontos de Atenção:
              </p>
              <ul className="text-xs text-amber-600 dark:text-amber-300 space-y-1">
                {analysis.result.compliance.issues.slice(0, 2).map((issue, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={onViewFull}
          >
            <Eye className="h-4 w-4 mr-1" />
            Ver Completo
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => onExport(analysis)}
            aria-label="Exportar análise"
          >
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AnalysisPanel
