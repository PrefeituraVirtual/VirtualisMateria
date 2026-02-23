import React, { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Search,
  History,
  FileEdit,
  HelpCircle,
  Users,
  GitBranch,
  BookOpen,
  Scale,
  FileCheck,
  Award,
  Calendar,
  MessageCircle,
  Database
} from 'lucide-react'

/**
 * Interface for suggestion items displayed in the sidebar
 */
interface SuggestionItem {
  /** The suggestion text to be sent when clicked */
  text: string
  /** Lucide icon component to display */
  icon: React.ReactNode
  /** Background gradient classes for the suggestion card */
  bgColor: string
  /** Border color classes */
  borderColor: string
  /** Icon color classes */
  iconColor: string
  /** Category for grouping */
  category: 'legislativo' | 'dados'
}

/**
 * Props interface for SidebarSugestoes component
 */
export interface SidebarSugestoesProps {
  /** Current chat mode: 'chat' for legislative help, 'pesquisa' for SQL queries */
  chatType: 'chat' | 'pesquisa'
  /** Callback function when a suggestion is clicked */
  onSuggestionClick: (suggestion: string) => void
  /** Array of recent queries to display in history section */
  recentQueries?: string[]
  /** Whether the sidebar is collapsed */
  isCollapsed: boolean
  /** Callback function to toggle collapse state */
  onToggleCollapse: () => void
}

/**
 * SidebarSugestoes Component
 *
 * A collapsible sidebar component that displays contextual suggestions
 * based on the current chat mode (chat or pesquisa/search).
 *
 * Features:
 * - Dynamic suggestions based on chat type
 * - Quick search field to filter suggestions
 * - Recent queries history section
 * - Smooth collapse/expand animations
 * - Full dark mode support
 *
 * @example
 * ```tsx
 * <SidebarSugestoes
 *   chatType="chat"
 *   onSuggestionClick={(text) => setInputMessage(text)}
 *   recentQueries={['query1', 'query2']}
 *   isCollapsed={false}
 *   onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
 * />
 * ```
 */
