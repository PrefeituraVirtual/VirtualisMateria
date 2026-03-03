import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import { SEOHead } from '@/components/common/SEOHead'
import { MainLayout } from '@/components/layout/MainLayout'
import { Button } from '@/components/ui/Button'
import {
  Trash2, Loader2, Clock, Download, RefreshCw, CloudUpload, Mic, Check, AlertTriangle,
  X, Ban, Youtube, CheckCircle, Upload, Eye, Brain, Copy, Info, History, ChevronDown,
  FileAudio, Database, FileText
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { transcriptionService } from '@/lib/api'
import toast from 'react-hot-toast'
import { SessionSelector, SessionForTranscription } from '@/components/transcricao/SessionSelector'
import { TranscriptionAnalysisModal } from '@/components/transcricao/TranscriptionAnalysisModal'
import AtaAIGenerator from '@/components/atas/AtaAIGenerator'
import { cn } from '@/lib/utils'

// Types
interface TranscriptionJob {
  id: string
  status: 'pending' | 'processing' | 'downloading' | 'converting' | 'uploading' | 'transcribing' | 'completed' | 'partial' | 'failed' | 'cancelled'
  filename: string
  progress: number
  error?: string
  createdAt: string
  startedAt?: string
  finishedAt?: string
  type?: 'gemini' | 'whisper'
  hasAnalysis?: boolean
  analysisType?: string
  analysisCreatedAt?: string
  sessionId?: number
  ataId?: number
}

interface TranscriptionResult {
  transcription: string
  wordCount: number
  completedAt: string
  sessionId?: number
  type: 'gemini' | 'whisper' | 'google_v2'
}

// Confirm Modal Component
const ConfirmModal: React.FC<{
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}> = ({ isOpen, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', onConfirm, onCancel, isLoading }) => {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {message}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {confirmText}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Status badge component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
    pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pendente', icon: <Clock className="w-3 h-3" /> },
    processing: { color: 'bg-blue-100 text-blue-800', label: 'Processando', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    downloading: { color: 'bg-indigo-100 text-indigo-800', label: 'Baixando', icon: <Download className="w-3 h-3 animate-bounce" /> },
    converting: { color: 'bg-purple-100 text-purple-800', label: 'Convertendo', icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
    uploading: { color: 'bg-orange-100 text-orange-800', label: 'Enviando p/ Cloud', icon: <CloudUpload className="w-3 h-3" /> },
    transcribing: { color: 'bg-cyan-100 text-cyan-800', label: 'Transcrevendo', icon: <Mic className="w-3 h-3 animate-pulse" /> },
    completed: { color: 'bg-green-100 text-green-800', label: 'Concluido', icon: <Check className="w-3 h-3" /> },
    partial: { color: 'bg-orange-100 text-orange-800', label: 'Parcial', icon: <AlertTriangle className="w-3 h-3" /> },
    failed: { color: 'bg-red-100 text-red-800', label: 'Falhou', icon: <X className="w-3 h-3" /> },
    cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Cancelado', icon: <Ban className="w-3 h-3" /> },
  }

  const { color, label, icon } = config[status] || config.pending

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {icon}
      {label}
    </span>
  )
}

// Helper function to extract YouTube video ID
const extractYouTubeId = (url: string): string | null => {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
  const match = url.match(regex)
  return match ? match[1] : null
}

// Component to display YouTube video title (fetches from oEmbed API)
const YouTubeTitle: React.FC<{ videoId: string }> = ({ videoId }) => {
  const [title, setTitle] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTitle = async () => {
      try {
        const response = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
        )
        if (response.ok) {
          const data = await response.json()
          setTitle(data.title)
        }
      } catch {
        // Fallback to video ID if fetch fails
      } finally {
        setLoading(false)
      }
    }
    fetchTitle()
  }, [videoId])

  if (loading) {
    return <span className="text-gray-400">Carregando...</span>
  }

  return <span>{title || `YouTube: ${videoId}`}</span>
}

