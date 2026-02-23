// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/Button'

describe('Button', () => {
  const variantCases = [
    ['primary', 'from-blue-600'],
    ['secondary', 'bg-white/80'],
    ['outline', 'border-2'],
    ['ghost', 'hover:bg-gray-100/50'],
    ['danger', 'from-red-600'],
    ['premium', 'from-virtualis-gold-500'],
  ] as const

  const sizeCases = [
    ['sm', 'px-3'],
    ['md', 'px-5'],
    ['lg', 'px-8'],
  ] as const

  it('renders with text and custom className', () => {
    render(<Button className="custom-class">Salvar</Button>)
    const button = screen.getByRole('button', { name: 'Salvar' })
    expect(button).toBeTruthy()
    expect(button.className).toContain('custom-class')
  })

  variantCases.forEach(([variant, className]) => {
    it(`applies variant ${variant} classes`, () => {
      render(<Button variant={variant}>Action</Button>)
      const button = screen.getByRole('button', { name: 'Action' })
      expect(button.className).toContain(className)
    })
  })

  sizeCases.forEach(([size, className]) => {
    it(`applies size ${size} classes`, () => {
      render(<Button size={size}>Action</Button>)
      const button = screen.getByRole('button', { name: 'Action' })
      expect(button.className).toContain(className)
    })
  })

  it('shows loading state and disables interaction', () => {
    const onClick = vi.fn()
    render(
      <Button isLoading loadingText="Processando" onClick={onClick}>
        Enviar
      </Button>
    )

    const button = screen.getByRole('button', { name: /Processando/i })
    const spinner = button.querySelector('svg[role="status"]')
    expect(button.getAttribute('aria-busy')).toBe('true')
    expect((button as HTMLButtonElement).disabled).toBe(true)
    expect(spinner).not.toBeNull()
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('disables button and prevents onClick when disabled', () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Remover
      </Button>
    )

    const button = screen.getByRole('button', { name: 'Remover' })
    expect(button.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('sets aria-label automatically for icon-only buttons', () => {
    render(
      <Button title="Menu">
        <svg data-testid="icon" />
      </Button>
    )
    const button = screen.getByRole('button')
    expect(button.getAttribute('aria-label')).toBe('Menu')
    expect(button.getAttribute('title')).toBe('Menu')
  })

  it('respects aria-labelledby when provided', () => {
    render(
      <>
        <span id="label-id">Custom</span>
        <Button aria-labelledby="label-id">
          <svg data-testid="icon" />
        </Button>
      </>
    )
    const button = screen.getByRole('button')
    expect(button.getAttribute('aria-labelledby')).toBe('label-id')
    expect(button.getAttribute('aria-label')).toBeNull()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Executar</Button>)
    fireEvent.click(screen.getByRole('button', { name: 'Executar' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
