import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { SEOHead } from '@/components/common/SEOHead'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Textarea } from '@/components/ui/Input'
import { CharacterCounter } from '@/components/ui/CharacterCounter'
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/Modal'
import {
  ChevronLeft, ChevronRight, Sparkles, AlertTriangle, Gavel, Briefcase, Users,
  Edit2, Trash2, Clock, MapPin, CalendarX, AlertCircle
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { agendaService } from '@/lib/api'
import { agendaEventSchema, getZodErrors, sanitizeFormData, MAX_AGENDA_TITLE_LENGTH, MAX_AGENDA_LOCATION_LENGTH, MAX_AGENDA_DESCRIPTION_LENGTH } from '@/lib/validation'
import { z } from 'zod'
import AgendaAssistant from '@/components/agenda/AgendaAssistant'
import type { AgendaCreateData, AgendaItem } from '@/types/api'
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  eachDayOfInterval,
  isToday,
  parseISO
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

// --- TYPES ---
type EventType = 'SESSAO' | 'COMISSAO' | 'AUDIENCIA' | 'PRAZO' | 'GABINETE' | 'EXTERNO'

interface CalendarEvent {
  id: number
  title: string
  date: Date
  type: EventType
  time: string
  location?: string
  description?: string
}

// --- INITIAL MOCK DATA ---
export default function AgendaPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  
  // State
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [activeFilter, setActiveFilter] = useState<'all' | 'sessions' | 'deadlines'>('all')
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isAssistantOpen, setIsAssistantOpen] = useState(false)
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEventId, setEditingEventId] = useState<number | null>(null)
  const [newEvent, setNewEvent] = useState<{
    title: string;
    type: EventType;
    date: string; // YYYY-MM-DD for input
    time: string;
    location: string;
    description: string;
  }>({
    title: '',
    type: 'GABINETE',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:00',
    location: '',
    description: ''
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Auth Protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  // Fetch Events from API
  const fetchEvents = async () => {
    try {
      const response = await agendaService.getAll()
      if (response.success) {
        const parsedEvents = response.data
          .filter((event: AgendaItem) => event.date || event.data)  // Filter out events without a date
          .map((event: AgendaItem) => {
            const dateStr = event.date || event.data || ''
            const dateObj = parseISO(dateStr)

            return {
              id: event.id || Date.now(),
              title: event.title || event.titulo || 'Evento sem titulo',
              date: dateObj,
              type: (event.type as EventType) || 'GABINETE',
              time: event.time || '',
              location: event.location || '',
              description: event.description || event.descricao || '',
            }
          })
        setEvents(parsedEvents)
      }
    } catch (error) {
      console.error('Failed to fetch agenda:', error)
      toast.error('Erro ao carregar agenda')
    }
  }

  useEffect(() => {
    if (user) {
        fetchEvents()
    }
  }, [user])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // --- HELPERS ---
  const getEventStyles = (type: EventType) => {
    switch (type) {
      case 'SESSAO':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      case 'PRAZO':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800'
      case 'COMISSAO':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
      case 'AUDIENCIA':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800'
      case 'GABINETE':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'
    }
  }

  const getEventLabel = (type: EventType) => {
    const labels: Record<EventType, string> = {
      SESSAO: 'Sessão',
      PRAZO: 'Prazo',
      COMISSAO: 'Comissão',
      AUDIENCIA: 'Audiência Pública',
      GABINETE: 'Gabinete',
      EXTERNO: 'Externo'
    }
    return labels[type]
  }



  const resetForm = () => {
    setNewEvent({
      title: '',
      type: 'GABINETE',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '09:00',
      location: '',
      description: ''
    })
    setFieldErrors({})
    setEditingEventId(null)
  }

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) {
        return prev
      }
      const { [field]: _removed, ...rest } = prev
      return rest
    })
  }

  const renderFieldError = (message?: string) => {
    if (!message) return undefined
    return (
      <span className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3" aria-hidden="true" />
        {message}
      </span>
    )
  }

  // --- HANDLERS ---
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationPayload = {
      title: newEvent.title,
      type: newEvent.type,
      date: newEvent.date,
      time: newEvent.time,
      location: newEvent.location,
      description: newEvent.description,
    }

    try {
      agendaEventSchema.parse(validationPayload)
      setFieldErrors({})
    } catch (error) {
      if (error instanceof z.ZodError) {
        setFieldErrors(getZodErrors(error))
        toast.error('Corrija os campos destacados para continuar')
      } else {
        toast.error('Erro ao validar o evento')
      }
      return
    }

    const sanitizedTextFields = sanitizeFormData({
      title: newEvent.title,
      location: newEvent.location,
      description: newEvent.description
    })

    const sanitizedEvent = {
      ...newEvent,
      ...sanitizedTextFields
    }

    const agendaPayload: AgendaCreateData = {
      title: sanitizedEvent.title,
      date: sanitizedEvent.date,
      time: sanitizedEvent.time,
      type: sanitizedEvent.type,
      location: sanitizedEvent.location,
      description: sanitizedEvent.description,
    }

    try {
        if (editingEventId) {
            // UPDATE
            await agendaService.update(editingEventId, agendaPayload)
            
            setEvents(prev => prev.map(e => {
                if (e.id === editingEventId) {
                    return {
                        ...e,
                        title: sanitizedEvent.title,
                        date: parseISO(sanitizedEvent.date),
                        type: sanitizedEvent.type,
                        time: sanitizedEvent.time,
                        location: sanitizedEvent.location,
                        description: sanitizedEvent.description
                    }
                }
                return e
            }))
            toast.success('Evento atualizado com sucesso!')
        } else {
            // CREATE
            const createdEvent = await agendaService.create(agendaPayload)
            
            // Optimistically update or re-fetch. Here we just add to state manually for speed.
            const eventConfig: CalendarEvent = {
                id: createdEvent.data?.id || Date.now(),
                title: sanitizedEvent.title,
                date: parseISO(sanitizedEvent.date),
                type: sanitizedEvent.type,
                time: sanitizedEvent.time,
                location: sanitizedEvent.location,
                description: sanitizedEvent.description
            }
            setEvents(prev => [...prev, eventConfig])
            toast.success('Evento salvo na nuvem!')
        }

        setIsModalOpen(false)
        resetForm()

    } catch (error) {
        console.error('Error saving event:', error)
        toast.error('Erro ao salvar evento')
    }
  }

  const handleDeleteEvent = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return;

    try {
        await agendaService.delete(id)
        setEvents(prev => prev.filter(e => e.id !== id))
        toast.success('Evento excluído')
    } catch (error) {
        console.error('Error deleting event:', error)
        toast.error('Erro ao excluir evento')
    }
  }



  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEventId(event.id)
    setNewEvent({
        title: event.title,
        type: event.type,
        date: format(event.date, 'yyyy-MM-dd'),
        time: event.time,
        location: event.location || '',
        description: event.description || ''
    })
    setIsModalOpen(true)
  }

  const openAddModal = () => {
    resetForm()
    // Se hoje estiver selecionado, usa hoje. Se outro dia, usa o dia selecionado.
    setNewEvent(prev => ({
        ...prev,
        date: format(selectedDate, 'yyyy-MM-dd')
    }))
    setIsModalOpen(true)
  }

  // --- RENDERERS ---
  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
            Hoje
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
      </div>
    )
  }

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const dateRange = eachDayOfInterval({
      start: startDate,
      end: endDate
    })

    const getDayEvents = (day: Date) => {
      return events.filter(event => 
        isSameDay(event.date, day) && 
        (activeFilter === 'all' || 
         (activeFilter === 'sessions' && event.type === 'SESSAO') || 
         (activeFilter === 'deadlines' && event.type === 'PRAZO'))
      )
    }

    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

    return (
      <>
        <div className="grid grid-cols-7 mb-2">
            {days.map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                {day}
            </div>
            ))}
        </div>
        <div className="grid grid-cols-7 gap-1 lg:gap-2">
            {dateRange.map((day) => {
            const isSelected = isSameDay(day, selectedDate)
            const dayEvents = getDayEvents(day)
            const isCurrentMonth = isSameMonth(day, monthStart)

            return (
                <div
                key={day.toString()}
                className={`min-h-[100px] p-2 rounded-lg border transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    isSelected 
                    ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50 dark:bg-blue-900/10' 
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                } ${
                    !isCurrentMonth ? 'opacity-40' : ''
                }`}
                onClick={() => setSelectedDate(day)}
                >
                <div className="flex justify-between items-center mb-1">
                    <span className={`text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full ${
                    isToday(day) 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                    {format(day, 'd')}
                    </span>
                    {dayEvents.some(e => e.type === 'PRAZO') && (
                    <div className="h-2 w-2 rounded-full bg-red-500" title="Há prazos neste dia"></div>
                    )}
                </div>
                
                <div className="space-y-1 mt-2">
                    {dayEvents.slice(0, 3).map((event, i) => (
                    <div 
                        key={i} 
                        className={`text-[10px] px-1.5 py-0.5 rounded truncate border ${getEventStyles(event.type)}`}
                    >
                        {event.time} {event.title}
                    </div>
                    ))}
                    {dayEvents.length > 3 && (
                    <div className="text-[10px] text-gray-400 text-center">
                        +{dayEvents.length - 3} mais
                    </div>
                    )}
                </div>
                </div>
            )
            })}
        </div>
      </>
    )
  }

  const selectedDayEvents = events.filter(event => isSameDay(event.date, selectedDate))

  return (
    <>
      <SEOHead
        title="Agenda & Prazos Legislativos"
        description="Acompanhe prazos, sessões e eventos do calendário legislativo"
      />

      <MainLayout>
        <div className="max-w-7xl mx-auto space-y-6 pb-8">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Agenda & Prazos</h1>
              <p className="text-gray-600 dark:text-gray-400">Gerencie sessões, compromissos e datas limites regimentais.</p>
            </div>
            
            <div className="flex gap-2">
            <Button 
                variant="outline" 
                onClick={() => setActiveFilter('all')}
                className={activeFilter === 'all' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
            >
                Todos
            </Button>
            <Button 
                variant="outline" 
                onClick={() => setActiveFilter('sessions')}
                className={activeFilter === 'sessions' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
            >
                Sessões
            </Button>
            <Button 
                variant="outline" 
                onClick={() => setActiveFilter('deadlines')}
                className={activeFilter === 'deadlines' ? 'bg-red-50 text-red-700 border-red-200' : ''}
            >
                Prazos Fatais
            </Button>

            <Button 
                variant="premium"
                onClick={() => setIsAssistantOpen(true)}
                className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-0"
            >
                <Sparkles className="h-4 w-4" />
                Agendar com IA
            </Button>

            <Button onClick={openAddModal}>
                + Novo Evento
            </Button>
          </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Calendar View (2/3) */}
            <Card className="lg:col-span-2 border-0 shadow-sm min-h-[600px]">
              <CardContent className="p-6">
                {renderHeader()}
                {renderCells()}
              </CardContent>
            </Card>

            {/* Sidebar Details (1/3) */}
            <div className="space-y-6">
              
              {/* Selected Date Details */}
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="text-lg capitalize">
                    {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </CardTitle>
                  <CardDescription>
                    {selectedDayEvents.length} eventos programados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedDayEvents.length > 0 ? (
                    <div className="space-y-4">
                      {selectedDayEvents.map(event => (
                        <div key={event.id} className="flex gap-3 items-start pb-3 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0">
                          <div className={`p-2 rounded-lg`}>
                             {/* Icons based on type */}
                             {event.type === 'PRAZO' && <AlertTriangle className="h-5 w-5 text-red-600" />}
                             {event.type === 'SESSAO' && <Gavel className="h-5 w-5 text-blue-600" />}
                             {(event.type === 'GABINETE' || event.type === 'EXTERNO') && <Briefcase className="h-5 w-5 text-gray-600" />}
                             {(event.type === 'COMISSAO' || event.type === 'AUDIENCIA') && <Users className="h-5 w-5 text-yellow-600" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100">{event.title}</h4>
                                <Badge variant="outline" className="text-[10px] h-5 px-1">{getEventLabel(event.type)}</Badge>
                                <div className="ml-auto flex gap-1">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-blue-400 hover:text-blue-600 hover:bg-blue-50 h-6 w-6 p-0"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditEvent(event);
                                        }}
                                        title="Editar evento"
                                    >
                                        <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-red-400 hover:text-red-600 hover:bg-red-50 h-6 w-6 p-0"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteEvent(event.id);
                                        }}
                                        title="Excluir evento"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                              <Clock className="h-3 w-3 mr-1" />
                              {event.time}
                              {event.location && (
                                <>
                                  <span className="mx-2">•</span>
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {event.location}
                                </>
                              )}
                            </div>
                            {event.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                                {event.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CalendarX className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>Nenhum evento para este dia.</p>
                      <Button variant="ghost" size="sm" className="mt-2 text-blue-600" onClick={openAddModal}>
                        + Adicionar Evento
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Upcoming Deadlines Widget */}
              <Card className="bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <AlertTriangle className="h-5 w-5" />
                    <CardTitle className="text-base">Prazos Próximos</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {events
                      .filter(e => e.type === 'PRAZO' && e.date >= new Date())
                      .sort((a, b) => a.date.getTime() - b.date.getTime())
                      .slice(0, 3)
                      .map(deadline => (
                        <div key={deadline.id} className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-red-100 dark:border-red-900/20 shadow-sm">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{deadline.title}</p>
                          <p className="text-xs text-red-600 font-medium mt-1">
                            Vence {format(deadline.date, "dd/MM 'às' HH:mm")}
                          </p>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      </MainLayout>

      {/* MODAL ADICIONAR EVENTO */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalHeader>
            <ModalTitle>{editingEventId ? 'Editar Evento' : 'Adicionar Novo Evento'}</ModalTitle>
            <ModalDescription>{editingEventId ? 'Altere os detalhes do seu compromisso.' : 'Crie um novo compromisso ou prazo na sua agenda.'}</ModalDescription>
        </ModalHeader>
        
        <form onSubmit={handleAddEvent} className="space-y-4 mt-4">
            <div>
                <Input 
                    label="Título do Evento *"
                    value={newEvent.title}
                    onChange={(e) => {
                      setNewEvent({ ...newEvent, title: e.target.value })
                      clearFieldError('title')
                    }}
                    placeholder="Ex: Reunião com Secretário de Obras"
                    error={renderFieldError(fieldErrors.title)}
                    maxLength={MAX_AGENDA_TITLE_LENGTH}
                    required
                />
                <div className="flex justify-end mt-1">
                  <CharacterCounter current={newEvent.title.length} max={MAX_AGENDA_TITLE_LENGTH} />
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                    <select
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-700"
                        value={newEvent.type}
                        onChange={(e) => {
                          setNewEvent({ ...newEvent, type: e.target.value as EventType })
                          clearFieldError('type')
                        }}
                    >
                        <option value="GABINETE">Gabinete (Interno)</option>
                        <option value="SESSAO">Sessão Plenária</option>
                        <option value="COMISSAO">Comissão</option>
                        <option value="AUDIENCIA">Audiência Pública</option>
                        <option value="PRAZO">Prazo Regimental</option>
                        <option value="EXTERNO">Visita Externa</option>
                    </select>
                    {fieldErrors.type && (
                      <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" aria-hidden="true" />
                        {fieldErrors.type}
                      </p>
                    )}
                </div>
                <div>
                    <Input 
                        label="Local"
                        value={newEvent.location}
                        onChange={(e) => {
                          setNewEvent({ ...newEvent, location: e.target.value })
                          clearFieldError('location')
                        }}
                        placeholder="Ex: Gabinete 12"
                        error={renderFieldError(fieldErrors.location)}
                        maxLength={MAX_AGENDA_LOCATION_LENGTH}
                    />
                    <div className="flex justify-end mt-1">
                      <CharacterCounter current={newEvent.location.length} max={MAX_AGENDA_LOCATION_LENGTH} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Input 
                        label="Data *"
                        type="date"
                        value={newEvent.date}
                        onChange={(e) => {
                          setNewEvent({ ...newEvent, date: e.target.value })
                          clearFieldError('date')
                        }}
                        error={renderFieldError(fieldErrors.date)}
                        required
                    />
                </div>
                <div>
                    <Input 
                        label="Hora *"
                        type="time"
                        value={newEvent.time}
                        onChange={(e) => {
                          setNewEvent({ ...newEvent, time: e.target.value })
                          clearFieldError('time')
                        }}
                        error={renderFieldError(fieldErrors.time)}
                        required
                    />
                </div>
            </div>

            <div>
                <Textarea 
                    label="Descrição"
                    placeholder="Detalhes adicionais sobre o evento..."
                    value={newEvent.description}
                    onChange={(e) => {
                      setNewEvent({ ...newEvent, description: e.target.value })
                      clearFieldError('description')
                    }}
                    maxLength={MAX_AGENDA_DESCRIPTION_LENGTH}
                    error={renderFieldError(fieldErrors.description)}
                    rows={3}
                />
                <div className="flex justify-end mt-1">
                  <CharacterCounter current={newEvent.description.length} max={MAX_AGENDA_DESCRIPTION_LENGTH} />
                </div>
            </div>

            <ModalFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                </Button>
                <Button type="submit" variant="primary">
                    {editingEventId ? 'Salvar Alterações' : 'Salvar Evento'}
                </Button>
            </ModalFooter>
        </form>
      </Modal>



      <AgendaAssistant 
        isOpen={isAssistantOpen} 
        onClose={() => setIsAssistantOpen(false)}
        onSuccess={fetchEvents}
      />
    </>
  )
}
