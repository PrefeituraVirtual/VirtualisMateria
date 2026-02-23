// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { setupLocalStorageMock } from '@/__tests__/utils/api-mocks'
import { useAuth } from '@/hooks/useAuth'
import type { User } from '@/types/auth'

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
}))

const authServiceMocks = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  getUser: vi.fn(),
  isAuthenticated: vi.fn(),
  getMe: vi.fn(),
}))

vi.mock('next/router', () => ({
  useRouter: () => ({ push: routerMocks.push, pathname: '/' }),
}))

vi.mock('@/lib/api', () => ({
  authService: authServiceMocks,
}))

const validUser: User = {
  id: 'user-1',
  name: 'Usuario Teste',
  email: 'user@example.com',
  role: 'council_member',
  council_member_id: 'cm-1',
  council_id: 'c-1',
}

describe('useAuth', () => {
  beforeEach(() => {
    setupLocalStorageMock()
    vi.clearAllMocks()
    authServiceMocks.isAuthenticated.mockReturnValue(false)
    authServiceMocks.getUser.mockReturnValue(null)
    authServiceMocks.getMe.mockResolvedValue({ success: true, user: validUser })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('initializes with loading state and checks auth on mount', async () => {
    const { result } = renderHook(() => useAuth())
    await waitFor(() => {
      expect(authServiceMocks.isAuthenticated).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })

  it('sets user when authenticated with valid user data', async () => {
    authServiceMocks.isAuthenticated.mockReturnValue(true)
    authServiceMocks.getUser.mockReturnValue(validUser)

    const { result } = renderHook(() => useAuth())
    await waitFor(() => {
      expect(result.current.user).toEqual(validUser)
      expect(result.current.isAuthenticated).toBe(true)
    })
  })

  it('keeps user null when unauthenticated or invalid data', async () => {
    authServiceMocks.isAuthenticated.mockReturnValue(true)
    authServiceMocks.getUser.mockReturnValue('invalid-user')

    const { result } = renderHook(() => useAuth())
    await waitFor(() => {
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  it('logs in successfully and updates state', async () => {
    const { result } = renderHook(() => useAuth())

    let success = false
    await act(async () => {
      success = await result.current.login('token-123', validUser)
    })
    expect(success).toBe(true)
    expect(authServiceMocks.login).toHaveBeenCalledWith('token-123', validUser)
    expect(result.current.user).toEqual(validUser)
  })

  it('handles login errors gracefully', async () => {
    authServiceMocks.login.mockRejectedValue(new Error('Login failed'))

    const { result } = renderHook(() => useAuth())
    let success = true
    await act(async () => {
      success = await result.current.login('token-123', validUser)
    })
    expect(success).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('logs out and redirects to login', async () => {
    authServiceMocks.isAuthenticated.mockReturnValue(true)
    authServiceMocks.getUser.mockReturnValue(validUser)

    const { result } = renderHook(() => useAuth())
    await waitFor(() => {
      expect(result.current.user).toEqual(validUser)
    })

    await act(async () => {
      await result.current.logout()
    })
    expect(authServiceMocks.logout).toHaveBeenCalled()
    expect(routerMocks.push).toHaveBeenCalledWith('/auth/login')
    expect(result.current.user).toBeNull()
  })

  it('refreshes user data and updates state', async () => {
    const { result } = renderHook(() => useAuth())
    // Wait for initial loading to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let refreshed = null
    await act(async () => {
      refreshed = await result.current.refreshUser()
    })

    expect(refreshed).toEqual(validUser)
    // Check that user state is updated
    expect(result.current.user).toEqual(validUser)
  })

  it('returns null when refresh fails', async () => {
    authServiceMocks.getMe.mockRejectedValue(new Error('fail'))
    const { result } = renderHook(() => useAuth())
    // Wait for initial loading to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    let refreshed: unknown = validUser
    await act(async () => {
      refreshed = await result.current.refreshUser()
    })
    expect(refreshed).toBeNull()
  })
})
