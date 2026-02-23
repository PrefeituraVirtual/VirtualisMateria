import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import type { AxiosRequestConfig } from 'axios'
import {
  createAxiosError,
  createAxiosResponse,
  httpErrors,
  mockAxiosInstance,
  resetAxiosMocks,
  setupLocalStorageMock,
} from '@/__tests__/utils/api-mocks'
import type { User } from '@/types/auth'

let api: typeof import('@/lib/api').api
let ApiError: typeof import('@/lib/api').ApiError

const getRequestInterceptor = () => {
  const [handler] = mockAxiosInstance.interceptors.request.use.mock.calls[0] || []
  return handler as (config: AxiosRequestConfig) => AxiosRequestConfig
}

const getResponseErrorInterceptor = () => {
  const [, handler] = mockAxiosInstance.interceptors.response.use.mock.calls[0] || []
  return handler as (error: unknown) => Promise<unknown>
}

const captureError = async (promise: Promise<unknown>) => {
  try {
    await promise
  } catch (error) {
    return error as Error
  }
  throw new Error('Expected promise to reject')
}

describe('ApiError', () => {
  beforeEach(async () => {
    resetAxiosMocks()
    vi.resetModules()
    const apiModule = await import('@/lib/api')
    ApiError = apiModule.ApiError
  })

  it('creates an ApiError with message and status', () => {
    const error = new ApiError('Falha', 400, 'VALIDATION_ERROR', { field: 'name' })
    expect(error.message).toBe('Falha')
    expect(error.statusCode).toBe(400)
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.details).toEqual({ field: 'name' })
  })

  it('classifies errors by status', () => {
    const authError = new ApiError('Auth', 401)
    const validationError = new ApiError('Validation', 422)
    const serverError = new ApiError('Server', 503)
    const networkError = new ApiError('Network', undefined, 'ECONNABORTED')

    expect(authError.isAuthError()).toBe(true)
    expect(validationError.isValidationError()).toBe(true)
    expect(serverError.isServerError()).toBe(true)
    expect(networkError.isNetworkError()).toBe(true)
  })

  it('marks retryable errors correctly', () => {
    expect(new ApiError('Server', 500).retryable).toBe(true)
    expect(new ApiError('Too many', 429).retryable).toBe(true)
    expect(new ApiError('Bad request', 400).retryable).toBe(false)
    expect(new ApiError('Unknown').retryable).toBe(false)
  })

  it('serializes to JSON with metadata', () => {
    const error = new ApiError('Boom', 500, 'ERR', { info: true })
    const serialized = JSON.parse(JSON.stringify(error)) as Record<string, unknown>
    expect(serialized.name).toBe('ApiError')
    expect(serialized.statusCode).toBe(500)
    expect(serialized.code).toBe('ERR')
    expect(serialized.retryable).toBe(true)
  })
})

