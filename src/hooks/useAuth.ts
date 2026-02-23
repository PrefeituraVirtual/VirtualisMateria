import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { User } from '@/types/auth'
import { authService } from '@/lib/api'
import {
  setSecureItem,
  getSecureItem,
} from '@/lib/secure-storage'
import { sanitizeUserForStorage } from '@/lib/auth-storage'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isUser = (value: unknown): value is User => {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.email === 'string' &&
    typeof value.role === 'string' &&
    typeof value.council_member_id === 'string' &&
    typeof value.council_id === 'string'
  )
}

/**
 * Secure storage key
 */
const USER_DATA_KEY = 'user'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const checkAuth = useCallback(async (): Promise<void> => {
    try {
      // Wait for Auth Service (ApiClient) to initialize tokens from Secure Storage
      await authService.waitForInit()

      const isAuth = authService.isAuthenticated()
      if (isAuth) {
        // Try to get user from secure storage first
        const secureUserData = await getSecureItem<User>(USER_DATA_KEY)
        console.log('[useAuth] Secure storage user:', secureUserData);
        
        if (secureUserData && isUser(secureUserData)) {
          setUser(secureUserData)
        } else {
          // Fallback to cached memory user (Critical for SPA transitions)
          const memoryUser = authService.getUser();
          console.log('[useAuth] Memory cached user:', memoryUser);
          
          if (isUser(memoryUser)) {
            setUser(memoryUser)
            // Attempt to restore to secure storage
             await setSecureItem(USER_DATA_KEY, sanitizeUserForStorage(memoryUser))
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error checking auth:', error.message)
      } else {
        console.error('Error checking auth:', error)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async (token: string, userData: User): Promise<boolean> => {
    try {
      // Store credentials in secure encrypted storage via authService
      // authService.login now handles both cache update and secure storage
      await authService.login(token, userData)

      setUser(userData)
      return true
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Erro ao fazer login:', error.message)
      } else {
        console.error('Erro ao fazer login:', error)
      }
      return false
    }
  }

  const logout = async (): Promise<void> => {
    // Clear all auth data from cache and secure storage via authService
    // authService.logout now handles clearing both cache and secure storage
    await authService.logout()

    setUser(null)
    router.push('/auth/login')
  }

  const refreshUser = async (): Promise<User | null> => {
    try {
      const response = await authService.getMe()

      if (response?.success && isUser(response.user)) {
        // Update user in secure storage
        await setSecureItem(
          USER_DATA_KEY,
          sanitizeUserForStorage(response.user),
          { ttl: 24 * 60 * 60 * 1000 }
        )

        setUser(response.user)
        return response.user
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error refreshing user data:', error.message)
      } else {
        console.error('Error refreshing user data:', error)
      }
    }
    return null
  }

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    checkAuth,
    refreshUser
  }
}
