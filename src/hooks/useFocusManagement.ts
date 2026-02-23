import { useCallback, useRef } from 'react'

export const useFocusManagement = () => {
  const lastFocusedRef = useRef<HTMLElement | null>(null)

  const saveFocus = useCallback(() => {
    if (typeof document === 'undefined') return
    const activeElement = document.activeElement
    lastFocusedRef.current = activeElement instanceof HTMLElement ? activeElement : null
  }, [])

  const restoreFocus = useCallback(() => {
    if (lastFocusedRef.current) {
      lastFocusedRef.current.focus()
      lastFocusedRef.current = null
    }
  }, [])

  return { saveFocus, restoreFocus }
}
