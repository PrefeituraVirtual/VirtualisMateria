import React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'premium'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  loadingText?: string
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    isLoading,
    loadingText,
    disabled,
    children,
    title,
    'aria-label': ariaLabelProp,
    'aria-labelledby': ariaLabelledByProp,
    ...props
  }, ref) => {
    const isDisabled = disabled || isLoading
    const hasTextContent = (nodes: React.ReactNode): boolean => {
      return React.Children.toArray(nodes).some((child) => {
        if (typeof child === 'string') return child.trim().length > 0
        if (typeof child === 'number') return true
        if (React.isValidElement(child)) {
          const element = child as React.ReactElement<{ children?: React.ReactNode }>
          return hasTextContent(element.props.children)
        }
        return false
      })
    }
    const childCount = React.Children.count(children)
    const isIconOnly = !isLoading && childCount > 0 && !hasTextContent(children)
    const computedAriaLabel = ariaLabelProp ?? (ariaLabelledByProp ? undefined : (isIconOnly ? title ?? 'Botão' : undefined))
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-lg'
    
    const variants = {
      primary: 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] border border-white/10 hover:border-virtualis-gold-400/30',
      premium: 'bg-gradient-to-r from-virtualis-gold-500 to-virtualis-gold-600 text-white shadow-lg shadow-virtualis-gold-500/25 hover:shadow-virtualis-gold-500/40 hover:scale-[1.02] active:scale-[0.98] border border-white/20',
      secondary: 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-virtualis-gold-500/20',
      outline: 'border-2 border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-virtualis-gold-500/50 hover:text-virtualis-gold-600 dark:hover:text-virtualis-gold-400',
      ghost: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 hover:text-virtualis-gold-600 dark:hover:text-virtualis-gold-400',
      danger: 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-[1.02]',
    }
    
    const sizes = {
      sm: 'px-3 py-1.5 text-sm rounded-lg',
      md: 'px-5 py-2.5 text-sm rounded-xl',
      lg: 'px-8 py-3.5 text-base rounded-xl',
    }
    
    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={isDisabled}
        aria-busy={isLoading ? true : undefined}
        aria-disabled={isDisabled ? true : undefined}
        aria-label={computedAriaLabel}
        aria-labelledby={ariaLabelledByProp}
        title={title}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              role="status"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {loadingText || 'Carregando...'}
          </>
        ) : children}
      </button>
    )
  }
)

Button.displayName = 'Button'
