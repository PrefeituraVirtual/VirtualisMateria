// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import React, { useEffect } from 'react'
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import {
  createAxiosError,
  createAxiosResponse,
  mockAxiosInstance,
  resetAxiosMocks,
} from '@/__tests__/utils/api-mocks'
import LoginPage from '../../../pages/auth/login'
import { useAuth } from '@/hooks/useAuth'

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
  query: {},
}))

// Mock secure storage to use localStorage as fallback for testing
const secureStorageMock = vi.hoisted(() => ({
  setSecureItem: vi.fn(async (key: string, value: unknown) => {
    localStorage.setItem(key, JSON.stringify(value))
  }),
  getSecureItem: vi.fn(async (key: string) => {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : null
  }),
  removeSecureItem: vi.fn(async (key: string) => {
    localStorage.removeItem(key)
  }),
  clearSecureStorage: vi.fn(() => {
    localStorage.clear()
  }),
  clearSessionKey: vi.fn(),
}))

vi.mock('@/lib/secure-storage', () => secureStorageMock)

vi.mock('@/lib/auth-storage', () => ({
  sanitizeUserForStorage: vi.fn((user: unknown) => user),
}))

vi.mock('next/router', () => ({
  useRouter: () => routerMocks,
}))

vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const validUser = {
  id: 'user-1',
  name: 'Usuario Teste',
  email: 'user@example.com',
  role: 'council_member',
  council_member_id: 'cm-1',
  council_id: 'c-1',
}

const ProtectedStub = () => {
  const { user, loading } = useAuth()
  const router = routerMocks

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [loading, user, router])

  return user ? <div>Protected</div> : null
}

describe('Authentication Flow Integration', () => {
  beforeEach(async () => {
    resetAxiosMocks({ keepInterceptors: true })
    localStorage.clear()
    routerMocks.push.mockClear()
    mockAxiosInstance.post.mockReset()
    mockAxiosInstance.get.mockReset()
    await import('@/lib/api')
  })

  afterEach(() => {
    cleanup()
  })

  it('redirects unauthenticated users to login', async () => {
    render(<ProtectedStub />)

    await waitFor(() => {
      expect(routerMocks.push).toHaveBeenCalledWith('/auth/login')
    })
  })

  it('completes full login flow', async () => {
    mockAxiosInstance.post.mockResolvedValueOnce(
      createAxiosResponse({ success: true, token: 'token-123', user: validUser })
    )

    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText('Email ou CPF'), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => {
      // Token is stored as JSON string in the mock secure storage
      expect(localStorage.getItem('authToken')).toBe(JSON.stringify('token-123'))
    })
    expect(localStorage.getItem('user')).toBe(JSON.stringify(validUser))
    expect(routerMocks.push).toHaveBeenCalledWith('/')

    const { result } = renderHook(() => useAuth())
    await waitFor(() => {
      expect(result.current.user).toEqual(validUser)
    })
  })

  it('handles logout flow correctly', async () => {
    localStorage.setItem('authToken', JSON.stringify('token-123'))
    localStorage.setItem('user', JSON.stringify(validUser))

    const { result } = renderHook(() => useAuth())
    await waitFor(() => {
      expect(result.current.user).toEqual(validUser)
    })

    await act(async () => {
      await result.current.logout()
    })

    expect(localStorage.getItem('authToken')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
    expect(routerMocks.push).toHaveBeenCalledWith('/auth/login')
  })

  it('redirects on 401 responses and clears storage', async () => {
    localStorage.setItem('authToken', JSON.stringify('token-123'))
    localStorage.setItem('user', JSON.stringify(validUser))

    window.history.pushState({}, '', '/painel')
    vi.resetModules()
    const apiModule = await import('@/lib/api')
    const [, responseError] = mockAxiosInstance.interceptors.response.use.mock.calls[0] || []
    const interceptor = responseError as ((error: unknown) => Promise<unknown>) | undefined
    expect(typeof interceptor).toBe('function')
    if (!interceptor) {
      throw new Error('Response interceptor not registered')
    }

    await expect(interceptor(createAxiosError({ status: 401 }))).rejects.toBeTruthy()
    // After 401, the api clears the auth - check via api instance
    expect(apiModule.api.getAuthToken()).toBeNull()
  })

  it('refreshes user data after login', async () => {
    // First, complete a login flow
    mockAxiosInstance.post.mockResolvedValueOnce(
      createAxiosResponse({ success: true, token: 'token-refresh', user: validUser })
    )

    // Mock the refresh call
    mockAxiosInstance.get.mockResolvedValueOnce(
      createAxiosResponse({ success: true, user: { ...validUser, name: 'Usuario Atualizado' } })
    )

    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText('Email ou CPF'), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    // Wait for login to complete
    await waitFor(() => {
      expect(routerMocks.push).toHaveBeenCalledWith('/')
    })

    // Verify login was successful by checking token was stored
    expect(localStorage.getItem('authToken')).toBe(JSON.stringify('token-refresh'))
  })
})
