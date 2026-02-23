import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectOption {
  value: string
  label: React.ReactNode
  disabled?: boolean
  id: string
}

interface SelectContextValue {
  value?: string
  onValueChange?: (value: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  activeIndex: number
  setActiveIndex: (index: number) => void
  options: SelectOption[]
  listboxId: string
  triggerId: string
  rootRef: React.MutableRefObject<HTMLDivElement | null>
  triggerRef: React.MutableRefObject<HTMLButtonElement | null>
  contentRef: React.MutableRefObject<HTMLDivElement | null>
  placeholder?: string
  setPlaceholder: (placeholder?: string) => void
  ariaLabel?: string
  ariaLabelledBy?: string
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

const useSelectContext = () => {
  const context = React.useContext(SelectContext)
  if (!context) {
    throw new Error('Select components must be used within Select')
  }
  return context
}

const collectOptions = (nodes: React.ReactNode): Omit<SelectOption, 'id'>[] => {
  const items: Omit<SelectOption, 'id'>[] = []

  React.Children.forEach(nodes, (child) => {
    if (!React.isValidElement(child)) return

    if (child.type === SelectItem) {
      const { value, children, disabled } = child.props as SelectItemProps
      items.push({ value, label: children, disabled })
      return
    }

    const childProps = child.props as { children?: React.ReactNode }
    if (childProps?.children) {
      items.push(...collectOptions(childProps.children))
    }
  })

  return items
}

const findNextEnabledIndex = (options: SelectOption[], startIndex: number, direction: 1 | -1) => {
  if (options.length === 0) return -1

  let index = startIndex
  for (let i = 0; i < options.length; i += 1) {
    index = (index + direction + options.length) % options.length
    if (!options[index].disabled) return index
  }

  return -1
}

export interface SelectProps {
  children: React.ReactNode
  value?: string
  onValueChange?: (value: string) => void
  'aria-label'?: string
  'aria-labelledby'?: string
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode
}

interface SelectValueProps {
  placeholder?: string
  className?: string
}

interface SelectContentProps {
  children: React.ReactNode
  className?: string
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
  disabled?: boolean
  className?: string
  index?: number
  id?: string
}

const Select = ({ children, value, onValueChange, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy }: SelectProps) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(-1)
  const [placeholder, setPlaceholder] = React.useState<string | undefined>(undefined)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const instanceId = React.useId()
  const listboxId = `select-listbox-${instanceId}`
  const triggerId = `select-trigger-${instanceId}`

  const rawOptions = React.useMemo(() => collectOptions(children), [children])
  const options = React.useMemo(
    () => rawOptions.map((option, index) => ({ ...option, id: `${listboxId}-option-${index}` })),
    [listboxId, rawOptions]
  )

  React.useEffect(() => {
    if (!isOpen) return

    const selectedIndex = options.findIndex(option => option.value === value)
    if (selectedIndex >= 0 && !options[selectedIndex]?.disabled) {
      setActiveIndex(selectedIndex)
      return
    }

    const nextIndex = findNextEnabledIndex(options, -1, 1)
    setActiveIndex(nextIndex)
  }, [isOpen, options, value])

  React.useEffect(() => {
    if (!isOpen) return

    const handleOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isOpen])

  return (
    <SelectContext.Provider
      value={{
        value,
        onValueChange,
        isOpen,
        setIsOpen,
        activeIndex,
        setActiveIndex,
        options,
        listboxId,
        triggerId,
        rootRef,
        triggerRef,
        contentRef,
        placeholder,
        setPlaceholder,
        ariaLabel,
        ariaLabelledBy
      }}
    >
      <div ref={rootRef} className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({
    className,
    children,
    'aria-label': ariaLabelProp,
    'aria-labelledby': ariaLabelledByProp,
    onClick,
    onKeyDown,
    ...props
  }, ref) => {
    const {
      value,
      onValueChange,
      isOpen,
      setIsOpen,
      activeIndex,
      setActiveIndex,
      options,
      listboxId,
      triggerId,
      triggerRef,
      placeholder,
      ariaLabel,
      ariaLabelledBy
    } = useSelectContext()

    const selectedOption = options.find(option => option.value === value)
    const fallbackLabel =
      placeholder ||
      (typeof selectedOption?.label === 'string' ? selectedOption.label : 'Selecionar opção')

    const resolvedAriaLabelledBy = ariaLabelledByProp || ariaLabelledBy
    const resolvedAriaLabel =
      ariaLabelProp || ariaLabel || (resolvedAriaLabelledBy ? undefined : fallbackLabel)

    const activeOption = options[activeIndex]

    const setRefs = React.useCallback(
      (node: HTMLButtonElement | null) => {
        triggerRef.current = node
        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
      },
      [ref, triggerRef]
    )

    const handleSelect = (index: number) => {
      const option = options[index]
      if (!option || option.disabled) return

      onValueChange?.(option.value)
      setIsOpen(false)
      setActiveIndex(index)
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
      onKeyDown?.(event)
      if (event.defaultPrevented) return

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const direction = event.key === 'ArrowDown' ? 1 : -1
        const nextIndex = findNextEnabledIndex(options, activeIndex, direction)
        setIsOpen(true)
        if (nextIndex >= 0) {
          setActiveIndex(nextIndex)
        }
        return
      }

      if (event.key === 'Home') {
        event.preventDefault()
        const nextIndex = findNextEnabledIndex(options, -1, 1)
        setIsOpen(true)
        if (nextIndex >= 0) {
          setActiveIndex(nextIndex)
        }
        return
      }

      if (event.key === 'End') {
        event.preventDefault()
        const nextIndex = findNextEnabledIndex(options, options.length, -1)
        setIsOpen(true)
        if (nextIndex >= 0) {
          setActiveIndex(nextIndex)
        }
        return
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
          return
        }
        handleSelect(activeIndex)
        return
      }

      if (event.key === 'Escape' && isOpen) {
        event.preventDefault()
        setIsOpen(false)
      }
    }

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      if (event.defaultPrevented) return
      setIsOpen(!isOpen)
    }