describe('ApiClient', () => {
  beforeEach(async () => {
    resetAxiosMocks()
    vi.resetModules()
    const apiModule = await import('@/lib/api')
    api = apiModule.api
    ApiError = apiModule.ApiError
    resetAxiosMocks({ keepInterceptors: true })
    setupLocalStorageMock()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('Error Handling', () => {
    it('uses server-provided message when available', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(
        createAxiosError({
          status: 400,
          data: { message: 'Mensagem do servidor' },
        })
      )

      const error = await captureError(api.get('/api/test', { retries: 0 }))
      expect(error).toBeInstanceOf(ApiError)
      expect(error.message).toBe('Mensagem do servidor')
    })

    it('maps common status codes to Portuguese messages', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(createAxiosError({ status: 401 }))
      const error401 = await captureError(api.get('/api/test', { retries: 0 }))
      expect(error401.message).toBe('Sessao expirada. Faca login novamente.')

      mockAxiosInstance.get.mockRejectedValueOnce(createAxiosError({ status: 404 }))
      const error404 = await captureError(api.get('/api/test', { retries: 0 }))
      expect(error404.message).toBe('Recurso nao encontrado.')

      mockAxiosInstance.get.mockRejectedValueOnce(createAxiosError({ status: 500 }))
      const error500 = await captureError(api.get('/api/test', { retries: 0 }))
      expect(error500.message).toBe('Erro no servidor. Tente novamente em alguns instantes.')
    })

    it('returns timeout and network messages', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(httpErrors.timeout())
      const timeoutError = await captureError(api.get('/api/test', { retries: 0 }))
      expect(timeoutError.message).toBe('Tempo limite excedido. A operacao demorou muito. Tente novamente.')

      mockAxiosInstance.get.mockRejectedValueOnce(httpErrors.network())
      const networkError = await captureError(api.get('/api/test', { retries: 0 }))
      expect(networkError.message).toBe('Erro de conexao. Verifique sua internet.')
    })

    it('falls back to a generic message for unknown errors', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('boom'))
      const error = await captureError(api.get('/api/test', { retries: 0 }))
      expect(error.message).toBe('Ocorreu um erro inesperado. Tente novamente.')
    })

    it('preserves ApiError instances when thrown', async () => {
      const apiError = new ApiError('Custom', 418)
      mockAxiosInstance.get.mockRejectedValueOnce(apiError)
      const error = await captureError(api.get('/api/test', { retries: 0 }))
      expect(error).toBe(apiError)
    })

    it('handles string errors with generic message', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce('boom')
      const error = await captureError(api.get('/api/test', { retries: 0 }))
      expect(error.message).toBe('Ocorreu um erro inesperado. Tente novamente.')
    })
  })

  describe('HTTP Methods', () => {
    it('performs GET with params', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce(createAxiosResponse({ data: 'ok' }))
      const result = await api.get('/api/test', { params: { page: 1 } })
      expect(result).toEqual({ data: 'ok' })
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/test', { params: { page: 1 } })
    })

    it('performs POST with body', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce(createAxiosResponse({ created: true }))
      const result = await api.post('/api/test', { name: 'Nova' })
      expect(result).toEqual({ created: true })
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/test', { name: 'Nova' }, {})
    })

    it('performs PUT with body', async () => {
      mockAxiosInstance.put.mockResolvedValueOnce(createAxiosResponse({ updated: true }))
      const result = await api.put('/api/test', { name: 'Atualizada' })
      expect(result).toEqual({ updated: true })
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/test', { name: 'Atualizada' }, {})
    })

    it('performs PATCH with body', async () => {
      mockAxiosInstance.patch.mockResolvedValueOnce(createAxiosResponse({ patched: true }))
      const result = await api.patch('/api/test', { name: 'Parcial' })
      expect(result).toEqual({ patched: true })
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/api/test', { name: 'Parcial' }, {})
    })

    it('performs DELETE request', async () => {
      mockAxiosInstance.delete.mockResolvedValueOnce(createAxiosResponse({ deleted: true }))
      const result = await api.delete('/api/test')
      expect(result).toEqual({ deleted: true })
      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/api/test', {})
    })
  })

  describe('Retry Logic', () => {
    it('retries on 5xx errors up to the configured attempts', async () => {
      vi.useFakeTimers()
      mockAxiosInstance.get
        .mockRejectedValueOnce(createAxiosError({ status: 500 }))
        .mockRejectedValueOnce(createAxiosError({ status: 502 }))
        .mockResolvedValueOnce(createAxiosResponse({ success: true }))

      const promise = api.get('/api/retry', { retries: 2, retryDelay: 100 })
      await vi.runAllTimersAsync()

      await expect(promise).resolves.toEqual({ success: true })
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3)
    })

    it('does not retry on 4xx errors except 429', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(createAxiosError({ status: 400 }))
      await expect(api.get('/api/no-retry', { retries: 3 })).rejects.toBeInstanceOf(ApiError)
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1)
    })

    it('retries on 429 errors', async () => {
      vi.useFakeTimers()
      mockAxiosInstance.get
        .mockRejectedValueOnce(createAxiosError({ status: 429 }))
        .mockResolvedValueOnce(createAxiosResponse({ success: true }))

      const promise = api.get('/api/too-many', { retries: 1, retryDelay: 50 })
      await vi.runAllTimersAsync()

      await expect(promise).resolves.toEqual({ success: true })
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2)
    })

    it('uses exponential backoff with jitter', async () => {
      vi.useFakeTimers()
      vi.spyOn(Math, 'random').mockReturnValue(0)
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout')

      mockAxiosInstance.get
        .mockRejectedValueOnce(createAxiosError({ status: 500 }))
        .mockRejectedValueOnce(createAxiosError({ status: 500 }))
        .mockResolvedValueOnce(createAxiosResponse({ success: true }))

      const promise = api.get('/api/backoff', { retries: 2, retryDelay: 1000 })
      await vi.runAllTimersAsync()

      await expect(promise).resolves.toEqual({ success: true })
      const delays = setTimeoutSpy.mock.calls.map((call: [unknown, number | undefined]) => call[1]).filter(Boolean)
      expect(delays).toContain(800)
      expect(delays).toContain(1600)
    })
  })

  describe('Interceptors', () => {
    const createMockUser = (): User => ({
      id: 'user-1',
      name: 'Test',
      email: 'test@test.com',
      role: 'admin' as const,
      council_member_id: 'cm-1',
      council_id: 'c-1',
    })

    it('adds auth token to request headers', async () => {
      vi.stubGlobal('window', { location: { pathname: '/', href: '' } })
      // Use the api's setAuth method to set the token in the cache
      const mockUser = createMockUser()
      await api.setAuth('token-123', mockUser)

      const requestInterceptor = getRequestInterceptor()
      const config = requestInterceptor({ headers: {} })

      expect(config.headers?.Authorization).toBe('Bearer token-123')
    })

    it('sets baseURL depending on environment', () => {
      const requestInterceptor = getRequestInterceptor()

      const originalApiUrl = process.env.NEXT_PUBLIC_API_URL
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000'
      vi.stubGlobal('window', { location: { pathname: '/painel', href: '' } })
      const browserConfig = requestInterceptor({ headers: {} })
      expect(browserConfig.baseURL).toBe('')

      vi.unstubAllGlobals()
      process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com'
      const serverConfig = requestInterceptor({ headers: {} })
      expect(serverConfig.baseURL).toBe('https://api.example.com')

      process.env.NEXT_PUBLIC_API_URL = originalApiUrl
    })

    it('redirects to login on 401 and clears token', async () => {
      vi.stubGlobal('window', { location: { pathname: '/painel', href: '' } })
      // Use the api's setAuth method to set the token in the cache
      const mockUser = createMockUser()
      await api.setAuth('token-123', mockUser)

      const responseInterceptor = getResponseErrorInterceptor()
      const axiosError = createAxiosError({ status: 401 })

      await expect(responseInterceptor(axiosError)).rejects.toBeInstanceOf(ApiError)
      // Token should be cleared from the api's internal cache
      expect(api.getAuthToken()).toBeNull()
      expect(window.location.href).toBe('/auth/login')
    })
  })
})
