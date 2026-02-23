import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'

/**
 * Hook to check if the current user has admin permissions
 *
 * @returns Object with isAdmin boolean and loading state
 *
 * @example
 * const { isAdmin, loading } = useIsAdmin()
 * if (isAdmin) {
 *   // Show admin features
 * }
 */
export function useIsAdmin() {
  const { user, refreshUser } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // If no user, definitely not admin
    if (!user) {
      setIsAdmin(false)
      setLoading(false)
      return
    }

    // If we have the isAdmin flag, use it
    if (user.isAdmin !== undefined) {
      setIsAdmin(user.isAdmin)
      setLoading(false)
    } else {
      // If flag is missing (legacy session), fetch updated profile
      // This avoids probing protected endpoints that cause 403s
      refreshUser()
        .then(updatedUser => {
          setIsAdmin(!!updatedUser?.isAdmin)
        })
        .catch(err => {
            console.error('Failed to refresh user for admin check', err)
            setIsAdmin(false) 
        })
        .finally(() => setLoading(false))
    }
  }, [user, refreshUser])

  return { isAdmin, loading }
}