export const SidebarSugestoes: React.FC<SidebarSugestoesProps> = ({
  chatType,
  onSuggestionClick,
  recentQueries = [],
  isCollapsed,
  onToggleCollapse
}) => {
  const [searchTerm, setSearchTerm] = useState('')

  /**
   * Fixed suggestions for Chat mode (legislative help)
   * NOTE: These are DIFFERENT from welcome screen suggestions to avoid redundancy
   * Welcome screen has: projeto de lei, indicação/requerimento, quórum, tramitação
   * Sidebar has: advanced/specific topics like emendas, destituição, urgência, recursos
   */
  const chatSuggestions: SuggestionItem[] = useMemo(() => [
    {
      text: 'O que e um Projeto de Lei?',
      icon: <FileEdit className="h-4 w-4" />,
      bgColor: 'from-blue-500/10 to-indigo-500/10',
      borderColor: 'border-blue-200/60 dark:border-blue-800/60',
      iconColor: 'text-blue-500 dark:text-blue-400',
      category: 'legislativo'
    },
    {
      text: 'Diferenca entre indicacao e requerimento',
      icon: <HelpCircle className="h-4 w-4" />,
      bgColor: 'from-emerald-500/10 to-teal-500/10',
      borderColor: 'border-emerald-200/60 dark:border-emerald-800/60',
      iconColor: 'text-emerald-500 dark:text-emerald-400',
      category: 'legislativo'
    },
    {
      text: 'Diferenca urgencia e urgentissima',
      icon: <GitBranch className="h-4 w-4" />,
      bgColor: 'from-violet-500/10 to-purple-500/10',
      borderColor: 'border-violet-200/60 dark:border-violet-800/60',
      iconColor: 'text-violet-500 dark:text-violet-400',
      category: 'legislativo'
    },
    {
      text: 'Como funciona o processo legislativo',
      icon: <BookOpen className="h-4 w-4" />,
      bgColor: 'from-amber-500/10 to-orange-500/10',
      borderColor: 'border-amber-200/60 dark:border-amber-800/60',
      iconColor: 'text-amber-500 dark:text-amber-400',
      category: 'legislativo'
    },
    {
      text: 'Tipos de quorum em votacoes',
      icon: <Users className="h-4 w-4" />,
      bgColor: 'from-rose-500/10 to-pink-500/10',
      borderColor: 'border-rose-200/60 dark:border-rose-800/60',
      iconColor: 'text-rose-500 dark:text-rose-400',
      category: 'legislativo'
    },
    {
      text: 'O que sao comissoes permanentes',
      icon: <Scale className="h-4 w-4" />,
      bgColor: 'from-cyan-500/10 to-sky-500/10',
      borderColor: 'border-cyan-200/60 dark:border-cyan-800/60',
      iconColor: 'text-cyan-500 dark:text-cyan-400',
      category: 'legislativo'
    }
  ], [])

  /**
   * Fixed suggestions for Pesquisa (Search/SQL) mode
   * NOTE: These are DIFFERENT from welcome screen suggestions to avoid redundancy
   * Welcome screen has: vereadores legislatura, projetos aprovados, matérias tramitação, mais indicações
   * Sidebar has: specific queries like por comissão, votações, requerimentos, sessões
   */
  const pesquisaSuggestions: SuggestionItem[] = useMemo(() => [
    {
      text: 'Como funciona a votacao segundo o Regimento?',
      icon: <Scale className="h-4 w-4" />,
      bgColor: 'from-blue-500/10 to-indigo-500/10',
      borderColor: 'border-blue-200/60 dark:border-blue-800/60',
      iconColor: 'text-blue-500 dark:text-blue-400',
      category: 'dados'
    },
    {
      text: 'Qual o quorum para aprovar projeto de lei?',
      icon: <Users className="h-4 w-4" />,
      bgColor: 'from-emerald-500/10 to-teal-500/10',
      borderColor: 'border-emerald-200/60 dark:border-emerald-800/60',
      iconColor: 'text-emerald-500 dark:text-emerald-400',
      category: 'dados'
    },
    {
      text: 'Leis municipais sobre educacao',
      icon: <BookOpen className="h-4 w-4" />,
      bgColor: 'from-violet-500/10 to-purple-500/10',
      borderColor: 'border-violet-200/60 dark:border-violet-800/60',
      iconColor: 'text-violet-500 dark:text-violet-400',
      category: 'dados'
    },
    {
      text: 'Projetos de lei aprovados',
      icon: <FileCheck className="h-4 w-4" />,
      bgColor: 'from-amber-500/10 to-orange-500/10',
      borderColor: 'border-amber-200/60 dark:border-amber-800/60',
      iconColor: 'text-amber-500 dark:text-amber-400',
      category: 'dados'
    },
    {
      text: 'Sessoes plenarias recentes',
      icon: <Calendar className="h-4 w-4" />,
      bgColor: 'from-rose-500/10 to-pink-500/10',
      borderColor: 'border-rose-200/60 dark:border-rose-800/60',
      iconColor: 'text-rose-500 dark:text-rose-400',
      category: 'dados'
    },
    {
      text: 'Total de indicacoes apresentadas',
      icon: <Award className="h-4 w-4" />,
      bgColor: 'from-cyan-500/10 to-sky-500/10',
      borderColor: 'border-cyan-200/60 dark:border-cyan-800/60',
      iconColor: 'text-cyan-500 dark:text-cyan-400',
      category: 'dados'
    }
  ], [])

  /**
   * Get current suggestions based on chat type
   */
  const currentSuggestions = useMemo(() => {
    return chatType === 'chat' ? chatSuggestions : pesquisaSuggestions
  }, [chatType, chatSuggestions, pesquisaSuggestions])

  /**
   * Filter suggestions based on search term
   */
  const filteredSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return currentSuggestions
    const search = searchTerm.toLowerCase()
    return currentSuggestions.filter(s =>
      s.text.toLowerCase().includes(search)
    )
  }, [currentSuggestions, searchTerm])

  /**
   * Get recent queries limited to 3 items
   */
  const displayedRecentQueries = useMemo(() => {
    return recentQueries.slice(0, 3)
  }, [recentQueries])

  /**
   * Handle suggestion click
   */
  const handleSuggestionClick = (text: string) => {
    onSuggestionClick(text)
  }

  /**
   * Handle keyboard navigation for accessibility
   */
  const handleKeyDown = (e: React.KeyboardEvent, text: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleSuggestionClick(text)
    }
  }

  return (
    <div
      className={cn(
        'transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0',
        isCollapsed ? 'w-12' : 'w-72'
      )}
    >
      <Card className="h-full flex flex-col glass glass-dark border-0 relative">
        {/* Collapse Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className={cn(
            'absolute top-3 z-10 p-1.5 h-8 w-8 rounded-full',
            'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm',
            'border border-gray-200/50 dark:border-gray-700/50',
            'shadow-sm hover:shadow-md',
            isCollapsed ? 'right-2' : 'right-3'
          )}
          aria-label={isCollapsed ? 'Expandir sugestoes' : 'Recolher sugestoes'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          )}
        </Button>

        {/* Collapsed State - Only Icon */}
        {isCollapsed ? (
          <div className="flex flex-col items-center pt-14 pb-4 space-y-4">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10">
              <Lightbulb className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            </div>
            <div className="p-2 rounded-lg bg-gradient-to-br from-gray-500/10 to-slate-500/10">
              <History className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <CardHeader className="border-b border-white/10 pb-3 pt-3 pr-12">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className={cn(
                  'p-1.5 rounded-lg',
                  chatType === 'chat'
                    ? 'bg-gradient-to-br from-blue-500/20 to-indigo-500/20'
                    : 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20'
                )}>
                  {chatType === 'chat' ? (
                    <MessageCircle className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                  ) : (
                    <Database className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                  )}
                </div>
                <span className="text-gray-900 dark:text-gray-100">
                  Sugestoes
                </span>
                <span className={cn(
                  'text-xs font-medium px-2 py-0.5 rounded-full ml-auto',
                  chatType === 'chat'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                )}>
                  {chatType === 'chat' ? 'Chat' : 'SQL'}
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* Quick Search Field */}
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Buscar sugestao..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<Search className="h-4 w-4 text-gray-400" />}
                  className="text-sm py-2 bg-white/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50"
                  aria-label="Buscar sugestoes"
                />
              </div>

              {/* Fixed Suggestions Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="h-3 w-3" />
                  {chatType === 'chat' ? 'Duvidas Comuns' : 'Pesquisas Comuns'}
                </h4>
                <div className="space-y-2">
                  {filteredSuggestions.length > 0 ? (
                    filteredSuggestions.map((suggestion, index) => (
                      <button
                        key={`${suggestion.text}-${index}`}
                        onClick={() => handleSuggestionClick(suggestion.text)}
                        onKeyDown={(e) => handleKeyDown(e, suggestion.text)}
                        className={cn(
                          'w-full text-left p-3 rounded-xl border transition-all duration-300 ease-out',
                          'bg-gradient-to-br backdrop-blur-sm',
                          suggestion.bgColor,
                          suggestion.borderColor,
                          'hover:scale-[1.02] hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50',
                          'active:scale-[0.98]',
                          'focus:outline-none focus:ring-2 focus:ring-blue-500/50'
                        )}
                        role="button"
                        tabIndex={0}
                        aria-label={`Usar sugestao: ${suggestion.text}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            'p-1.5 rounded-lg bg-white/60 dark:bg-gray-800/60',
                            suggestion.iconColor,
                            'transition-transform duration-300 group-hover:scale-110'
                          )}>
                            {suggestion.icon}
                          </div>
                          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-tight">
                            {suggestion.text}
                          </span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      Nenhuma sugestao encontrada
                    </p>
                  )}
                </div>
              </div>

              {/* Recent Queries Section */}
              {displayedRecentQueries.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="h-3 w-3" />
                    Historico Recente
                  </h4>
                  <div className="space-y-1.5">
                    {displayedRecentQueries.map((query, index) => (
                      <button
                        key={`recent-${index}`}
                        onClick={() => handleSuggestionClick(query)}
                        onKeyDown={(e) => handleKeyDown(e, query)}
                        className={cn(
                          'w-full text-left p-2.5 rounded-lg transition-all duration-200',
                          'bg-gray-100/50 dark:bg-gray-800/50',
                          'border border-gray-200/30 dark:border-gray-700/30',
                          'hover:bg-gray-200/50 dark:hover:bg-gray-700/50',
                          'hover:border-gray-300/50 dark:hover:border-gray-600/50',
                          'focus:outline-none focus:ring-2 focus:ring-blue-500/50'
                        )}
                        role="button"
                        tabIndex={0}
                        aria-label={`Usar consulta recente: ${query}`}
                      >
                        <div className="flex items-center gap-2">
                          <History className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                          <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {query}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}

SidebarSugestoes.displayName = 'SidebarSugestoes'

export default SidebarSugestoes