// YouTube URL Input Component with Video Preview
const YouTubeInput: React.FC<{
  onSubmit: (url: string, segmented: boolean) => void
  isLoading: boolean
}> = ({ onSubmit, isLoading }) => {
  const [url, setUrl] = useState('')
  const [segmented, _setSegmented] = useState(false)
  const [videoId, setVideoId] = useState<string | null>(null)

  // Extract video ID when URL changes
  useEffect(() => {
    const id = extractYouTubeId(url)
    setVideoId(id)
  }, [url])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) {
      toast.error('Digite a URL do YouTube')
      return
    }

    if (!videoId) {
      toast.error('URL do YouTube invalida')
      return
    }

    onSubmit(url, segmented)
    setUrl('')
    setVideoId(null)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          URL do YouTube
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-virtualis-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading || !videoId}
            className="px-6"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Mic className="h-5 w-5 mr-2" />
                Transcrever
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Video Preview */}
      <AnimatePresence>
        {videoId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-black">
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${videoId}?rel=0`}
                  title="YouTube video preview"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              Video detectado! Clique em "Transcrever" para iniciar.
            </div>
          </motion.div>
        )}
      </AnimatePresence>


    </form>
  )
}

// File Upload Component
const FileUpload: React.FC<{
  onUpload: (file: File) => void
  isLoading: boolean
}> = ({ onUpload, isLoading }) => {
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file: File) => {
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4', 'audio/m4a', 'video/mp4']
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|mp4|m4a|ogg|webm)$/i)) {
      toast.error('Formato nao suportado. Use MP3, WAV, MP4, M4A, OGG ou WEBM.')
      return
    }

    if (file.size > 2 * 1024 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Tamanho maximo: 2GB')
      return
    }

    onUpload(file)
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        dragActive
          ? 'border-virtualis-blue-500 bg-virtualis-blue-50 dark:bg-virtualis-blue-900/20'
          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
      } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/mp4"
        onChange={handleChange}
        className="hidden"
        disabled={isLoading}
      />

      <Upload className="mx-auto h-12 w-12 text-gray-400" />
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-virtualis-blue-600 hover:text-virtualis-blue-700 font-medium"
        >
          Clique para selecionar
        </button>{' '}
        ou arraste um arquivo aqui
      </p>
      <p className="mt-2 text-xs text-gray-500">
        MP3, WAV, MP4, M4A, OGG ou WEBM (max. 2GB)
      </p>
    </div>
  )
}

// Individual Job Item Component
const JobItem: React.FC<{
  job: TranscriptionJob
  onViewResult: (jobId: string) => void
  onCancel: (jobId: string) => void
  onDelete: (jobId: string) => void
  onAnalyze: (job: TranscriptionJob) => void
  onRestart: (jobId: string) => void
}> = ({ job, onViewResult, onCancel, onDelete, onAnalyze, onRestart }) => {
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {job.filename?.startsWith('youtube:') ? (
            <Youtube className="h-8 w-8 text-red-500 flex-shrink-0" />
          ) : (
            <FileAudio className="h-8 w-8 text-virtualis-blue-500 flex-shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {job.filename?.startsWith('youtube:') ? (
                <YouTubeTitle videoId={job.filename.replace('youtube:', '')} />
              ) : (
                job.filename || 'Arquivo sem nome'
              )}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {job.createdAt ? new Date(job.createdAt).toLocaleString('pt-BR') : 'Data não disponível'}
              {job.type && ` • ${job.type === 'gemini' ? 'Virtualis' : 'Virtualis'}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status={job.status} />

          {job.status === 'processing' && job.progress > 0 && (
            <div className="w-24">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-virtualis-blue-500 transition-all duration-300"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
              <p className="text-xs text-center text-gray-500 mt-1">{job.progress}%</p>
            </div>
          )}

          <div className="flex gap-2">
            {job.status === 'completed' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewResult(job.id)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Ver
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAnalyze(job)}
                  className={job.hasAnalysis
                    ? "text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20 border-green-300 dark:border-green-700"
                    : "text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/20"
                  }
                  title={job.hasAnalysis && job.analysisCreatedAt
                    ? `Analisado em ${new Date(job.analysisCreatedAt).toLocaleString('pt-BR')}`
                    : 'Iniciar analise com IA'
                  }
                >
                  {job.hasAnalysis ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Ver Analise
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-1" />
                      Analise
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsGeneratorOpen(!isGeneratorOpen)}
                  className={cn(
                    "transition-colors",
                    isGeneratorOpen 
                      ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100" 
                      : (job.ataId 
                          ? "text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/30" 
                          : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100")
                  )}
                  title={job.ataId ? "Ata ja gerada (Clique para ver)" : "Gerador de Ata"}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  {job.ataId ? "Ata Gerada" : "Gerador de Ata"}
                  <ChevronDown className={cn("h-3 w-3 ml-1 transition-transform duration-200", isGeneratorOpen ? "rotate-180" : "")} />
                </Button>
              </>
            )}

            {['pending', 'processing', 'downloading', 'converting', 'transcribing'].includes(job.status) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(job.id)}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </Button>
            )}

            {(job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(job.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                title="Excluir transcricao"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}

            {(job.status === 'failed' || job.status === 'cancelled' || job.status === 'processing' || job.status === 'transcribing') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRestart(job.id)}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                  title="Reiniciar transcricao"
                >
                   <RefreshCw className="h-4 w-4" />
                </Button>
              )}
          </div>
        </div>
      </div>

      {job.error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          Erro: {job.error}
        </p>
      )}

      {/* AI Ata Generator - Show only for completed transcriptions with session */}
      <AnimatePresence>
        {isGeneratorOpen && job.status === 'completed' && job.sessionId && (
           <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <AtaAIGenerator
                sessionId={job.sessionId}
                transcriptionJobId={job.id}
                onSuccess={(ataId) => {
                  console.log('Ata generated successfully:', ataId)
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Job List Component
const JobList: React.FC<{
  jobs: TranscriptionJob[]
  onViewResult: (jobId: string) => void
  onCancel: (jobId: string) => void
  onDelete: (jobId: string) => void
  onAnalyze: (job: TranscriptionJob) => void
  onRestart: (jobId: string) => void
  onRefresh: () => void
  isLoading: boolean
}> = ({ jobs, onViewResult, onCancel, onDelete, onAnalyze, onRestart, onRefresh: _onRefresh, isLoading: _isLoading }) => {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <FileAudio className="mx-auto h-12 w-12 mb-4 opacity-50" />
        <p>Nenhuma transcricao encontrada</p>
        <p className="text-sm mt-1">Inicie uma nova transcricao usando o formulario acima</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <JobItem
          key={job.id}
          job={job}
          onViewResult={onViewResult}
          onCancel={onCancel}
          onDelete={onDelete}
          onAnalyze={onAnalyze}
          onRestart={onRestart}
        />
      ))}
    </div>
  )
}

