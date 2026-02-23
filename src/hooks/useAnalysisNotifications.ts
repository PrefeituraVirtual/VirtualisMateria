import { useState, useEffect, useCallback, useRef } from 'react'
import { AnalysisMode } from '@/components/ai/DeepSeekAnalysis'
import { useNotification } from '@/contexts/NotificationContext'

interface NotificationConfig {
  enabled: boolean
  sound: boolean
  desktop: boolean
  progress: boolean
  completion: boolean
  timeThreshold: number // segundos para notificar sobre tempo decorrido
}

interface AnalysisState {
  isRunning: boolean
  startTime?: Date
  currentStep?: string
  progress: number
  estimatedTime: number
  elapsedTime: number
  mode: AnalysisMode['id']
}

type NotificationAudio = {
  play: () => void
}

type WindowWithWebkitAudio = Window & {
  AudioContext?: new () => AudioContext
  webkitAudioContext?: new () => AudioContext
}

const DEFAULT_CONFIG: NotificationConfig = {
  enabled: true,
  sound: true,
  desktop: true,
  progress: true,
  completion: true,
  timeThreshold: 30 // 30 segundos
}

export const useAnalysisNotifications = (config: Partial<NotificationConfig> = {}) => {
  const notificationConfig = { ...DEFAULT_CONFIG, ...config }
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    isRunning: false,
    progress: 0,
    estimatedTime: 0,
    elapsedTime: 0,
    mode: 'fast'
  })

  const { addNotification } = useNotification()
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const [lastNotification, setLastNotification] = useState<string>('')
  const progressNotificationSent = useRef<boolean>(false)
  const audioRef = useRef<NotificationAudio | null>(null)

  // Verificar permissão de notificações desktop
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission)

      // Request permission if not granted
      if (Notification.permission === 'default' && notificationConfig.desktop) {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission)
        })
      }
    }
  }, [notificationConfig.desktop])

  // Preparar áudio de notificação
  useEffect(() => {
    if (notificationConfig.sound && typeof window !== 'undefined') {
      // Criar som de notificação usando Web Audio API
      const createNotificationSound = () => {
        const audioWindow = window as WindowWithWebkitAudio
        const AudioContextConstructor = audioWindow.AudioContext || audioWindow.webkitAudioContext
        if (!AudioContextConstructor) return

        const audioContext = new AudioContextConstructor()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.frequency.value = 800
        oscillator.type = 'sine'

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.5)
      }

      // Salvar função de áudio
      audioRef.current = { play: createNotificationSound }
    }
  }, [notificationConfig.sound])

  // Enviar notificação desktop
  const sendDesktopNotification = useCallback((title: string, body: string, icon?: string) => {
    if (!notificationConfig.desktop || notificationPermission !== 'granted') return

    try {
      const notification = new Notification(title, {
        body,
        icon: icon || '/logo/imagotipo.png',
        badge: '/logo/imagotipo.png',
        tag: 'deepseek-analysis',
        requireInteraction: false,
        silent: !notificationConfig.sound
      })

      // Auto-fechar após 5 segundos
      setTimeout(() => {
        notification.close()
      }, 5000)

      // Lidar com clique na notificação
      notification.onclick = () => {
        window.focus()
        notification.close()
      }

      return notification
    } catch (error) {
      console.warn('Failed to send desktop notification:', error)
    }
  }, [notificationConfig.desktop, notificationPermission, notificationConfig.sound])

  // Tocar som de notificação
  const playNotificationSound = useCallback(() => {
    if (!notificationConfig.sound || !audioRef.current) return

    try {
      audioRef.current.play()
    } catch (error) {
      console.warn('Failed to play notification sound:', error)
    }
  }, [notificationConfig.sound])

  // Enviar notificação de progresso
  const sendProgressNotification = useCallback((state: AnalysisState) => {
    if (!notificationConfig.progress || !notificationConfig.enabled) return

    const message = `Análise ${state.mode === 'deep' ? 'profunda' : 'rápida'} em andamento: ${Math.round(state.progress)}% concluído`
    const notificationKey = `progress-${state.mode}`

    // Evitar notificações duplicadas
    if (lastNotification === notificationKey) return

    setLastNotification(notificationKey)

    sendDesktopNotification(
      'Progresso da Análise',
      message
    )

    playNotificationSound()
  }, [notificationConfig.progress, notificationConfig.enabled, lastNotification, sendDesktopNotification, playNotificationSound])

  // Enviar notificação de conclusão
  const sendCompletionNotification = useCallback((state: AnalysisState) => {
    if (!notificationConfig.completion || !notificationConfig.enabled) return

    const message = `Análise ${state.mode === 'deep' ? 'profunda' : 'rápida'} concluída em ${state.elapsedTime}s!`
    const notificationKey = `completion-${state.mode}-${Date.now()}`

    setLastNotification(notificationKey)

    sendDesktopNotification(
      'Análise Concluída! 🎉',
      message,
      '/logo/imagotipo.png'
    )

    addNotification({
      title: 'Análise Concluída',
      message: message,
      type: 'success'
    })

    playNotificationSound()
  }, [notificationConfig.completion, notificationConfig.enabled, sendDesktopNotification, playNotificationSound, addNotification])

  // Iniciar análise
  const startAnalysis = useCallback((mode: AnalysisMode['id'], estimatedTime: number) => {
    if (!notificationConfig.enabled) return

    const startTime = new Date()
    setAnalysisState({
      isRunning: true,
      startTime,
      progress: 0,
      estimatedTime,
      elapsedTime: 0,
      mode
    })

    progressNotificationSent.current = false

    // Notificar sobre início da análise profunda
    if (mode === 'deep' && estimatedTime > 30) {
      sendDesktopNotification(
        'Análise Profunda Iniciada',
        `A análise detalhada começou e deve levar cerca de ${Math.round(estimatedTime / 60)} minuto(s). Você será notificado quando concluída.`
      )

      addNotification({
        title: 'Análise Profunda Iniciada',
        message: `A análise detalhada começou e deve levar cerca de ${Math.round(estimatedTime / 60)} minuto(s).`,
        type: 'info'
      })
    }
  }, [notificationConfig.enabled, sendDesktopNotification, addNotification])

  // Atualizar progresso
  const updateProgress = useCallback((progress: number, currentStep?: string) => {
    if (!analysisState.isRunning || !notificationConfig.enabled) return

    const now = new Date()
    const elapsed = analysisState.startTime
      ? Math.floor((now.getTime() - analysisState.startTime.getTime()) / 1000)
      : 0

    const newState = {
      ...analysisState,
      progress,
      currentStep,
      elapsedTime: elapsed
    }

    setAnalysisState(newState)

    // Enviar notificação de progresso a cada 25% e após threshold de tempo
    if (notificationConfig.progress &&
        ((progress >= 25 && progress < 26) ||
         (progress >= 50 && progress < 51) ||
         (progress >= 75 && progress < 76) ||
         (elapsed > notificationConfig.timeThreshold && !progressNotificationSent.current))) {

      sendProgressNotification(newState)

      if (elapsed > notificationConfig.timeThreshold) {
        progressNotificationSent.current = true
      }
    }
  }, [analysisState, notificationConfig.enabled, notificationConfig.progress, notificationConfig.timeThreshold, sendProgressNotification])

  // Concluir análise
  const completeAnalysis = useCallback(() => {
    if (!analysisState.isRunning || !notificationConfig.enabled) return

    const finalState = {
      ...analysisState,
      isRunning: false,
      progress: 100
    }

    setAnalysisState(finalState)
    sendCompletionNotification(finalState)
  }, [analysisState, notificationConfig.enabled, sendCompletionNotification])

  // Cancelar análise
  const cancelAnalysis = useCallback(() => {
    setAnalysisState(prev => ({
      ...prev,
      isRunning: false,
      progress: 0
    }))

    progressNotificationSent.current = false
  }, [])

  // Limpar estado
  const reset = useCallback(() => {
    setAnalysisState({
      isRunning: false,
      progress: 0,
      estimatedTime: 0,
      elapsedTime: 0,
      mode: 'fast'
    })
    progressNotificationSent.current = false
    setLastNotification('')
  }, [])

  // Atualizar tempo decorrido
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (analysisState.isRunning && analysisState.startTime) {
      interval = setInterval(() => {
        const now = new Date()
        const elapsed = Math.floor((now.getTime() - analysisState.startTime!.getTime()) / 1000)

        setAnalysisState(prev => ({
          ...prev,
          elapsedTime: elapsed
        }))

        // Notificar se estiver demorando mais que o esperado
        if (elapsed > analysisState.estimatedTime * 1.5 && !progressNotificationSent.current) {
          sendDesktopNotification(
            'Análise em Andamento',
            `A análise está demorando mais que o previsto. Tempo decorrido: ${Math.round(elapsed / 60)} minuto(s).`
          )
          progressNotificationSent.current = true

          addNotification({
            title: 'Análise em Andamento',
            message: `A análise está demorando mais que o previsto. Tempo decorrido: ${Math.round(elapsed / 60)} minuto(s).`,
            type: 'warning'
          })
        }
      }, 5000) // Atualizar a cada 5 segundos
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [analysisState.isRunning, analysisState.startTime, analysisState.estimatedTime, sendDesktopNotification, addNotification])

  // Solicitar permissão de notificação
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false
    }

    if (Notification.permission === 'granted') {
      setNotificationPermission('granted')
      return true
    }

    if (Notification.permission === 'denied') {
      setNotificationPermission('denied')
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      return permission === 'granted'
    } catch (error) {
      console.warn('Failed to request notification permission:', error)
      return false
    }
  }, [])

  return {
    // State
    analysisState,
    notificationPermission,

    // Actions
    startAnalysis,
    updateProgress,
    completeAnalysis,
    cancelAnalysis,
    reset,

    // Notification controls
    sendDesktopNotification,
    playNotificationSound,
    requestNotificationPermission,

    // Config
    config: notificationConfig
  }
}

export default useAnalysisNotifications
