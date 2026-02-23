import { vi, expect } from 'vitest'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig, AxiosHeaders } from 'axios'
import { createMockStorage } from './test-utils'

type AxiosErrorLike = Error & {
  isAxiosError: boolean
  code?: string
  config?: AxiosRequestConfig
  response?: {
    status: number
    statusText: string
    data?: unknown
    headers?: Record<string, string>
    config?: AxiosRequestConfig
  }
}

const axiosMocks = vi.hoisted(() => {
  const interceptors = {
    request: { use: vi.fn(), eject: vi.fn() },
    response: { use: vi.fn(), eject: vi.fn() },
  }

  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors,
  } as unknown as AxiosInstance

  const mockAxios = {
    create: vi.fn(() => mockAxiosInstance),
    isAxiosError: vi.fn((error: unknown) => Boolean((error as AxiosErrorLike)?.isAxiosError)),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  }

  return { mockAxios, mockAxiosInstance, interceptors }
})

vi.mock('axios', () => ({
  default: axiosMocks.mockAxios,
  isAxiosError: axiosMocks.mockAxios.isAxiosError,
}))

export const mockAxios = axiosMocks.mockAxios
export const mockAxiosInstance = axiosMocks.mockAxiosInstance
export const mockAxiosInterceptors = axiosMocks.interceptors

export const resetAxiosMocks = (options?: { keepInterceptors?: boolean }) => {
  mockAxios.create.mockClear()
  mockAxios.isAxiosError.mockClear()
  mockAxios.get.mockReset()
  mockAxios.post.mockReset()
  mockAxios.put.mockReset()
  mockAxios.patch.mockReset()
  mockAxios.delete.mockReset()
  mockAxiosInstance.get.mockReset()
  mockAxiosInstance.post.mockReset()
  mockAxiosInstance.put.mockReset()
  mockAxiosInstance.patch.mockReset()
  mockAxiosInstance.delete.mockReset()
  if (!options?.keepInterceptors) {
    mockAxiosInstance.interceptors.request.use.mockClear()
    mockAxiosInstance.interceptors.request.eject.mockClear()
    mockAxiosInstance.interceptors.response.use.mockClear()
    mockAxiosInstance.interceptors.response.eject.mockClear()
  }
}

export const setupLocalStorageMock = () => {
  const storage = createMockStorage()
  vi.stubGlobal('localStorage', storage as unknown as Storage)
  return storage
}

export const createAxiosResponse = <T>(
  data: T,
  status: number = 200,
  config: AxiosRequestConfig = {}
): AxiosResponse<T> => ({
  data,
  status,
  statusText: status >= 400 ? 'Error' : 'OK',
  headers: {},
  config: {
    ...config,
    headers: (config.headers ?? {}) as AxiosHeaders,
  } as InternalAxiosRequestConfig,
})

export const createAxiosError = ({
  status,
  code,
  message,
  data,
  headers,
  config,
}: {
  status?: number
  code?: string
  message?: string
  data?: unknown
  headers?: Record<string, string>
  config?: AxiosRequestConfig
}): AxiosErrorLike => {
  const error = new Error(message || 'Request failed') as AxiosErrorLike
  error.name = 'AxiosError'
  error.code = code
  error.config = config
  error.isAxiosError = true

  if (typeof status === 'number') {
    error.response = {
      status,
      statusText: status >= 400 ? 'Error' : 'OK',
      data,
      headers,
      config,
    }
  }

  return error
}

export const httpErrors = {
  ok: () => createAxiosResponse({ success: true }),
  unauthorized: () => createAxiosError({ status: 401 }),
  forbidden: () => createAxiosError({ status: 403 }),
  notFound: () => createAxiosError({ status: 404 }),
  serverError: () => createAxiosError({ status: 500 }),
  timeout: () => createAxiosError({ code: 'ECONNABORTED', message: 'timeout of 1000ms exceeded' }),
  network: () => createAxiosError({ code: 'ERR_NETWORK', message: 'Network Error' }),
}

export const expectAxiosRequest = (
  mockFn: { mock: { calls: unknown[][] } },
  expected: {
    url: string
    data?: unknown
    params?: unknown
    headers?: Record<string, string>
  }
) => {
  const calls = mockFn.mock.calls
  expect(calls.length).toBeGreaterThan(0)
  const [url, dataOrConfig, maybeConfig] = calls[calls.length - 1]
  const hasConfig = typeof maybeConfig !== 'undefined'
  const data = hasConfig ? dataOrConfig : undefined
  const config = (hasConfig ? maybeConfig : dataOrConfig) as AxiosRequestConfig | undefined

  expect(url).toBe(expected.url)

  if ('data' in expected) {
    expect(data).toEqual(expected.data)
  }

  if (expected.params) {
    expect(config?.params).toEqual(expected.params)
  }

  if (expected.headers) {
    expect(config?.headers).toEqual(expect.objectContaining(expected.headers))
  }
}
