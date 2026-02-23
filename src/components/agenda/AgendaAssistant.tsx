import { useState, useRef } from 'react'
import { Sparkles, Send, Calendar, Clock, MapPin, Check, X, Mic } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal, ModalHeader, ModalTitle, ModalDescription } from '@/components/ui/Modal'
import { toast } from 'react-hot-toast'
import { format, parseISO } from 'date-fns'
import { agendaService } from '@/lib/api'
import { getSecureItem } from '@/lib/secure-storage'
import type { AgendaCreateData } from '@/types/api'

interface AgendaAssistantProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ParsedEvent {
  title: string
  type: 'SESSAO' | 'PRAZO' | 'COMISSAO' | 'AUDIENCIA' | 'GABINETE' | 'EXTERNO'
  date: string
  time: string
  location: string
  description: string
}

interface SpeechRecognitionResultLike {
  transcript: string
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>
}

interface SpeechRecognitionErrorEventLike {
  error: string
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

export default function AgendaAssistant({ isOpen, onClose, onSuccess }: AgendaAssistantProps) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsedEvent, setParsedEvent] = useState<ParsedEvent | null>(null)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  const toggleListening = () => {
    if (typeof window === 'undefined') return
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const recognitionWindow = window as SpeechRecognitionWindow
    const SpeechRecognition = recognitionWindow.SpeechRecognition || recognitionWindow.webkitSpeechRecognition

    if (!SpeechRecognition) {
      toast.error('Seu navegador não suporta reconhecimento de voz.')
      return
    }

    const recognition = new SpeechRecognition()
    
    recognition.lang = 'pt-BR'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => setIsListening(true)
    
    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const transcript = event.results[0]?.[0]?.transcript
      if (!transcript) return
      setPrompt(prev => prev ? `${prev} ${transcript}` : transcript)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      console.error('Speech error', event)
      setIsListening(false)
      if (event.error === 'not-allowed') {
        toast.error('Permissão de microfone negada')
      }
    }

    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
  }

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setLoading(true)
    try {
      const token = await getSecureItem<string>('authToken')
      const response = await fetch('/api/agenda/ai/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt })
      })

      if (!response.ok) throw new Error('Falha na análise')
      
      const result = await response.json()
      setParsedEvent(result.data)
    } catch (error) {
      console.error(error)
      toast.error('Não entendi seu pedido, tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!parsedEvent) return

    setLoading(true)
    try {
      const agendaData: AgendaCreateData = {
        title: parsedEvent.title,
        date: parsedEvent.date,
        time: parsedEvent.time,
        type: parsedEvent.type,
        location: parsedEvent.location,
        description: parsedEvent.description,
      }

      await agendaService.create(agendaData)
      toast.success('Evento criado via IA!')
      onSuccess()
      handleClose()
    } catch {
      toast.error('Erro ao salvar evento.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setPrompt('')
    setParsedEvent(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalHeader>
        <div className="flex items-center gap-2 text-purple-600">
          <Sparkles className="h-5 w-5" />
          <ModalTitle>Assistente de Agenda IA</ModalTitle>
        </div>
        <ModalDescription>
          Descreva o evento e eu agendo para você. Ex: "Sessão solene sexta às 19h"
        </ModalDescription>
      </ModalHeader>

      <div className="space-y-4">
        {!parsedEvent ? (
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Digite aqui... (ex: Almoço com prefeito amanhã meio dia)"
                className="w-full h-32 p-3 pr-10 rounded-lg border focus:ring-2 focus:ring-purple-500 resize-none dark:bg-gray-800 dark:border-gray-700"
                autoFocus
              />
              <div className="absolute bottom-3 right-3 flex gap-2">
                <Button 
                    type="button"
                    size="sm"
                    onClick={toggleListening}
                    className={`rounded-full h-8 w-8 p-0 flex items-center justify-center transition-all ${
                        isListening 
                        ? 'bg-red-500 hover:bg-red-600 animate-pulse text-white' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                    title="Falar"
                >
                    <Mic className="h-4 w-4" />
                </Button>
                <Button 
                    type="submit" 
                    size="sm" 
                    disabled={loading || !prompt.trim()}
                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-full h-8 w-8 p-0 flex items-center justify-center"
                >
                    {loading ? <div className="animate-spin h-3 w-3 border-2 border-white rounded-full border-t-transparent" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <p className="text-xs text-center text-gray-500">
              Eu entendo datas como "próxima terça", "amanhã" e tipos de eventos legislativos.
            </p>
          </form>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-800">
              <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Sugestão Encontrada
              </h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex gap-2">
                    <span className="font-medium w-16 text-gray-500">Evento:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{parsedEvent.title}</span>
                </div>
                <div className="flex gap-2">
                    <span className="font-medium w-16 text-gray-500">Tipo:</span>
                    <span className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded text-xs border border-gray-200 dark:border-gray-700">
                        {parsedEvent.type}
                    </span>
                </div>
                <div className="flex gap-2 items-center">
                    <span className="font-medium w-16 text-gray-500">Data:</span>
                    <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(parsedEvent.date), 'dd/MM/yyyy')}
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    <span className="font-medium w-16 text-gray-500">Hora:</span>
                    <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                        <Clock className="h-3 w-3" />
                        {parsedEvent.time}
                    </div>
                </div>
                {parsedEvent.location && (
                    <div className="flex gap-2 items-center">
                        <span className="font-medium w-16 text-gray-500">Local:</span>
                        <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                            <MapPin className="h-3 w-3" />
                            {parsedEvent.location}
                        </div>
                    </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
                <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setParsedEvent(null)}
                >
                    <X className="h-4 w-4 mr-2" />
                    Tentar Novamente
                </Button>
                <Button 
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={handleConfirm}
                    disabled={loading}
                >
                    {loading ? 'Salvando...' : (
                        <>
                            <Check className="h-4 w-4 mr-2" />
                            Confirmar Agendamento
                        </>
                    )}
                </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
