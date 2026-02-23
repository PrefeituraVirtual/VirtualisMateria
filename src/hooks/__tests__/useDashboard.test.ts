// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useDashboard } from '@/hooks/useDashboard'

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

const authServiceMocks = vi.hoisted(() => ({
  isAuthenticated: vi.fn(),
}))

const axiosMocks = vi.hoisted(() => ({
  isAxiosError: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: apiMocks,
  authService: authServiceMocks,
}))

vi.mock('axios', () => ({
  default: axiosMocks,
  isAxiosError: axiosMocks.isAxiosError,
}))

const statsResponse = {
  success: true,
  data: {
    materiasCriadas: 4,
    emTramitacao: 2,
    aprovadas: 1,
    documentosSalvos: 3,
  },
}

const activitiesResponse = {
  success: true,
  data: [
    { id: '1', type: 'materia', title: 'Materia 1', description: 'Desc', date: '2024-01-01' },
    { id: '2', type: 'chat', title: 'Chat', description: 'Msg', date: '2024-01-02' },
    { id: '3', type: 'document', title: 'Doc', description: 'Doc', date: '2024-01-03' },
  ],
  pagination: { page: 1, limit: 5, total: 10, totalPages: 2 },
}

describe('useDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authServiceMocks.isAuthenticated.mockReturnValue(true)
    axiosMocks.isAxiosError.mockReturnValue(false)
    apiMocks.get.mockImplementation((url: string) => {
      if (url.includes('/api/dashboard/stats')) {
        return Promise.resolve(statsResponse)
      }
      if (url.includes('/api/dashboard/activities')) {
        return Promise.resolve(activitiesResponse)
      }
      return Promise.resolve({ success: false })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not fetch data when unauthenticated', async () => {
    authServiceMocks.isAuthenticated.mockReturnValue(false)
    const { result } = renderHook(() => useDashboard())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(apiMocks.get).not.toHaveBeenCalled()
  })

  it('fetches dashboard data on mount', async () => {
    const { result } = renderHook(() => useDashboard())

    await waitFor(() => {
      expect(result.current.stats).toEqual(statsResponse.data)
      expect(result.current.activities).toHaveLength(3)
      expect(result.current.pagination.totalPages).toBe(2)
    })

    expect(result.current.activities[0]?.icon).toBe('FileText')
    expect(result.current.activities[1]?.icon).toBe('MessageCircle')
    expect(result.current.activities[2]?.icon).toBe('Download')
  })

  it('handles axios errors with response message', async () => {
    authServiceMocks.isAuthenticated.mockReturnValue(true)
    const axiosError = { response: { data: { message: 'Erro do backend' } } }
    apiMocks.get.mockRejectedValueOnce(axiosError)
    axiosMocks.isAxiosError.mockReturnValue(true)

    const { result } = renderHook(() => useDashboard())
    await waitFor(() => {
      expect(result.current.error).toBe('Erro do backend')
    })
  })

  it('handles generic errors with fallback message', async () => {
    apiMocks.get.mockRejectedValueOnce(new Error('fail'))
    axiosMocks.isAxiosError.mockReturnValue(false)

    const { result } = renderHook(() => useDashboard())
    await waitFor(() => {
      expect(result.current.error).toBe('Failed to load dashboard data')
    })
  })

  it('changes page when valid and refetches data', async () => {
    const { result } = renderHook(() => useDashboard())

    await waitFor(() => {
      expect(result.current.pagination.totalPages).toBe(2)
    })

    act(() => {
      result.current.changePage(2)
    })

    await waitFor(() => {
      expect(apiMocks.get).toHaveBeenCalledWith('/api/dashboard/activities?page=2&limit=5')
    })
  })

  it('does not change page when invalid', async () => {
    const { result } = renderHook(() => useDashboard())

    await waitFor(() => {
      expect(result.current.pagination.totalPages).toBe(2)
    })

    act(() => {
      result.current.changePage(0)
    })

    expect(apiMocks.get).toHaveBeenCalledTimes(2)

    act(() => {
      result.current.changePage(99)
    })

    expect(apiMocks.get).toHaveBeenCalledTimes(2)
  })

  it('refetch triggers new requests', async () => {
    const { result } = renderHook(() => useDashboard())

    await waitFor(() => {
      expect(result.current.stats).toEqual(statsResponse.data)
    })

    act(() => {
      result.current.refetch()
    })

    await waitFor(() => {
      expect(apiMocks.get).toHaveBeenCalledTimes(4)
    })
  })
})
