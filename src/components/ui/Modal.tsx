
import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useFocusManagement } from '@/hooks/useFocusManagement'

interface ModalContextValue {
  titleId: string
  descriptionId: string
}

const ModalContext = React.createContext<ModalContextValue | null>(null)

const useModalContext = () => React.useContext(ModalContext)

const hasComponent = (nodes: React.ReactNode, component: React.ElementType): boolean => {
  return React.Children.toArray(nodes).some((child) => {
    if (!React.isValidElement(child)) return false
    if (child.type === component) return true
    const childProps = child.props as { children?: React.ReactNode }
    if (childProps?.children) {
      return hasComponent(childProps.children, component)
    }
    return false
  })
}

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

export const Modal = ({ isOpen, onClose, children, className }: ModalProps) => {
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useFocusTrap<HTMLDivElement>(isOpen)
  const { saveFocus, restoreFocus } = useFocusManagement()
  const titleId = React.useId()
  const descriptionId = React.useId()
  const hasTitle = React.useMemo(() => hasComponent(children, ModalTitle), [children])
  const hasDescription = React.useMemo(() => hasComponent(children, ModalDescription), [children])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) {
      restoreFocus()
      return
    }

    saveFocus()

    const focusFirstElement = () => {
      const container = contentRef.current
      if (!container) return

      const focusable = container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusable[0] || container
      firstElement.focus()
    }

    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(focusFirstElement)
    } else {
      focusFirstElement()
    }
  }, [contentRef, isOpen, restoreFocus, saveFocus])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose()
    }
  }

  if (!isOpen) return null

  // Use createPortal to render specificially at the end of the body
  // Check if document is defined (for SSR safety)
  if (typeof document === 'undefined') return null

  return createPortal(
    <ModalContext.Provider value={{ titleId, descriptionId }}>
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm transition-all animate-in fade-in duration-200 sm:p-4"
        onClick={handleOverlayClick}
      >
        <div
          ref={contentRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={hasTitle ? titleId : undefined}
          aria-describedby={hasDescription ? descriptionId : undefined}
          tabIndex={-1}
          className={cn(
            'relative flex w-full max-w-lg scale-100 flex-col gap-4 overflow-hidden rounded-lg border bg-white p-4 shadow-lg duration-200 dark:border-gray-800 dark:bg-gray-900 animate-in zoom-in-95 fade-in-0 sm:max-h-[calc(100dvh-2rem)] sm:p-6 sm:rounded-lg',
            className
          )}
        >
          <button
            onClick={onClose}
            aria-label="Fechar modal"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-gray-100 data-[state=open]:text-gray-500 dark:ring-offset-gray-950 dark:focus:ring-gray-300 dark:data-[state=open]:bg-gray-800 dark:data-[state=open]:text-gray-400"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar modal</span>
          </button>
          {children}
        </div>
      </div>
    </ModalContext.Provider>,
    document.body
  )
}

export const ModalHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col space-y-1.5 text-center sm:text-left mb-4', className)}
    {...props}
  />
)

export const ModalFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6',
      className
    )}
    {...props}
  />
)

export const ModalTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => {
  const context = useModalContext()

  return (
    <h2
      id={props.id || context?.titleId}
      className={cn(
        'text-lg font-semibold leading-none tracking-tight text-gray-900 dark:text-gray-100',
        className
      )}
      {...props}
    />
  )
}

export const ModalDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => {
  const context = useModalContext()

  return (
    <p
      id={props.id || context?.descriptionId}
      className={cn('text-sm text-gray-500 dark:text-gray-400', className)}
      {...props}
    />
  )
}
