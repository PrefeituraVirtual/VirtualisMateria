import { useState, useEffect, useCallback, useRef } from 'react'
import { AnalysisResult, AnalysisMode } from '@/components/ai/DeepSeekAnalysis'

interface CacheEntry {
  result: AnalysisResult
  timestamp: number
  accessCount: number
  lastAccessed: number
}

interface CacheStats {
  size: number
  totalEntries: number
  hitRate: number
  memoryUsage: string
}

interface UseDeepSeekCacheOptions {
  maxSize?: number
  maxAge?: number // em horas
  enableStats?: boolean
  storageKey?: string
}

const DEFAULT_OPTIONS: Required<UseDeepSeekCacheOptions> = {
  maxSize: 50,
  maxAge: 24, // 24 horas
  enableStats: true,
  storageKey: 'deepseek-analysis-cache'
}

export const useDeepSeekCache = (options: UseDeepSeekCacheOptions = {}) => {
  const config = { ...DEFAULT_OPTIONS, ...options }
  const [cache, setCache] = useState<Map<string, CacheEntry>>(new Map())
  const [stats, setStats] = useState({
    hits: 0,
    misses: 0,
    totalRequests: 0
  })

  const accessCountRef = useRef<Map<string, number>>(new Map())
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cacheSizeRef = useRef(0)

  // Carregar cache do localStorage na montagem
  useEffect(() => {
    try {
      const stored = localStorage.getItem(config.storageKey)
      if (stored) {
        const parsedCache = JSON.parse(stored) as unknown
        const cacheMap = new Map<string, CacheEntry>()

        // Validar e limpar entradas expiradas
        const now = Date.now()
        const maxAgeMs = config.maxAge * 60 * 60 * 1000

        const isRecord = (value: unknown): value is Record<string, unknown> =>
          typeof value === 'object' && value !== null

        const isCacheEntry = (value: unknown): value is CacheEntry => {
          if (!isRecord(value)) return false
          return (
            typeof value.timestamp === 'number' &&
            typeof value.accessCount === 'number' &&
            typeof value.lastAccessed === 'number' &&
            'result' in value
          )
        }

        if (isRecord(parsedCache)) {
          Object.entries(parsedCache).forEach(([key, entry]) => {
            if (isCacheEntry(entry) && now - entry.timestamp <= maxAgeMs) {
              cacheMap.set(key, entry)
            }
          })
        }

        setCache(cacheMap)
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error)
    }
  }, [config.storageKey, config.maxAge])

  // Limpar entradas mais antigas
  const clearOldestEntries = useCallback(() => {
    setCache(prevCache => {
      const entries = Array.from(prevCache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)

      const entriesToKeep = entries.slice(-config.maxSize)
      return new Map(entriesToKeep)
    })
  }, [config.maxSize])

  useEffect(() => {
    if (cache.size === 0) return

    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current)
    }

    persistTimerRef.current = setTimeout(() => {
      try {
        const cacheObj = Object.fromEntries(cache)
        localStorage.setItem(config.storageKey, JSON.stringify(cacheObj))
      } catch (error: unknown) {
        console.warn('Failed to save cache to localStorage:', error)
        if (error instanceof Error && error.name === 'QuotaExceededError') {
          clearOldestEntries()
        }
      }
    }, 400)

    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current)
      }
    }
  }, [cache, config.storageKey, clearOldestEntries])

  // Gerar chave de cache
  const generateKey = useCallback((query: string, mode: AnalysisMode['id'], context?: Record<string, unknown>): string => {
    // Use encodeURIComponent + btoa for UTF-8 safe base64 encoding
    const contextHash = context 
      ? btoa(encodeURIComponent(JSON.stringify(context))).slice(0, 8) 
      : ''
    const normalizedQuery = query.toLowerCase().trim()
    return `${mode}:${normalizedQuery}:${contextHash}`
  }, [])

  // Verificar se entrada está expirada
  const isExpired = useCallback((entry: CacheEntry): boolean => {
    const now = Date.now()
    const maxAgeMs = config.maxAge * 60 * 60 * 1000
    return now - entry.timestamp > maxAgeMs
  }, [config.maxAge])

  // Obter entrada do cache
  const get = useCallback((query: string, mode: AnalysisMode['id'], context?: Record<string, unknown>): AnalysisResult | null => {
    const key = generateKey(query, mode, context)
    const entry = cache.get(key)

    // Atualizar estatísticas
    setStats(prev => ({
      ...prev,
      totalRequests: prev.totalRequests + 1,
      hits: entry && !isExpired(entry) ? prev.hits + 1 : prev.hits,
      misses: !entry || isExpired(entry) ? prev.misses + 1 : prev.misses
    }))

    if (!entry || isExpired(entry)) {
      if (entry) {
        setCache(prev => {
          const newCache = new Map(prev)
          newCache.delete(key)
          return newCache
        })
      }
      return null
    }

    accessCountRef.current.set(key, (accessCountRef.current.get(key) || 0) + 1)
    return entry.result
  }, [cache, generateKey, isExpired])

  // Adicionar entrada ao cache
  const set = useCallback((query: string, mode: AnalysisMode['id'], result: AnalysisResult, context?: Record<string, unknown>): void => {
    const key = generateKey(query, mode, context)

    const entry: CacheEntry = {
      result,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now()
    }

    setCache(prevCache => {
      const newCache = new Map(prevCache)

      // Se o cache estiver cheio, remover a entrada mais antiga
      if (newCache.size >= config.maxSize && !newCache.has(key)) {
        clearOldestEntries()
      }

      newCache.set(key, entry)
      return newCache
    })
  }, [generateKey, config.maxSize, clearOldestEntries])

  // Remover entrada específica
  const remove = useCallback((query: string, mode: AnalysisMode['id'], context?: Record<string, unknown>): boolean => {
    const key = generateKey(query, mode, context)

    setCache(prev => {
      const newCache = new Map(prev)
      newCache.delete(key)
      return newCache
    })

    return cache.has(key)
  }, [cache, generateKey])

  // Limpar todo o cache
  const clear = useCallback((): void => {
    setCache(new Map())
    try {
      localStorage.removeItem(config.storageKey)
    } catch (error) {
      console.warn('Failed to clear cache from localStorage:', error)
    }
  }, [config.storageKey])

  // Limpar entradas expiradas
  const clearExpired = useCallback((): void => {
    setCache(prevCache => {
      const newCache = new Map()
      prevCache.forEach((entry, key) => {
        if (!isExpired(entry)) {
          newCache.set(key, entry)
        }
      })
      return newCache
    })
  }, [isExpired])

  // Obter estatísticas do cache
  const getCacheStats = useCallback((): CacheStats => {
    const hitRate = stats.totalRequests > 0 ? (stats.hits / stats.totalRequests) * 100 : 0

    // Calcular uso aproximado de memória
    let totalSize = 0
    cache.forEach(entry => {
      totalSize += JSON.stringify(entry.result).length
    })
    const memoryUsage = totalSize > 1024 * 1024
      ? `${(totalSize / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.round(totalSize / 1024)} KB`

    return {
      size: cache.size,
      totalEntries: config.maxSize,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage
    }
  }, [cache, stats, config.maxSize])

  // Obter entradas mais acessadas
  const getTopEntries = useCallback((limit = 10): Array<{key: string, entry: CacheEntry}> => {
    return Array.from(cache.entries())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => {
        const countA = accessCountRef.current.get(a.key) || a.entry.accessCount
        const countB = accessCountRef.current.get(b.key) || b.entry.accessCount
        return countB - countA
      })
      .slice(0, limit)
  }, [cache])

  // Pré-carregar cache com análises comuns
  const preloadCommon = useCallback(async (commonQueries: string[], mode: AnalysisMode['id']): Promise<void> => {
    // Implementar lógica de pré-carregamento se necessário
    // Isso poderia fazer chamadas à API para análises preemptivas
    console.log('Preloading common queries:', commonQueries, mode)
  }, [])

  // Otimizar cache (remover entradas pouco acessadas)
  const optimize = useCallback((): void => {
    setCache(prevCache => {
      const now = Date.now()
      const entries = Array.from(prevCache.entries())
        .sort(([keyA, a], [keyB, b]) => {
          const countA = accessCountRef.current.get(keyA) || a.accessCount
          const countB = accessCountRef.current.get(keyB) || b.accessCount
          const ageA = now - a.timestamp
          const ageB = now - b.timestamp
          // Menor score = menos útil (pouco acesso + antigo)
          return (countA / (ageA || 1)) - (countB / (ageB || 1))
        })

      const entriesToKeep = entries.slice(-Math.floor(config.maxSize * 0.8))
      return new Map(entriesToKeep)
    })
  }, [config.maxSize])

  useEffect(() => {
    cacheSizeRef.current = cache.size
  }, [cache.size])

  useEffect(() => {
    if (!config.enableStats) return

    const interval = setInterval(() => {
      clearExpired()
      if (cacheSizeRef.current > config.maxSize * 0.9) {
        optimize()
      }
    }, 60 * 60 * 1000)

    return () => clearInterval(interval)
  }, [clearExpired, optimize, config.maxSize, config.enableStats])

  return {
    // Cache operations
    get,
    set,
    remove,
    clear,
    clearExpired,
    optimize,

    // Cache information
    getCacheStats,
    getTopEntries,
    preloadCommon,

    // State
    cache,
    stats,

    // Utilities
    generateKey,
    isExpired
  }
}

export default useDeepSeekCache