    return (
      <button
        type="button"
        id={triggerId}
        ref={setRefs}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={isOpen && activeOption ? activeOption.id : undefined}
        aria-label={resolvedAriaLabel}
        aria-labelledby={resolvedAriaLabelledBy}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      >
        <span className="truncate">
          {children}
        </span>
        <ChevronDown className="ml-2 h-4 w-4 text-gray-500" aria-hidden="true" />
      </button>
    )
  }
)
SelectTrigger.displayName = 'SelectTrigger'

const SelectValue: React.FC<SelectValueProps> = ({ placeholder, className }) => {
  const { value, options, setPlaceholder } = useSelectContext()

  React.useEffect(() => {
    setPlaceholder(placeholder)
  }, [placeholder, setPlaceholder])

  const selectedOption = options.find(option => option.value === value)
  const displayValue = selectedOption?.label || placeholder || ''

  return <span className={className}>{displayValue}</span>
}

const SelectContent: React.FC<SelectContentProps> = ({ children, className }) => {
  const { isOpen, listboxId, triggerId, contentRef } = useSelectContext()

  if (!isOpen) return null

  let itemIndex = -1

  const renderItems = (nodes: React.ReactNode): React.ReactNode => {
    return React.Children.map(nodes, (child) => {
      if (!React.isValidElement(child)) return child

      if (child.type === SelectItem) {
        itemIndex += 1
        return React.cloneElement(child as React.ReactElement<SelectItemProps>, {
          id: `${listboxId}-option-${itemIndex}`,
          index: itemIndex
        })
      }

      const childProps = child.props as { children?: React.ReactNode }
      if (childProps?.children) {
        return React.cloneElement(child as React.ReactElement<{ children?: React.ReactNode }>, {
          children: renderItems(childProps.children)
        })
      }

      return child
    })
  }

  return (
    <div
      ref={contentRef}
      role="listbox"
      id={listboxId}
      aria-labelledby={triggerId}
      tabIndex={-1}
      className={cn(
        'absolute z-50 mt-2 w-full rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900',
        className
      )}
    >
      <div className="max-h-60 overflow-auto py-1">{renderItems(children)}</div>
    </div>
  )
}

const SelectItem: React.FC<SelectItemProps> = ({ value, children, disabled, className, index = -1, id }) => {
  const {
    value: selectedValue,
    onValueChange,
    setIsOpen,
    activeIndex,
    setActiveIndex
  } = useSelectContext()

  const isSelected = selectedValue === value
  const isActive = activeIndex === index

  const handleSelect = () => {
    if (disabled) return
    onValueChange?.(value)
    setIsOpen(false)
  }

  return (
    <div
      id={id}
      role="option"
      aria-selected={isSelected}
      aria-disabled={disabled ? true : undefined}
      onClick={handleSelect}
      onMouseMove={() => {
        if (!disabled) setActiveIndex(index)
      }}
      className={cn(
        'cursor-pointer select-none px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800',
        isActive && 'bg-gray-100 dark:bg-gray-800',
        isSelected && 'font-semibold text-gray-900 dark:text-gray-100',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      {children}
    </div>
  )
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