// Result Viewer Modal
const ResultViewer: React.FC<{
  result: TranscriptionResult | null
  isOpen: boolean
  isLoading: boolean
  onClose: () => void
  onCopy: () => void
  onDownload: () => void
}> = ({ result, isOpen, isLoading, onClose, onCopy, onDownload }) => {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Resultado da Transcricao
              </h2>
              {result && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {result.wordCount.toLocaleString()} palavras •
                  Processado via {result.type === 'gemini' ? 'Virtualis' : result.type === 'google_v2' ? 'OpenAI Whisper' : 'Virtualis'}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onCopy}>
                <Copy className="h-4 w-4 mr-1" />
                Copiar
              </Button>
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="h-4 w-4 mr-1" />
                Baixar
              </Button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-virtualis-blue-500" />
              </div>
            ) : result ? (
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {result.transcription}
              </pre>
            ) : (
              <p className="text-center text-gray-500">Nenhum resultado disponivel</p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

const InfoModal: React.FC<{
  isOpen: boolean
  onClose: () => void
}> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Info className="h-6 w-6 text-virtualis-blue-600" />
              Como Funciona
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          
          <div className="space-y-4 text-gray-600 dark:text-gray-300">
            <p>
              A transcricao de sessoes permite extrair o texto completo de arquivos de audio, video e sessoes do banco de dados utilizando IA.
            </p>
            <ul className="space-y-3">
              <li className="flex gap-3">
                <Youtube className="h-6 w-6 text-red-500 flex-shrink-0" />
                <span className="text-sm"><strong>YouTube:</strong> Cole a URL do video e a Virtualis transcreve diretamente. E a opcao mais rapida para videos ja publicados e publicos.</span>
              </li>
              <li className="flex gap-3">
                <Upload className="h-6 w-6 text-blue-500 flex-shrink-0" />
                <span className="text-sm"><strong>Upload:</strong> Envie arquivos de audio/video do seu computador. Opcional para gravacoes nao publicadas.</span>
              </li>
              <li className="flex gap-3">
                <Database className="h-6 w-6 text-purple-500 flex-shrink-0" />
                <span className="text-sm"><strong>Sessoes do Banco:</strong> Selecione sessoes ja cadastradas (processadas automaticamente e vinculadas as atas).</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={onClose} className="w-full sm:w-auto">
              Entendi
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Main Page Component
export default function TranscricaoPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // State
  const [jobs, setJobs] = useState<TranscriptionJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'youtube' | 'upload' | 'sessoes'>('youtube')

  // Result viewer
  const [resultViewerOpen, setResultViewerOpen] = useState(false)
  const [resultLoading, setResultLoading] = useState(false)
  const [currentResult, setCurrentResult] = useState<TranscriptionResult | null>(null)

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [jobToDelete, setJobToDelete] = useState<TranscriptionJob | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Analysis modal
  const [selectedJobForAnalysis, setSelectedJobForAnalysis] = useState<TranscriptionJob | null>(null)
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false)

  // Polling for job updates
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // UI State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [infoModalOpen, setInfoModalOpen] = useState(false)

  // Auth protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    try {
      const response = await transcriptionService.listJobs({ limit: 10 })
      if (response.success && Array.isArray(response.data)) {
        setJobs(response.data.map((job: any) => ({
          id: job.id,
          status: job.status,
          filename: job.originalFilename || job.original_filename || job.filename,
          progress: job.progress || 0,
          error: job.error_message || job.errorMessage,
          createdAt: job.createdAt || job.created_at,
          startedAt: job.processingStartTime || job.processing_start_time,
          finishedAt: job.processingEndTime || job.processing_end_time,
          type: (
            job.idSessao || job.id_sessao ||
            job.total_chunks > 0 ||
            !(job.originalFilename || job.original_filename || '').startsWith('youtube:')
          ) ? 'whisper' : 'gemini',
          hasAnalysis: job.hasAnalysis || false,
          analysisType: job.analysisType,
          analysisCreatedAt: job.analysisCreatedAt,
          sessionId: job.idSessao || job.id_sessao || job.sessionId,
          ataId: job.ataId || job.ata_id || job.generatedAtaId
        })))
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch and polling
  useEffect(() => {
    if (user) {
      fetchJobs()

      // Poll every 5 seconds for updates
      pollIntervalRef.current = setInterval(() => {
        fetchJobs()
      }, 5000)

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
        }
      }
    }
  }, [user, fetchJobs])

  // Handle YouTube transcription
  const handleYouTubeSubmit = async (url: string, segmented: boolean) => {
    setIsSubmitting(true)
    try {
      const response = await transcriptionService.transcribeYouTube(url, { segmented })

      if (response.success) {
        toast.success('Transcricao iniciada! Acompanhe o progresso abaixo.')
        fetchJobs()
      } else {
        const errorMessage = (response as { error?: string }).error
        toast.error(errorMessage || 'Erro ao iniciar transcricao')
      }
    } catch (error: any) {
      console.error('Error submitting YouTube URL:', error)
      toast.error(error.response?.data?.error || 'Erro ao iniciar transcricao')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    setIsSubmitting(true)
    const loadingToast = toast.loading(`Enviando ${file.name}...`)

    try {
      const response = await transcriptionService.uploadAudio(file)

      toast.dismiss(loadingToast)

      if (response.success) {
        toast.success('Arquivo enviado! Transcricao iniciada.')
        fetchJobs()
      } else {
        const errorMessage = (response as { error?: string }).error
        toast.error(errorMessage || 'Erro no upload')
      }
    } catch (error: any) {
      toast.dismiss(loadingToast)
      console.error('Error uploading file:', error)
      toast.error(error.response?.data?.error || 'Erro no upload do arquivo')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle session transcription (from database selector)
  const handleSessionTranscription = async (session: SessionForTranscription, segmented: boolean) => {
    setIsSubmitting(true)
    try {
      const response = await transcriptionService.transcribeSession(session.id, { segmented })

      if (response.success) {
        toast.success(`Transcricao da Sessao #${session.numero} iniciada! Acompanhe o progresso abaixo.`)
        fetchJobs()
      } else {
        const errorMessage = (response as { error?: string }).error
        toast.error(errorMessage || 'Erro ao iniciar transcricao da sessao')
      }
    } catch (error: any) {
      console.error('Error transcribing session:', error)
      toast.error(error.response?.data?.error || 'Erro ao iniciar transcricao da sessao')
    } finally {
      setIsSubmitting(false)
    }
  }

  // View result
  const handleViewResult = async (jobId: string) => {
    setResultViewerOpen(true)
    setResultLoading(true)
    setCurrentResult(null)

    try {
      const response = await transcriptionService.getResult(jobId) as {
        success: boolean
        transcription?: string
        wordCount?: number
        completedAt?: string
        sessionId?: number
        type?: string
        error?: string
      }

      if (response.success) {
        const resolvedType: TranscriptionResult['type'] =
          response.type === 'gemini' || response.type === 'google_v2' || response.type === 'whisper'
            ? response.type
            : 'whisper'

        setCurrentResult({
          transcription: response.transcription ?? '',
          wordCount: response.wordCount || 0,
          completedAt: response.completedAt ?? '',
          sessionId: response.sessionId,
          type: resolvedType
        })
      } else {
        toast.error(response.error || 'Erro ao carregar resultado')
      }
    } catch (error: any) {
      console.error('Error fetching result:', error)
      toast.error('Erro ao carregar resultado')
    } finally {
      setResultLoading(false)
    }
  }

  // Cancel job
  const handleCancelJob = async (jobId: string) => {
    try {
      await transcriptionService.cancel(jobId)
      toast.success('Job cancelado')
      fetchJobs()
    } catch (error) {
      console.error('Error canceling job:', error)
      toast.error('Erro ao cancelar job')
    }
  }

  // Delete job - opens modal
  const handleDeleteJob = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId)
    if (job) {
      setJobToDelete(job)
      setDeleteModalOpen(true)
    }
  }

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!jobToDelete) return

    setIsDeleting(true)
    try {
      await transcriptionService.cancel(jobToDelete.id)
      toast.success('Transcricao excluida')
      fetchJobs()
      setDeleteModalOpen(false)
      setJobToDelete(null)
    } catch (error: any) {
      // Se o erro for 404, significa que já foi deletado. Podemos considerar sucesso.
      if (error.response && error.response.status === 404) {
         toast.success('Transcricao ja excluida')
         fetchJobs()
         setDeleteModalOpen(false)
         setJobToDelete(null)
      } else {
        console.error('Error deleting job:', error)
        toast.error('Erro ao excluir transcricao')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  // Restart job implementation
  const handleRestartJob = async (jobId: string) => {
    try {
      const response = await transcriptionService.restart(jobId) as {
        success?: boolean
        message?: string
        error?: string
      }
      if (response.success) {
        toast.success(response.message || 'Job reiniciado com sucesso')
        fetchJobs()
      } else {
        toast.error(response.error || 'Erro ao reiniciar job')
      }
    } catch (error: any) {
      console.error('Error restarting job:', error)
      toast.error(error.response?.data?.error || 'Erro ao reiniciar job')
    }
  }

  // Cancel delete
  const handleCancelDelete = () => {
    setDeleteModalOpen(false)
    setJobToDelete(null)
  }

  // Copy result
  const handleCopyResult = () => {
    if (currentResult) {
      navigator.clipboard.writeText(currentResult.transcription)
      toast.success('Transcricao copiada!')
    }
  }

  // Download result
  const handleDownloadResult = () => {
    if (currentResult) {
      const blob = new Blob([currentResult.transcription], { type: 'text/plain' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `transcricao_${new Date().toISOString().split('T')[0]}.txt`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Download iniciado!')
    }
  }

  // Auth loading
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-virtualis-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <SEOHead
        title="Transcrição de Sessões"
        description="Transcreva e analise áudios de sessões legislativas com IA"
        canonical="/transcricao"
      />

      <MainLayout>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-5xl mx-auto space-y-6 pb-8"
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Mic className="h-7 w-7 text-virtualis-blue-600" />
                Transcricao de Sessoes
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Transcreva sessoes legislativas usando IA (Virtualis para YouTube e arquivos)
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setInfoModalOpen(true)}
                className="text-virtualis-blue-600 border-virtualis-blue-200 hover:bg-virtualis-blue-50 dark:border-virtualis-blue-800 dark:text-virtualis-blue-400 dark:hover:bg-virtualis-blue-900/20"
              >
                <Info className="h-4 w-4 mr-2" />
                Como Funciona
              </Button>
              <Button
                variant="outline"
                onClick={fetchJobs}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Input Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('youtube')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'youtube'
                    ? 'bg-gradient-to-t from-virtualis-gold-500/10 to-transparent text-virtualis-blue-600 dark:text-virtualis-blue-400 border-b-2 border-virtualis-gold-500'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Youtube className="inline-block h-4 w-4 mr-2" />
                URL do YouTube
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'upload'
                    ? 'bg-gradient-to-t from-virtualis-gold-500/10 to-transparent text-virtualis-blue-600 dark:text-virtualis-blue-400 border-b-2 border-virtualis-gold-500'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Upload className="inline-block h-4 w-4 mr-2" />
                Upload de Arquivo
              </button>
              <button
                onClick={() => setActiveTab('sessoes')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'sessoes'
                    ? 'bg-gradient-to-t from-virtualis-gold-500/10 to-transparent text-virtualis-blue-600 dark:text-virtualis-blue-400 border-b-2 border-virtualis-gold-500'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Database className="inline-block h-4 w-4 mr-2" />
                Sessoes do Banco
              </button>
            </div>

            {/* Tab Content */}
            <div className={activeTab === 'sessoes' ? '' : 'p-6'}>
              <AnimatePresence mode="wait">
                {activeTab === 'youtube' && (
                  <motion.div
                    key="youtube"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                  >
                    <YouTubeInput onSubmit={handleYouTubeSubmit} isLoading={isSubmitting} />
                  </motion.div>
                )}
                {activeTab === 'upload' && (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                  >
                    <FileUpload onUpload={handleFileUpload} isLoading={isSubmitting} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Sessions Selector - Full width outside the card when active */}
          {activeTab === 'sessoes' && (
            <motion.div
              key="sessoes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <SessionSelector
                onStartTranscription={handleSessionTranscription}
                onCancelTranscription={handleCancelJob}
                isLoading={isSubmitting}
              />
            </motion.div>
          )}



          {/* Jobs Section */}
          {/* Jobs Section - Collapsible */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <History className="h-5 w-5 text-virtualis-blue-500" />
                  Historico de Transcricoes
                </h2>
                {jobs.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {jobs.length} {jobs.length === 1 ? 'item' : 'itens'}
                    </span>
                    {jobs.some(j => ['processing', 'downloading', 'transcribing', 'pending'].includes(j.status)) && (
                      <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 animate-pulse">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Transcrevendo...
                      </span>
                    )}
                  </div>
                )}
              </div>
              <ChevronDown
                className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                  isHistoryOpen ? 'transform rotate-180' : ''
                }`}
              />
            </button>

            <AnimatePresence>
              {isHistoryOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 pt-0 border-t border-gray-100 dark:border-gray-700/50">
                    <JobList
                      jobs={jobs}
                      onViewResult={handleViewResult}
                      onCancel={handleCancelJob}
                      onDelete={handleDeleteJob}
                      onRestart={handleRestartJob}
                      onAnalyze={(job) => {
                        setSelectedJobForAnalysis(job)
                        setIsAnalysisModalOpen(true)
                      }}
                      onRefresh={fetchJobs}
                      isLoading={isLoading}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </MainLayout>

      {/* Result Viewer Modal */}
      <ResultViewer
        result={currentResult}
        isOpen={resultViewerOpen}
        isLoading={resultLoading}
        onClose={() => setResultViewerOpen(false)}
        onCopy={handleCopyResult}
        onDownload={handleDownloadResult}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Excluir Transcricao"
        message={jobToDelete ? `Deseja excluir a transcricao "${jobToDelete.filename?.replace('youtube:', 'YouTube: ') || 'sem nome'}"? Esta acao nao pode ser desfeita.` : ''}
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={isDeleting}
      />

      {/* Analysis Modal */}
      <TranscriptionAnalysisModal
        isOpen={isAnalysisModalOpen}
        onClose={() => {
          setIsAnalysisModalOpen(false)
          setSelectedJobForAnalysis(null)
        }}
        jobId={selectedJobForAnalysis?.id || ''}
        jobName={selectedJobForAnalysis?.filename?.replace('youtube:', 'YouTube: ') || 'Transcricao'}
      />

      {/* Info Modal */}
      <InfoModal
        isOpen={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
      />
    </>
  )
}
