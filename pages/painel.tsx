import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { SEOHead } from '@/components/common/SEOHead'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  MapPin, Clock, FilePlus, Mic, MessageSquare, CalendarDays, Loader2,
  History, ChevronLeft, ChevronRight, Sparkles, Bot, BellOff
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getSecureItem } from '@/lib/secure-storage'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function PainelLegislativo() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'propositions' | 'agenda'>('propositions')

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])



  // --- REAL DATA ---
  const [propositions, setPropositions] = useState<any[]>([])
  const [loadingProps, setLoadingProps] = useState(true)
  const [page, setPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const ITEMS_PER_PAGE = 5

  // Estado para estatisticas legislativas reais
  const [legislativoStats, setLegislativoStats] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  // Fetch real propositions
  useEffect(() => {
    const fetchPropositions = async () => {
      if (!user) return
      
      try {
        setLoadingProps(true)
        // Usa o serviço existente para buscar matérias com paginação
        const response = await import('@/lib/api').then(m => m.materiasService.getAll({
          limit: ITEMS_PER_PAGE,
          offset: (page - 1) * ITEMS_PER_PAGE
        }))
        
        if (response.success && Array.isArray(response.data)) {
          // Mapeia os dados do backend para o formato visual do card
          const mappedProps = response.data.map((item: any) => ({
            id: item.id.toString(), // ID visual
            title: item.titulo || 'Sem título',
            summary: item.ementa || 'Sem descrição definida',
            status: item.status || 'draft',
            statusLabel: mapStatusLabel(item.status),
            progress: mapStatusProgress(item.status),
            lastUpdate: 'Aguardando ação', // Placeholder por enquanto
            updatedAt: new Date(item.updated_at || new Date()),
            type: item.tipo || 'DOC'
          }))
          setPropositions(mappedProps)
          setTotalItems(response.count || response.data.length)
        }
      } catch (error) {
        console.error('Erro ao buscar proposições:', error)
        toast.error('Não foi possível carregar suas proposições')
      } finally {
        setLoadingProps(false)
      }
    }

    fetchPropositions()
  }, [user, page])

  // Fetch legislative statistics (real data)
  useEffect(() => {
    const fetchLegislativoStats = async () => {
      if (!user) return
      try {
        setLoadingStats(true)
        const token = await getSecureItem<string>('authToken')
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/dashboard/legislativo-stats`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const data = await response.json()
        if (data.success) {
          setLegislativoStats(data.data)
        }
      } catch (error) {
        console.error('Erro ao buscar estatisticas legislativas:', error)
      } finally {
        setLoadingStats(false)
      }
    }
    fetchLegislativoStats()
  }, [user])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // Helpers para visualização
  const mapStatusLabel = (status: string) => {
    // Normaliza para uppercase para garantir match
    const s = status ? status.toUpperCase() : ''
    
    switch (s) {
      // Status do Kanban
      case 'DRAFT': return 'Rascunho'
      case 'PROTOCOL': return 'Protocolado'
      case 'READING': return 'Leitura'
      case 'COMMISSION': return 'Em Comissões'
      case 'VOTING': return 'Em Votação'
      case 'SANCTION': return 'Sanção'
      
      // Status Legados / Oficiais
      case 'PROT': return 'Rascunho' // Alinhado com a lógica do Kanban (PROT inicial = Rascunho)
      case 'LEIT': return 'Leitura'
      case 'COM': return 'Em Comissões'
      case 'APR': return 'Aprovado'
      case 'APRU': return 'Aprovado (Unanimidade)'
      case 'ARQ': return 'Arquivado'
      
      default: return 'Rascunho'
    }
  }

  const mapStatusProgress = (status: string) => {
    const s = status ? status.toUpperCase() : ''
    
    switch (s) {
      case 'DRAFT': 
      case 'PROT': return 10 // PROT inicial = 10%
      case 'PROTOCOL': return 25
      case 'READING':
      case 'LEIT': return 40
      case 'COMMISSION':
      case 'COM': return 60
      case 'VOTING': return 80
      case 'SANCTION':
      case 'APR':
      case 'APRU': return 100
      default: return 10
    }
  }

  const nextSession = {
    type: 'Sessão Ordinária',
    date: new Date(new Date().setDate(new Date().getDate() + 1)), // Amanhã
    time: '14:00',
    status: 'scheduled',
    location: 'Plenário Principal'
  }

  // --- MANTENDO PAUTA MOCKADA POR ENQUANTO (Será o próximo passo) ---
  const sessionAgenda = [
    {
      id: 1,
      code: 'PL 10/2023',
      content: 'Dispõe sobre a Lei de Diretrizes Orçamentárias (LDO) para 2024.',
      author: 'Poder Executivo',
      stage: '2ª Votação',
      aiSummary: 'Define as metas fiscais e prioridades de gastos para o próximo ano. Atenção para emendas impositivas.',
      priority: 'high'
    },
    {
      id: 2,
      code: 'VETO 02/2024',
      content: 'Veto Total ao Autógrafo de Lei nº 15/2024 (Auxílio Transporte).',
      author: 'Poder Executivo',
      stage: 'Discussão Única',
      aiSummary: 'O Executivo argumenta inconstitucionalidade por vício de iniciativa (criação de despesa).',
      priority: 'medium'
    },
    {
      id: 3,
      code: 'PLC 03/2024',
      content: 'Altera o Código Tributário Municipal.',
      author: 'Mesa Diretora',
      stage: '1ª Votação',
      aiSummary: 'Modernização das taxas de alvará. Impacto positivo na arrecadação previsto.',
      priority: 'medium'
    }
  ]
  // ------------------------------------

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'new-proposition':
        router.push('/materias/criar')
        break
      case 'speech':
      router.push('/discursos')
      break
      case 'calendar':
        router.push('/agenda')
        break
      default:
        break
    }
  }

  return (
    <>
      <SEOHead
        title="Painel Legislativo"
        description="Visualize estatísticas e análises do processo legislativo"
      />

      <MainLayout>
        <div className="max-w-7xl mx-auto space-y-6 pb-8">
          
          {/* 1. HERO SECTION: O Dia de Hoje */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Próxima Sessão (Card de Destaque) */}
            <Card className="lg:col-span-2 bg-gradient-to-br from-virtualis-blue-900 via-virtualis-blue-800 to-virtualis-blue-600 border-0 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
              
              <CardContent className="p-6 sm:p-8 relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 rounded bg-white/20 text-xs font-semibold backdrop-blur-sm border border-white/10">
                      PRÓXIMA ATIVIDADE
                    </span>
                    <span className="flex items-center text-blue-200 text-xs">
                      <MapPin className="h-3 w-3 mr-1" />
                      {nextSession.location}
                    </span>
                  </div>
                  
                  <h1 className="text-3xl font-bold mb-1">{nextSession.type}</h1>
                  <p className="text-blue-100 text-lg mb-4">
                    {formatDate(nextSession.date)} às {nextSession.time}
                  </p>
                  
                  <div className="flex gap-3">
                    <Button variant="secondary" size="sm" className="bg-white text-blue-900 hover:bg-blue-50">
                      Ver Pauta Completa
                    </Button>
                    <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10">
                      Registrar Presença
                    </Button>
                  </div>
                </div>

                {/* Countdown / Clock Visual Mock */}
                <div className="hidden sm:flex flex-col items-center justify-center p-4 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10 min-w-[120px]">
                  <Clock className="h-8 w-8 mb-2 text-virtualis-gold-400" />
                  <span className="text-2xl font-mono font-bold">18:42:00</span>
                  <span className="text-xs text-blue-200 uppercase tracking-wider">Restante</span>
                </div>
              </CardContent>
            </Card>

            {/* Ações Rápidas (Quick Actions) */}
            <div className="grid grid-cols-2 gap-3 lg:gap-4 h-full">
              <button 
                onClick={() => handleQuickAction('new-proposition')}
                className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-virtualis-blue-500 hover:shadow-md transition-all group"
              >
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <FilePlus className="h-6 w-6" />
                </div>
                <span className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">Nova Proposição</span>
              </button>
              
              <button 
                onClick={() => handleQuickAction('speech')}
                className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-500 hover:shadow-md transition-all group"
              >
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                  <Mic className="h-6 w-6" />
                </div>
                <span className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">Modo Discurso</span>
              </button>

              <button 
                onClick={() => router.push('/chatbot')}
                className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-cyan-500 hover:shadow-md transition-all group"
              >
                <div className="p-3 rounded-full bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <span className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">Consultar IA</span>
              </button>

              <button 
                onClick={() => handleQuickAction('calendar')}
                className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-500 hover:shadow-md transition-all group"
              >
                <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
                  <CalendarDays className="h-6 w-6" />
                </div>
                <span className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">Prazos</span>
              </button>
            </div>
          </div>

          {/* 2. MAIN CONTENT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Coluna Principal: Fluxo Legislativo (3/4) */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Abas e Filtros */}
              <div className="flex items-center gap-4 pb-1 border-b-0 relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-virtualis-gold-500/50 after:to-transparent">
                <button
                  onClick={() => setActiveTab('propositions')}
                  className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                    activeTab === 'propositions'
                      ? 'text-virtualis-gold-600 dark:text-virtualis-gold-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  Minhas Proposições
                  {activeTab === 'propositions' && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-virtualis-gold-500 rounded-t-full"></span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('agenda')}
                  className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                    activeTab === 'agenda'
                      ? 'text-virtualis-gold-600 dark:text-virtualis-gold-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  Pauta da Sessão
                  {activeTab === 'agenda' && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-virtualis-gold-500 rounded-t-full"></span>
                  )}
                </button>
              </div>

              {/* Conteúdo da Aba */}
              <div className="min-h-[400px]">
                {activeTab === 'propositions' ? (
                  <div className="space-y-4">
                    {/* Lista de Proposições REAIS */}
                    {loadingProps ? (
                       <div className="flex justify-center p-8">
                         <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                       </div>
                    ) : propositions.length === 0 ? (
                       <div className="text-center p-8 text-gray-500">
                         <p>Nenhuma proposição encontrada.</p>
                         <Button variant="ghost" onClick={() => router.push('/materias/criar')}>
                           Criar minha primeira proposição
                         </Button>
                       </div>
                    ) : (
                      propositions.map((prop) => (
                      <Card key={prop.id} hover className="border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
                        <CardContent className="p-5">
                          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={
                                  prop.status === 'aprovado' ? 'success' : 
                                  prop.status === 'comissao' ? 'warning' : 'default'
                                }>
                                  {prop.statusLabel}
                                </Badge>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs font-semibold text-gray-500">{prop.id}</span>
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                {prop.title}
                              </h3>
                              <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                                {prop.summary}
                              </p>
                              <div className="flex items-center text-xs text-gray-500">
                                <History className="h-3 w-3 mr-1" />
                                Última atualização: {prop.lastUpdate} ({formatDate(prop.updatedAt)})
                              </div>
                            </div>
                            
                            {/* Barra de Progresso Visual */}
                            <div className="w-full sm:w-32 flex flex-col gap-1 items-end">
                              <div className="text-xs font-medium text-gray-500 mb-1">Tramitação</div>
                              <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    prop.progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                                  }`} 
                                  style={{ width: `${prop.progress}%` }}
                                ></div>
                              </div>
                              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                {prop.progress}% Completo
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      ))
                    )}
                    <div className="flex justify-between items-center pt-2">
                      <Button 
                        variant="ghost" 
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        size="sm"
                      >
                         <ChevronLeft className="h-4 w-4 mr-1" />
                         Anterior
                      </Button>
                      
                      <span className="text-xs text-gray-500">
                        Página {page} de {Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))}
                      </span>
                      
                      <Button 
                        variant="ghost"
                        disabled={page >= Math.ceil(totalItems / ITEMS_PER_PAGE)}
                        onClick={() => setPage(p => p + 1)}
                        size="sm"
                      >
                         Próxima
                         <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Lista da Pauta (Agenda) */}
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
                      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                        <Sparkles className="h-4 w-4" />
                        <span className="text-sm font-medium">Resumos gerados por IA para a Ordem do Dia</span>
                      </div>
                    </div>

                    {sessionAgenda.map((item) => (
                      <Card key={item.id} className="border border-gray-100 dark:border-gray-800">
                        <CardContent className="p-5">
                          <div className="flex gap-4">
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex gap-2 items-center">
                                  <span className="font-bold text-gray-900 dark:text-gray-100">{item.code}</span>
                                  <Badge variant="info">{item.stage}</Badge>
                                </div>
                                {item.priority === 'high' && (
                                  <Badge variant="error" className=" animate-pulse">Alta Prioridade</Badge>
                                )}
                              </div>
                              
                              <p className="text-sm text-gray-800 dark:text-gray-200 font-medium mb-1">
                                {item.content}
                              </p>
                              <p className="text-xs text-gray-500 mb-3">
                                Autor: {item.author}
                              </p>

                              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
                                <div className="flex gap-2 items-start">
                                  <Bot className="h-4 w-4 text-purple-500 mt-0.5" />
                                  <p className="text-sm text-gray-600 dark:text-gray-300 italic">
                                    "{item.aiSummary}"
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Coluna Lateral: Inteligência e Dados (1/4) */}
            <div className="space-y-6">
              
              {/* Card Chat Rápido */}


              {/* Card Metricas - Dados Reais */}
              <Card className="glass glass-dark border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-gray-700 dark:text-gray-300">
                    Sua Atuacao (Ano)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingStats ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Presenca em Sessoes</span>
                        <span className={`text-sm font-bold ${
                          (legislativoStats?.presenca?.percentual || 0) >= 75 ? 'text-green-600' :
                          (legislativoStats?.presenca?.percentual || 0) >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {legislativoStats?.presenca?.percentual || 0}% ({legislativoStats?.presenca?.sessoes_presente || 0}/{legislativoStats?.presenca?.total_sessoes || 0})
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            (legislativoStats?.presenca?.percentual || 0) >= 75 ? 'bg-green-500' :
                            (legislativoStats?.presenca?.percentual || 0) >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${legislativoStats?.presenca?.percentual || 0}%` }}
                        ></div>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Proposicoes</span>
                        <span className="text-sm font-bold text-blue-600">
                          {legislativoStats?.proposicoes?.total || 0} apresentadas
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Uso da Tribuna</span>
                        <span className="text-sm font-bold text-purple-600">
                          {legislativoStats?.discursos?.total || 0} discursos
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notificacoes */}
              <Card className="glass glass-dark border-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-gray-700 dark:text-gray-300">
                    Notificações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    <BellOff className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Nenhuma notificação
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Você será notificado sobre pareceres e eventos
                    </p>
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
