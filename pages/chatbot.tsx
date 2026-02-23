import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { SEOHead } from '@/components/common/SEOHead'
import { MainLayout } from '@/components/layout/MainLayout'
import { Logo } from '@/components/common/Logo'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal, ModalTitle, ModalDescription } from '@/components/ui/Modal'
import { LoadingFallback } from '@/components/ui/LoadingFallback'
import { ErrorFallback } from '@/components/ui/ErrorFallback'

// Lazy-loaded AnalysisPanel for code splitting
const AnalysisPanel = dynamic(
  () => import('@/components/chatbot/AnalysisPanel').then(mod => mod.AnalysisPanel),
  {
    ssr: false,
    loading: () => (
      <div className="mx-6 mb-4 border-t border-white/10 pt-4">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800 animate-pulse">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
          <div className="grid grid-cols-4 gap-3 mb-3">
            {[1,2,3,4].map(i => <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />)}
          </div>
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    ),
  }
)

import {
  Plus, MessageCircle, Menu, Scale, Search, PanelRightClose, Lightbulb, Check, Eye, Save,
  User, Brain, Download, AlertTriangle, FileText, MessageSquare, Info, Send, AlertCircle,
  CheckCircle, FileEdit, HelpCircle, Users, GitBranch, FileCheck, BookOpen
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Icon map for dynamic icon lookup in suggestedQuestions
const iconMap: Record<string, LucideIcon> = {
  FileEdit, HelpCircle, Users, GitBranch, Scale, FileCheck, FileText, BookOpen
}
import { chatService, deepSeekService, documentsService } from '@/lib/api'
import { sendAIMessage } from '@/lib/ai-service'
import { ChatMessage, Conversation } from '@/types/api'
import { formatDateTime } from '@/lib/utils'
import { SafeMarkdown } from '@/lib/markdown-sanitizer'
import toast from 'react-hot-toast'
import { chatRateLimiter } from '@/lib/rate-limiter'
import { useAuth } from '@/hooks/useAuth'
import { AnalysisResult } from '@/components/ai/DeepSeekAnalysis'
import { useDeepSeekCache } from '@/hooks/useDeepSeekCache'
import { useAnalysisNotifications } from '@/hooks/useAnalysisNotifications'
import { SidebarSugestoes } from '@/components/chatbot/SidebarSugestoes'
import { chatMessageSchema, sanitizeInput, MAX_MESSAGE_LENGTH } from '@/lib/validation'
import { z } from 'zod'

type ChatErrorType = 'timeout' | 'network' | 'rate-limit' | 'server' | 'validation' | 'canceled' | 'unknown'
type ChatErrorContext = 'message' | 'analysis'

interface ChatErrorState {
  id: string
  message: string
  type: ChatErrorType
  context: ChatErrorContext
  mode?: 'fast' | 'sql' | 'deep'
  originalMessage?: string
  query?: string
}

export default function ChatbotPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState<string>('Processando...')
  const [loadingStep, setLoadingStep] = useState<number>(0)
  const [showSidebar, setShowSidebar] = useState(true)
  const [showRightSidebar, setShowRightSidebar] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatbot-right-sidebar-visible')
      return saved !== 'false'
    }
    return true
  })
  const [recentQueries, setRecentQueries] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('chatbot-recent-queries')
        return saved ? JSON.parse(saved) : []
      } catch {
        return []
      }
    }
    return []
  })
  const [chatMode, setChatMode] = useState<'chat' | 'analysis'>('chat')

  // Modo de interacao: chat (respostas rapidas) ou pesquisa (SQL)
  // Sempre inicia na aba Chat ao abrir o chatbot
  const [chatType, setChatType] = useState<'chat' | 'pesquisa'>('chat')

  // Modo de analise para funcionalidades avancadas (mantido para compatibilidade)
  const [analysisMode] = useState<'sql' | 'deep' | 'fast'>('sql')
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false)
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null)
  const [showFullAnalysisModal, setShowFullAnalysisModal] = useState(false)
  const [inputError, setInputError] = useState<string | null>(null)
  const [messageError, setMessageError] = useState<ChatErrorState | null>(null)
  const [lastSentMessage, setLastSentMessage] = useState<{ message: string; mode: 'fast' | 'sql' } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Hooks para cache e notificações
  const { get: _getCachedAnalysis, set: setCachedAnalysis } = useDeepSeekCache({
    maxSize: 30,
    maxAge: 12 // 12 horas
  })
  const {
    requestNotificationPermission: _requestNotificationPermission,
    notificationPermission: _notificationPermission,
    analysisState
  } = useAnalysisNotifications({
    enabled: true,
    desktop: true,
    sound: true
  })

  // Persistir mudanca de modo
  useEffect(() => {
    localStorage.setItem('chatbot-mode', chatType)
  }, [chatType])

  // Persistir estado da sidebar direita
  useEffect(() => {
    localStorage.setItem('chatbot-right-sidebar-visible', String(showRightSidebar))
  }, [showRightSidebar])

  // Persistir historico de queries recentes
  useEffect(() => {
    localStorage.setItem('chatbot-recent-queries', JSON.stringify(recentQueries))
  }, [recentQueries])

  // Funcao para adicionar query ao historico recente
  const addToRecentQueries = (query: string) => {
    setRecentQueries(prev => {
      // Remove duplicatas e adiciona no inicio
      const filtered = prev.filter(q => q !== query)
      return [query, ...filtered].slice(0, 3)
    })
  }

  // Funcao para cancelar requisicao em andamento
  const cancelCurrentRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsLoading(false)
      setLoadingStatus('Processando...')
      setLoadingStep(0)
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current)
        loadingIntervalRef.current = null
      }
      toast('Operacao cancelada', { duration: 2000, icon: 'ℹ️' })
    }
  }, [])

  // Funcao para reenviar ultima mensagem apos erro
  const retryLastMessage = useCallback(() => {
    if (lastSentMessage) {
      setMessageError(null)
      // Remover a ultima mensagem de erro do chat
      setMessages(prev => prev.filter(m => !m.metadata?.isError))
      setInputMessage(lastSentMessage.message)
      // Enviar automaticamente apos um pequeno delay para UX
      setTimeout(() => {
        const sendBtn = document.querySelector('[data-send-button]') as HTMLButtonElement
        sendBtn?.click()
      }, 100)
    }
  }, [lastSentMessage])

  // Funcao para limpar erro de mensagem
  // Sugestões de perguntas - Dinâmicas baseadas no modo
  const suggestedQuestions = useMemo(() => {
    if (chatType === 'chat') {
      return [
        { question: 'Como elaborar um projeto de lei municipal?', icon: 'FileEdit', color: 'from-blue-500/10 to-indigo-500/10', borderColor: 'border-blue-200/60 dark:border-blue-800/60', iconColor: 'text-blue-500 dark:text-blue-400' },
        { question: 'Qual a diferença entre indicação e requerimento?', icon: 'HelpCircle', color: 'from-emerald-500/10 to-teal-500/10', borderColor: 'border-emerald-200/60 dark:border-emerald-800/60', iconColor: 'text-emerald-500 dark:text-emerald-400' },
        { question: 'Quais são os tipos de quórum para votação?', icon: 'Users', color: 'from-violet-500/10 to-purple-500/10', borderColor: 'border-violet-200/60 dark:border-violet-800/60', iconColor: 'text-violet-500 dark:text-violet-400' },
        { question: 'Como funciona o processo de tramitação?', icon: 'GitBranch', color: 'from-amber-500/10 to-orange-500/10', borderColor: 'border-amber-200/60 dark:border-amber-800/60', iconColor: 'text-amber-500 dark:text-amber-400' },
      ]
    }
    return [
      { question: 'Qual o quorum para aprovar projeto de lei?', icon: 'Scale', color: 'from-blue-500/10 to-indigo-500/10', borderColor: 'border-blue-200/60 dark:border-blue-800/60', iconColor: 'text-blue-500 dark:text-blue-400' },
      { question: 'Projetos de lei aprovados', icon: 'FileCheck', color: 'from-emerald-500/10 to-teal-500/10', borderColor: 'border-emerald-200/60 dark:border-emerald-800/60', iconColor: 'text-emerald-500 dark:text-emerald-400' },
      { question: 'Quais matérias estão em tramitação?', icon: 'FileText', color: 'from-violet-500/10 to-purple-500/10', borderColor: 'border-violet-200/60 dark:border-violet-800/60', iconColor: 'text-violet-500 dark:text-violet-400' },
      { question: 'Leis municipais sobre educação', icon: 'BookOpen', color: 'from-amber-500/10 to-orange-500/10', borderColor: 'border-amber-200/60 dark:border-amber-800/60', iconColor: 'text-amber-500 dark:text-amber-400' },
    ]
  }, [chatType])

  // Mensagem de boas-vindas - Dinâmica baseada no modo
  const welcomeMessage = useMemo(() => {
    if (chatType === 'chat') {
      return {
        title: 'Olá! Sou Virtualis, seu Especialista Legislativo',
        subtitle: 'Posso ajudar com orientações sobre processo legislativo, como elaborar projetos de lei, indicações, requerimentos, quórum, tramitação e muito mais. Pergunte à vontade!',
        badgeText: 'Modo Chat',
        badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
      }
    }
    return {
      title: 'Olá! Sou Virtualis, seu Assistente de Pesquisa',
      subtitle: 'Posso consultar o banco de dados da Câmara para encontrar informações sobre vereadores, projetos de lei, matérias em tramitação, votações e muito mais.',
      badgeText: 'Modo Pesquisa',
      badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
    }
  }, [chatType])

  // useEffect para redirecionamento de autenticação
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  // useEffect para scroll automático
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // useEffect para carregar conversas
  useEffect(() => {
    if (user) {
      loadConversations()
    }
  }, [user])

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  // Se não está autenticado, não renderizar nada (redirecionamento em andamento)
  if (!user) {
    return null
  }

  const loadConversations = async () => {
    try {
      const response = await chatService.getConversations()
      const conversationsData =
        (response as { data?: Conversation[] })?.data ||
        (Array.isArray(response) ? response as Conversation[] : [])
      setConversations(conversationsData)
    } catch (error) {
      console.error('Error loading conversations:', error)
    }
  }

  const loadConversation = async (id: string) => {
    try {
      const response = await chatService.getHistory(id)
      const responseData = response as { messages?: ChatMessage[]; data?: { messages?: ChatMessage[] } }
      setMessages(responseData.messages || responseData.data?.messages || [])
      setCurrentConversation(id)
    } catch (error) {
      console.error('Error loading conversation:', error)
      toast.error('Erro ao carregar conversa')
    }
  }

  const createNewConversation = async () => {
    try {
      const response = await chatService.createConversation('Nova Conversa')
      if (response?.success) {
        setConversations([response.data, ...conversations])
        setCurrentConversation(response.data.id)
      }
      setMessages([])
    } catch (error) {
      console.error('Error creating conversation:', error)
      toast.error('Erro ao criar nova conversa')
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    if (inputMessage.length > MAX_MESSAGE_LENGTH) {
      setInputError(`Mensagem excede o limite de ${MAX_MESSAGE_LENGTH} caracteres.`)
      toast.error('Mensagem excede o limite permitido')
      return
    }

    // Rate limiting check
    if (!chatRateLimiter.tryConsume()) {
      const waitTime = Math.ceil(chatRateLimiter.getTimeUntilNextToken() / 1000)
      toast.error(`Aguarde ${waitTime} segundos antes de enviar outra mensagem.`, {
        duration: 4000,
        icon: '⏱️'
      })
      return
    }

    // Validar mensagem com Zod
    try {
      chatMessageSchema.parse({
        message: inputMessage,
        mode: chatType === 'pesquisa' ? 'sql' : 'fast'
      })
      setInputError(null)
    } catch (error) {
      if (error instanceof z.ZodError) {
        setInputError(error.issues[0]?.message || 'Mensagem invalida')
        return
      }
    }

    const messageContent = sanitizeInput(inputMessage.trim())

    // Guardar mensagem para possivel retry
    setLastSentMessage({ message: messageContent, mode: chatType === 'pesquisa' ? 'sql' : 'fast' })
    // Limpar erro anterior
    setMessageError(null)

    // Criar novo AbortController para esta requisicao
    abortControllerRef.current = new AbortController()

    // Adicionar ao historico de queries recentes
    addToRecentQueries(messageContent)

    // Se estiver em modo de análise, usar o componente de análise
    if (chatMode === 'analysis') {
      await handleDeepAnalysis(messageContent)
      return
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
      conversationId: currentConversation || undefined,
    }

    setMessages([...messages, userMessage])
    setInputMessage('')
    setIsLoading(true)
    setLoadingStep(0)
    
    // Mensagens de loading amigáveis
    const loadingMessages = [
      '🔍 Entendendo sua pergunta...',
      '📚 Consultando a base legislativa...',
      '⚡ Buscando informações...',
      '✨ Preparando resposta...'
    ]
    
    let stepIndex = 0
    setLoadingStatus(loadingMessages[0])
    
    loadingIntervalRef.current = setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, loadingMessages.length - 1)
      setLoadingStatus(loadingMessages[stepIndex])
      setLoadingStep(stepIndex + 1)
    }, 10000) // 10 segundos entre cada mensagem

    try {
      // Determinar o modo baseado no chatType selecionado pelo usuario
      // chat = respostas rapidas (fast -> standard no backend), pesquisa = SQL inteligente
      const selectedMode: 'sql' | 'fast' = chatType === 'pesquisa' ? 'sql' : 'fast'

      let response: any

      if (selectedMode === 'sql') {
        // SQL Chat mode - uses intelligent SQL generation with auto-correction
        response = await sendAIMessage(
          {
            message: messageContent,
            mode: 'sql',
            conversationId: currentConversation || undefined
          },
          {
            timeout: 300000, // 5 minutes for SQL chat (may need multiple iterations)
            retries: 1,
            onRetry: (attempt) => {
              toast.loading(`Reconectando ao servidor SQL... (tentativa ${attempt + 1})`, {
                id: 'sql-retry',
                duration: 3000
              })
            }
          }
        )
        toast.dismiss('sql-retry')
      } else {
        // Fast mode (converted to standard in backend) - respostas rapidas via proxy
        response = await deepSeekService.chatWithMode(
          messageContent,
          'fast',
          currentConversation || undefined
        )
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        conversationId: currentConversation || undefined,
        metadata: {
          mode: selectedMode,
          model: selectedMode === 'sql' ? 'deepseek-reasoner' : 'deepseek-chat',
          ...(selectedMode === 'sql' && response.metadata ? {
            iterations: response.metadata.iterations,
            queriesExecuted: response.metadata.queriesExecuted,
            totalRows: response.metadata.totalRows,
            contextoArea: response.metadata.contextoArea
          } : {})
        }
      }

      setMessages(prev => [...prev, assistantMessage])

      if (!currentConversation && response.conversationId) {
        setCurrentConversation(response.conversationId)
        await loadConversations()
      }

      // Notificar se foi usada pesquisa SQL
      if (selectedMode === 'sql') {
        toast.success('Pesquisa SQL realizada com sucesso!', {
          duration: 3000,
          icon: '🔍'
        })
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      const errorMessage = error.message || 'Erro desconhecido'

      setMessageError(errorMessage)

      // Adicionar mensagem de erro no chat para o usuario poder tentar novamente
      const errorChatMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `**Erro ao processar sua mensagem**\n\n${errorMessage}\n\nClique em "Tentar Novamente" abaixo para reenviar.`,
        timestamp: new Date(),
        conversationId: currentConversation || undefined,
        metadata: { isError: true, originalMessage: messageContent }
      }
      setMessages(prev => [...prev, errorChatMessage])

      // Toast apenas para erros criticos
      if (errorMessage.includes('tempo limite') || errorMessage.includes('timeout')) {
        toast.error(
          'O servidor demorou muito para responder. Tente novamente.',
          { duration: 5000 }
        )
      }
    } finally {
      toast.dismiss('chat-retry')
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current)
        loadingIntervalRef.current = null
      }
      abortControllerRef.current = null
      setIsLoading(false)
      setLoadingStep(0)
      setLoadingStatus('Processando...')
    }
  }

  const handleDeepAnalysis = async (query: string) => {
    setIsLoading(true)
    setInputMessage('')
    setLoadingStep(0)

    // Fases do processamento para análise
    const analysisPhases = analysisMode === 'deep'
      ? [
          { step: 1, msg: '🔍 Analisando sua consulta...', duration: 1500 },
          { step: 2, msg: '📚 Buscando contexto no Regimento Interno...', duration: 3000 },
          { step: 3, msg: '🔗 Correlacionando documentos relevantes...', duration: 4000 },
          { step: 4, msg: '🧠 Processando com Virtualis (raciocínio profundo)...', duration: 15000 },
          { step: 5, msg: '⏳ Aguarde, a IA está elaborando uma resposta completa...', duration: 30000 },
          { step: 6, msg: '✨ Finalizando análise (pode levar até 2 minutos)...', duration: 60000 }
        ]
      : [
          { step: 1, msg: '🔍 Analisando sua consulta...', duration: 1000 },
          { step: 2, msg: '📚 Buscando documentos relevantes...', duration: 2000 },
          { step: 3, msg: '⚡ Processando com Virtualis Chat...', duration: 3000 },
          { step: 4, msg: '⏳ Aguarde, a IA está processando (pode levar alguns segundos)...', duration: 20000 },
          { step: 5, msg: '🔄 Ainda processando, por favor aguarde...', duration: 60000 },
          { step: 6, msg: '✨ Finalizando resposta...', duration: 30000 }
        ]

    // Iniciar simulação de progresso
    setLoadingStatus(analysisPhases[0].msg)
    setLoadingStep(1)
    
    let currentPhase = 0
    const phaseInterval = setInterval(() => {
      currentPhase++
      if (currentPhase < analysisPhases.length) {
        setLoadingStatus(analysisPhases[currentPhase].msg)
        setLoadingStep(currentPhase + 1)
      }
    }, analysisMode === 'deep' ? 5000 : 2000)

    // CACHE DESABILITADO TEMPORARIAMENTE PARA DEBUG
    // const cached = getCachedAnalysis(query, analysisMode)
    // if (cached) {
    //   clearInterval(phaseInterval)
    //   setCurrentAnalysis(cached)
    //   setShowAnalysisPanel(true)
    //   toast.success('Análise recuperada do cache!')
    //   setIsLoading(false)
    //   return
    // }

    try {
      // Adicionar mensagem do usuário
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: `🔍 Análise ${analysisMode === 'deep' ? 'profunda (Virtualis)' : 'rápida'}: ${query}`,
        timestamp: new Date(),
        conversationId: currentConversation || undefined,
      }

      setMessages(prev => [...prev, userMessage])

      // Realizar análise
      const result = await deepSeekService.analyze(query, analysisMode, {
        councilMember: user,
        conversationId: currentConversation
      })
      
      // Limpar interval ao receber resposta
      clearInterval(phaseInterval)

      // Salvar no cache
      setCachedAnalysis(query, analysisMode, result)

      // Adicionar mensagem de resultado
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `✅ Análise ${analysisMode === 'deep' ? 'profunda' : 'rápida'} concluída!\n\n**Resumo:** ${result.result.summary}\n\n**Confiança:** ${result.confidence}%\n\n[Clique para ver detalhes completos]`,
        timestamp: new Date(),
        conversationId: currentConversation || undefined,
        metadata: {
          analysisResult: result,
          mode: analysisMode
        }
      }

      setMessages(prev => [...prev, assistantMessage])
      setCurrentAnalysis(result)
      // Não abrir o painel automaticamente - usuário clica em "Ver detalhes completos"
      // setShowAnalysisPanel(true)

      toast.success(`Análise ${analysisMode === 'deep' ? 'profunda' : 'rápida'} concluída!`, {
        duration: 5000,
        icon: analysisMode === 'deep' ? '🧠' : '⚡'
      })

    } catch (error) {
      console.error('Analysis error:', error)
      clearInterval(phaseInterval)
      toast.error(analysisMode === 'deep'
        ? 'Erro na análise profunda. Tente novamente ou use o modo rápido.'
        : 'Erro na análise. Tente novamente.')
    } finally {
      setIsLoading(false)
      setLoadingStep(0)
      setLoadingStatus('Processando...')
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAnalysisComplete = (result: AnalysisResult) => {
    setCurrentAnalysis(result)
    setCachedAnalysis(result.query, result.mode.id, result)

    // Adicionar mensagem na conversa
    const assistantMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `✅ **Análise ${result.mode.name} Concluída**\n\n**Consulta:** ${result.query}\n**Confiança:** ${result.confidence}%\n**Tempo:** ${result.processingTime}s\n\n**Resumo:** ${result.result.summary}`,
      timestamp: new Date(),
      conversationId: currentConversation || undefined,
      metadata: {
        analysisResult: result,
        mode: result.mode.id
      }
    }

    setMessages(prev => [...prev, assistantMessage])
    // Não abrir o painel automaticamente - usuário clica em "Ver detalhes completos"
    // setShowAnalysisPanel(true)
    setChatMode('chat')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const toggleMode = () => {
    if (chatMode === 'chat') {
      setChatMode('analysis')
      toast(`Modo de análise ativado (${analysisMode === 'deep' ? 'Virtualis' : 'rápido'})`)
    } else {
      setChatMode('chat')
      setShowAnalysisPanel(false)
      toast('Modo de chat normal ativado')
    }
  }

  // Função para exportar análise como arquivo de texto
  const handleExportAnalysis = (analysis: AnalysisResult | null) => {
    if (!analysis) {
      toast.error('Nenhuma análise para exportar')
      return
    }

    const formatDate = (date: Date) => {
      return new Date(date).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // Criar conteúdo do arquivo
    const content = `
═══════════════════════════════════════════════════════════════════
                    ANÁLISE LEGISLATIVA - MATERIA VIRTUALIS
═══════════════════════════════════════════════════════════════════

📅 Data: ${formatDate(analysis.metadata.timestamp)}
🤖 Modelo: ${analysis.metadata.model}
⚡ Modo: ${analysis.mode.name}
⏱️ Tempo de processamento: ${analysis.processingTime}s
📊 Confiança: ${analysis.confidence}%

───────────────────────────────────────────────────────────────────
                           CONSULTA
───────────────────────────────────────────────────────────────────

${analysis.query}

───────────────────────────────────────────────────────────────────
                           RESUMO
───────────────────────────────────────────────────────────────────

${analysis.result.summary}

───────────────────────────────────────────────────────────────────
                      ANÁLISE DETALHADA
───────────────────────────────────────────────────────────────────

${analysis.result.detailedAnalysis || 'Não disponível'}

───────────────────────────────────────────────────────────────────
                      BASE LEGAL
───────────────────────────────────────────────────────────────────

${analysis.result.legalBasis?.length > 0 
  ? analysis.result.legalBasis.map((item, i) => `${i + 1}. ${item}`).join('\n')
  : 'Não especificada'}

───────────────────────────────────────────────────────────────────
                      RECOMENDAÇÕES
───────────────────────────────────────────────────────────────────

${analysis.result.recommendations?.length > 0 
  ? analysis.result.recommendations.map((item, i) => `${i + 1}. ${item}`).join('\n')
  : 'Nenhuma recomendação'}

───────────────────────────────────────────────────────────────────
                      CONFORMIDADE
───────────────────────────────────────────────────────────────────

📊 Score de Conformidade: ${analysis.result.compliance?.score || 0}%

${analysis.result.compliance?.issues?.length > 0 
  ? `⚠️ Pontos de Atenção:\n${analysis.result.compliance.issues.map((item, i) => `   ${i + 1}. ${item}`).join('\n')}`
  : '✅ Nenhum ponto de atenção identificado'}

${analysis.result.compliance?.suggestions?.length > 0 
  ? `\n💡 Sugestões:\n${analysis.result.compliance.suggestions.map((item, i) => `   ${i + 1}. ${item}`).join('\n')}`
  : ''}

═══════════════════════════════════════════════════════════════════
        Gerado por Materia Virtualis - Câmara Municipal de Valparaíso de Goiás
═══════════════════════════════════════════════════════════════════
`.trim()

    // Criar e baixar arquivo
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `analise-legislativa-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success('Análise exportada com sucesso!')
  }

  // Save analysis to My Documents
  const handleSaveDocument = async (analysis: AnalysisResult | null) => {
    if (!analysis) return

    try {
      const loadingToast = toast.loading('Salvando documento...')
      
      await documentsService.create({
        title: `Análise: ${analysis.query.substring(0, 50)}${analysis.query.length > 50 ? '...' : ''}`,
        content: `
ANÁLISE LEGISLATIVA - MATERIA VIRTUALIS
Data: ${new Date(analysis.metadata.timestamp).toLocaleString('pt-BR')}
Modelo: ${analysis.metadata.model}
Modo: ${analysis.mode.name}

CONSULTA:
${analysis.query}

RESUMO:
${analysis.result.summary}

ANÁLISE DETALHADA:
${analysis.result.detailedAnalysis || 'Não disponível'}

BASE LEGAL:
${analysis.result.legalBasis?.join('\n') || 'Não especificada'}

RECOMENDAÇÕES:
${analysis.result.recommendations?.join('\n') || 'Nenhuma recomendação'}
        `.trim(),
        type: 'ANALISE_IA'
      })

      toast.dismiss(loadingToast)
      toast.success('Documento salvo em "Meus Documentos"!', {
        icon: '💾',
        duration: 4000
      })
    } catch (error) {
      console.error('Error saving document:', error)
      toast.error('Erro ao salvar documento. Tente novamente.')
    }
  }

  // Save specific message to My Documents
  const handleSaveMessage = async (message: ChatMessage) => {
    try {
      const loadingToast = toast.loading('Salvando mensagem...')
      
      const title = message.content.split('\n')[0].substring(0, 50) + (message.content.length > 50 ? '...' : '')
      
      await documentsService.create({
        title: `Chat: ${title || 'Nova Conversa'}`,
        content: message.content,
        type: 'CHAT_MSG'
      })

      toast.dismiss(loadingToast)
      toast.success('Mensagem salva em "Meus Documentos"!', {
        icon: '💾',
        duration: 4000
      })
    } catch (error) {
      console.error('Error saving message:', error)
      toast.error('Erro ao salvar mensagem. Tente novamente.')
    }
  }

  return (
    <>
      <SEOHead
        title="Chatbot IA - Assistente Legislativo"
        description="Converse com nosso assistente de IA para tirar dúvidas sobre processos legislativos e matérias"
        canonical="/chatbot"
      />

      <MainLayout>
        <div className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:left-4 focus-within:top-4 focus-within:z-50 flex flex-col gap-2">
          <a
            href="#chat-messages"
            className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-lg focus:outline-none dark:bg-gray-900 dark:text-gray-100"
          >
            Pular para área de mensagens
          </a>
          <a
            href="#chat-input"
            className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-lg focus:outline-none dark:bg-gray-900 dark:text-gray-100"
          >
            Pular para campo de entrada
          </a>
          <a
            href="#chat-suggestions"
            className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-lg focus:outline-none dark:bg-gray-900 dark:text-gray-100"
          >
            Pular para sugestões
          </a>
        </div>
        <div className="max-w-7xl mx-auto h-[calc(100vh-9rem)] overflow-hidden">
          <div className="flex gap-4 h-full">
            {/* Sidebar de Conversas */}
            <div
              role="complementary"
              aria-label="Histórico de conversas"
              className={`${showSidebar ? 'w-64' : 'w-0'} transition-all duration-300 overflow-hidden`}
            >
              <Card className="h-full flex flex-col glass glass-dark border-0">
                <div className="p-4 border-b-0 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-virtualis-gold-500/50 after:to-transparent">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full shadow-lg shadow-blue-500/20"
                    onClick={createNewConversation}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Conversa
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {(conversations || []).map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => loadConversation(conv.id)}
                      className={`w-full text-left p-3 rounded-xl mb-2 transition-all duration-200 ${
                        currentConversation === conv.id
                          ? 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'hover:bg-white/50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <MessageCircle className="h-4 w-4 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{conv.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(conv.updated_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            </div>

            {/* Área de Chat */}
            <div className="flex-1 flex flex-col min-h-0">
              <Card className="flex-1 flex flex-col min-h-0 glass glass-dark border-0">
                {/* Header */}
                <div className="p-4 border-b-0 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-virtualis-gold-500/50 after:to-transparent flex items-center justify-between bg-white/5 dark:bg-gray-900/5 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSidebar(!showSidebar)}
                      aria-label={showSidebar ? 'Ocultar histórico de conversas' : 'Mostrar histórico de conversas'}
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                    <div>
                      <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Scale className="h-5 w-5 text-blue-600" />
                        Especialista Legislativo
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        Powered by <span className="font-medium text-blue-600 dark:text-blue-400">Virtualis</span>
                        {/* {false && (
                          <span className="text-purple-600">• DeepSeek {analysisMode === 'deep' ? 'R1' : 'Chat'}</span>
                        )} */}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Toggle de Modo */}
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                      <button
                        onClick={() => setChatType('chat')}
                        aria-label="Modo chat"
                        aria-pressed={chatType === 'chat'}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-all ${
                          chatType === 'chat'
                            ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                        }`}
                      >
                        <MessageCircle className="h-4 w-4" />
                        Chat
                      </button>
                      <button
                        onClick={() => setChatType('pesquisa')}
                        aria-label="Modo pesquisa"
                        aria-pressed={chatType === 'pesquisa'}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-all ${
                          chatType === 'pesquisa'
                            ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                        }`}
                      >
                        <Search className="h-4 w-4" />
                        Pesquisa
                      </button>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2">
                      {analysisState.isRunning && (
                        <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-medium">
                            {Math.round(analysisState.progress)}%
                          </span>
                        </div>
                      )}
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                      </span>
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">Online</span>
                    </div>

                    {/* Toggle Sidebar Direita */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRightSidebar(!showRightSidebar)}
                      className="hidden lg:flex"
                      title={showRightSidebar ? 'Ocultar sugestões' : 'Mostrar sugestões'}
                      aria-label={showRightSidebar ? 'Ocultar sugestões' : 'Mostrar sugestões'}
                    >
                      {showRightSidebar ? (
                        <PanelRightClose className="h-5 w-5" />
                      ) : (
                        <Lightbulb className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Mensagens */}
                <CardContent
                  id="chat-messages"
                  role="log"
                  aria-live="polite"
                  aria-relevant="additions"
                  className="flex-1 overflow-y-auto p-6 space-y-4"
                >
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className={`p-4 rounded-full mb-4 transition-all duration-300 ${
                        chatMode === 'analysis' && analysisMode === 'deep'
                          ? 'bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30'
                          : chatMode === 'analysis'
                          ? 'bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30'
                          : 'bg-virtualis-blue-100 dark:bg-virtualis-blue-900/30'
                      }`}>
                        <div className="flex justify-center">
                          <Logo variant="icon" size="lg" disableLink />
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                        {welcomeMessage.title}
                        {welcomeMessage.badgeText && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${welcomeMessage.badgeColor}`}>
                            {welcomeMessage.badgeText}
                          </span>
                        )}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                        {welcomeMessage.subtitle}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                        {suggestedQuestions.map((item, index) => {
                          const IconComponent = iconMap[item.icon] as React.ComponentType<{ className?: string }>
                          return (
                            <button
                              key={index}
                              onClick={() => setInputMessage(item.question)}
                              role="button"
                              tabIndex={0}
                              className={`group relative p-4 text-left rounded-xl border transition-all duration-300 ease-out
                                bg-gradient-to-br ${item.color} ${item.borderColor}
                                hover:scale-[1.02] hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50
                                active:scale-[0.98] backdrop-blur-sm`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg bg-white/60 dark:bg-gray-800/60 ${item.iconColor} 
                                  group-hover:scale-110 transition-transform duration-300`}>
                                  {IconComponent && <IconComponent className="h-5 w-5" />}
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                                  {item.question}
                                </p>
                              </div>
                              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/0 to-white/20 dark:from-white/0 dark:to-white/5 
                                opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          aria-label={message.role === 'user' ? 'Mensagem do usuário' : 'Resposta do assistente'}
                          className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
                        >
                          {message.role === 'assistant' && (
                            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center">
                              <Logo variant="icon" size="md" disableLink />
                            </div>
                          )}
                          <div
                            className={`max-w-2xl p-6 rounded-2xl shadow-md backdrop-blur-sm ${
                              message.role === 'user'
                                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 !text-white [&_*]:!text-white rounded-tr-none shadow-blue-500/20'
                                : 'bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 rounded-tl-none border border-white/20 dark:border-gray-700'
                            }`}
                          >
                            <div className={`prose prose-sm max-w-none ${
                              message.role === 'user' ? '' : 'dark:prose-invert'
                            }`}>
                              {/* Renderizar mensagem com link clicável para análise */}
                              {message.metadata?.analysisResult ? (
                                <>
                                  <SafeMarkdown
                                    content={message.content.replace('[Clique para ver detalhes completos]', '')}
                                    prose={false}
                                  />
                                  <button
                                    onClick={() => {
                                      if (message.metadata?.analysisResult) {
                                        setCurrentAnalysis(message.metadata.analysisResult as AnalysisResult)
                                        setShowAnalysisPanel(true)
                                      }
                                    }}
                                    className="mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium underline underline-offset-2 flex items-center gap-1"
                                  >
                                    <Eye className="h-4 w-4" />
                                    Clique para ver detalhes completos
                                  </button>
                                </>
                              ) : message.metadata?.isError ? (
                                /* Error message with ErrorFallback styling */
                                <ErrorFallback
                                  error={message.content}
                                  resetError={() => {
                                    const originalMsg = message.metadata?.originalMessage as string
                                    if (originalMsg) {
                                      setInputMessage(originalMsg)
                                      setMessages(prev => prev.filter(m => m.id !== message.id))
                                      setMessageError(null)
                                    }
                                  }}
                                  title="Erro ao processar mensagem"
                                  variant="inline"
                                  showDetails
                                />
                              ) : (
                                <SafeMarkdown content={message.content} prose={false} />
                              )}
                            </div>
                            
                            {/* Footer da mensagem com Timestamp e Ações */}
                            <div className="flex items-center justify-between mt-3">
                              <p className={`text-xs font-medium ${
                                message.role === 'user' ? 'text-blue-100/80' : 'text-gray-400'
                              }`}>
                                {message.timestamp ? (
                                  typeof message.timestamp === 'string' 
                                    ? formatDateTime(message.timestamp)
                                    : message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                ) : ''}
                              </p>
                              
                              {message.role === 'assistant' && (
                                <button
                                  onClick={() => handleSaveMessage(message)}
                                  aria-label="Salvar mensagem nos meus documentos"
                                  className="text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50"
                                  title="Salvar nos Meus Documentos"
                                >
                                  <Save className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          {message.role === 'user' && (
                            <div className="flex-shrink-0 h-10 w-10 rounded-2xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center shadow-sm">
                              <User className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                            </div>
                          )}
                        </div>
                      ))}
                      {/* Loading State with LoadingFallback */}
                      {isLoading && (
                        <div role="status" aria-live="polite" className="flex gap-3 animate-fade-in">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center">
                            <Logo variant="icon" size="md" disableLink className="animate-pulse" />
                          </div>
                          <div className={`p-4 rounded-2xl border transition-all duration-300 min-w-[320px] ${
                            chatType === 'pesquisa'
                              ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border-emerald-200/50 dark:border-emerald-700/50'
                              : 'bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 border-blue-200/50 dark:border-blue-700/50'
                          }`}>
                            {/* Header com badge do modo */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-semibold ${
                                  chatType === 'pesquisa' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
                                }`}>
                                  {chatType === 'pesquisa' ? 'Pesquisa SQL' : 'Chat'}
                                </span>
                              </div>
                              {chatType === 'pesquisa' && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-800/50 text-emerald-700 dark:text-emerald-300 animate-pulse">
                                  SQL Inteligente
                                </span>
                              )}
                            </div>

                            {/* LoadingFallback com timeout e cancel */}
                            <LoadingFallback
                              message={loadingStatus}
                              timeout={chatType === 'pesquisa' ? 120000 : 60000}
                              onTimeout={() => {
                                toast('A operacao esta demorando mais que o esperado...', { duration: 3000, icon: 'ℹ️' })
                              }}
                              onCancel={cancelCurrentRequest}
                              cancelLabel="Cancelar"
                              showProgress={loadingStep > 0}
                              estimatedDurationMs={chatType === 'pesquisa' ? 120000 : 40000}
                            />

                            {/* Steps visuais - apenas se tiver progresso */}
                            {loadingStep > 0 && (
                              <div className="mt-3">
                                <div className="flex items-center justify-between mb-2">
                                  {[1,2,3,4].map((step) => (
                                    <div key={step} className="flex flex-col items-center">
                                      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                        loadingStep >= step
                                          ? chatType === 'pesquisa'
                                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                            : 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                          : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                                      }`}>
                                        {loadingStep > step ? (
                                          <Check className="h-3 w-3" />
                                        ) : (
                                          step
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                                  {chatType === 'pesquisa' ? 'Pesquisa SQL pode levar ate 2 minutos' : 'Processando...'}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Global Error Fallback - only show if not loading and there's an error */}
                      {!isLoading && messageError && !messages.some(m => m.metadata?.isError) && (
                        <div className="flex gap-3 animate-fade-in">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center">
                            <Logo variant="icon" size="md" disableLink />
                          </div>
                          <ErrorFallback
                            error={messageError?.message || 'Erro desconhecido'}
                            resetError={retryLastMessage}
                            title="Erro ao processar mensagem"
                            description={messageError?.message || 'Ocorreu um erro ao processar sua mensagem.'}
                            variant="inline"
                            showDetails
                            className="min-w-[320px]"
                          />
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </CardContent>

                {/* Analysis Panel - Lazy loaded for code splitting */}
                {showAnalysisPanel && currentAnalysis && (
                  <AnalysisPanel
                    analysis={currentAnalysis}
                    onClose={() => setShowAnalysisPanel(false)}
                    onExport={handleExportAnalysis}
                    onSave={handleSaveDocument}
                    onViewFull={() => setShowFullAnalysisModal(true)}
                  />
                )}

                {/* Input */}
                <div
                  id="chat-input"
                  className="p-4 border-t-0 relative after:absolute after:top-0 after:left-0 after:w-full after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-virtualis-gold-500/50 after:to-transparent bg-white/5 dark:bg-gray-900/5 backdrop-blur-sm"
                >
                  <div className="relative">
                    <Input
                      value={inputMessage}
                      onChange={(e) => {
                        setInputMessage(e.target.value)
                        setInputError(null)
                      }}
                      aria-label="Digite sua mensagem"
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      placeholder={chatType === 'chat'
                        ? 'Pergunte sobre legislacao municipal...'
                        : 'Pesquise dados no banco (ex: quantas materias em 2024?)'}
                      disabled={isLoading}
                      className={`w-full pr-28 py-4 rounded-2xl shadow-sm border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 focus:ring-2 focus:ring-blue-500/50 ${inputError ? 'border-red-500 focus:ring-red-500/50' : ''}`}
                      maxLength={MAX_MESSAGE_LENGTH}
                    />
                    {/* Contador de caracteres */}
                    <div className="absolute right-16 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      {inputMessage.length > MAX_MESSAGE_LENGTH * 0.8 && (
                        <span className={inputMessage.length >= MAX_MESSAGE_LENGTH ? 'text-red-500 font-medium' : 'text-amber-500'}>
                          {inputMessage.length}/{MAX_MESSAGE_LENGTH}
                        </span>
                      )}
                    </div>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <Button
                        data-send-button
                        onClick={sendMessage}
                        disabled={!inputMessage.trim() || isLoading}
                        variant="primary"
                        size="sm"
                        aria-label="Enviar mensagem"
                        className="rounded-xl h-10 w-10 p-0 flex items-center justify-center"
                      >
                        <Send className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                  {/* Erro de validacao */}
                  {inputError && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {inputError}
                    </p>
                  )}
                  <p className="text-xs text-center text-gray-400 mt-3">
                    Pressione <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono text-[10px]">Enter</kbd> para enviar
                  </p>
                </div>
              </Card>
            </div>

            {/* Sidebar Direita - Sugestões */}
            <div
              id="chat-suggestions"
              role="complementary"
              aria-label="Sugestões de perguntas"
              className={`${showRightSidebar ? 'w-72' : 'w-0'} transition-all duration-300 overflow-hidden hidden lg:block`}
            >
              <SidebarSugestoes
                chatType={chatType}
                onSuggestionClick={(suggestion) => {
                  setInputMessage(suggestion)
                }}
                recentQueries={recentQueries}
                isCollapsed={!showRightSidebar}
                onToggleCollapse={() => setShowRightSidebar(!showRightSidebar)}
              />
            </div>
          </div>
        </div>

        {/* Modal de Análise Completa */}
        {showFullAnalysisModal && currentAnalysis && (
          <Modal
            isOpen={showFullAnalysisModal}
            onClose={() => setShowFullAnalysisModal(false)}
            className="max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl sm:rounded-2xl shadow-2xl border-0"
          >
            {/* Header do Modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                  <Brain className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <ModalTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Análise Legislativa Completa
                  </ModalTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {currentAnalysis.mode.name} • {currentAnalysis.processingTime}s • {currentAnalysis.confidence}% confiança
                  </p>
                </div>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Métricas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">{currentAnalysis.confidence}%</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Confiança</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{currentAnalysis.processingTime}s</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Tempo</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{currentAnalysis.result.compliance?.score || 0}%</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Conformidade</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">{currentAnalysis.result.recommendations?.length || 0}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Recomendações</p>
                  </div>
                </div>

                {/* Consulta */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                    Consulta
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">{currentAnalysis.query}</p>
                </div>

                {/* Resumo */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    Resumo
                  </h3>
                  <ModalDescription className="text-base text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {currentAnalysis.result.summary}
                  </ModalDescription>
                </div>

                {/* Análise Detalhada */}
                {currentAnalysis.result.detailedAnalysis && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                      <Search className="h-4 w-4 text-purple-500" />
                      Análise Detalhada
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{currentAnalysis.result.detailedAnalysis}</p>
                  </div>
                )}

                {/* Base Legal */}
                {currentAnalysis.result.legalBasis && currentAnalysis.result.legalBasis.length > 0 && (
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                      <Scale className="h-4 w-4 text-indigo-500" />
                      Base Legal
                    </h3>
                    <ul className="space-y-2">
                      {currentAnalysis.result.legalBasis.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                          <span className="bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                            {index + 1}
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recomendações */}
                {currentAnalysis.result.recommendations && currentAnalysis.result.recommendations.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      Recomendações
                    </h3>
                    <ul className="space-y-2">
                      {currentAnalysis.result.recommendations.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                          <span className="bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-200 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                            {index + 1}
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Conformidade */}
                {currentAnalysis.result.compliance && (
                  <div className={`rounded-xl p-4 ${
                    currentAnalysis.result.compliance.score >= 80 
                      ? 'bg-green-50 dark:bg-green-900/20' 
                      : currentAnalysis.result.compliance.score >= 60 
                        ? 'bg-amber-50 dark:bg-amber-900/20' 
                        : 'bg-red-50 dark:bg-red-900/20'
                  }`}>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Conformidade ({currentAnalysis.result.compliance.score}%)
                    </h3>
                    
                    {currentAnalysis.result.compliance.issues && currentAnalysis.result.compliance.issues.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">⚠️ Pontos de Atenção:</p>
                        <ul className="space-y-1">
                          {currentAnalysis.result.compliance.issues.map((issue, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                              <span>{issue}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {currentAnalysis.result.compliance.suggestions && currentAnalysis.result.compliance.suggestions.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">💡 Sugestões:</p>
                        <ul className="space-y-1">
                          {currentAnalysis.result.compliance.suggestions.map((suggestion, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                              <span>{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Metadados */}
                <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 text-sm">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4 text-gray-500" />
                    Metadados
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-gray-600 dark:text-gray-400">
                    <div>
                      <span className="font-medium">Modelo:</span> {currentAnalysis.metadata.model}
                    </div>
                    <div>
                      <span className="font-medium">Tokens:</span> {currentAnalysis.metadata.tokens}
                    </div>
                    <div>
                      <span className="font-medium">Data:</span> {new Date(currentAnalysis.metadata.timestamp).toLocaleString('pt-BR')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer do Modal */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => handleExportAnalysis(currentAnalysis)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setShowFullAnalysisModal(false)}
                >
                  Fechar
                </Button>
              </div>
          </Modal>
        )}
      </MainLayout>
    </>
  )
}
