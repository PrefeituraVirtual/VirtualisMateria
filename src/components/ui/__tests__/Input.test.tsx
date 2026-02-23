// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Input, Textarea } from '@/components/ui/Input'

describe('Input', () => {
  const typeCases = ['text', 'email', 'password', 'number'] as const

  it('renders with label, placeholder, and type', () => {
    render(<Input label="Email" placeholder="Digite seu email" type="email" />)
    const input = screen.getByPlaceholderText('Digite seu email') as HTMLInputElement
    const label = screen.getByText('Email')

    expect(label.getAttribute('for')).toBe(input.id)
    expect(input.type).toBe('email')
  })

  typeCases.forEach((type) => {
    it(`supports input type ${type}`, () => {
      render(<Input label={`Campo ${type}`} type={type} />)
      const input = screen.getByLabelText(`Campo ${type}`) as HTMLInputElement
      expect(input.type).toBe(type)
    })
  })

  it('renders icon and endIcon with aria-hidden', () => {
    render(
      <Input
        icon={<span data-testid="icon" />}
        endIcon={<span data-testid="end-icon" />}
      />
    )

    const icon = screen.getByTestId('icon')
    const endIcon = screen.getByTestId('end-icon')
    expect(icon.parentElement?.getAttribute('aria-hidden')).toBe('true')
    expect(endIcon.parentElement?.getAttribute('aria-hidden')).toBe('true')
  })

  it('shows error state with aria attributes', () => {
    render(<Input label="Nome" error="Campo obrigatorio" />)
    const input = screen.getByLabelText('Nome') as HTMLInputElement
    const error = screen.getByText('Campo obrigatorio')

    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.className).toContain('border-red-500')
    expect(input.getAttribute('aria-describedby')).toBe(error.id)
  })

  it('supports required fields and custom describedBy', () => {
    render(<Input label="CPF" required aria-describedby="custom-id" error="Erro" />)
    const input = screen.getByLabelText('CPF') as HTMLInputElement
    const describedBy = input.getAttribute('aria-describedby') || ''

    expect(input.required).toBe(true)
    expect(input.getAttribute('aria-required')).toBe('true')
    expect(describedBy).toContain('custom-id')
    expect(describedBy).toContain('-error')
  })

  it('supports disabled state', () => {
    render(<Input label="Nome" disabled />)
    const input = screen.getByLabelText('Nome') as HTMLInputElement
    expect(input.disabled).toBe(true)
  })

  it('calls onChange, onFocus, and onBlur', () => {
    const onChange = vi.fn()
    const onFocus = vi.fn()
    const onBlur = vi.fn()

    render(<Input label="Nome" onChange={onChange} onFocus={onFocus} onBlur={onBlur} />)
    const input = screen.getByLabelText('Nome') as HTMLInputElement

    fireEvent.change(input, { target: { value: 'Teste' } })
    fireEvent.focus(input)
    fireEvent.blur(input)

    expect(onChange).toHaveBeenCalled()
    expect(onFocus).toHaveBeenCalled()
    expect(onBlur).toHaveBeenCalled()
  })
})

describe('Textarea', () => {
  it('renders with label and associates htmlFor', () => {
    render(<Textarea label="Observacoes" />)
    const textarea = screen.getByLabelText('Observacoes') as HTMLTextAreaElement
    const label = screen.getByText('Observacoes')

    expect(label.getAttribute('for')).toBe(textarea.id)
  })

  it('sets aria-multiline and resize behavior', () => {
    render(<Textarea label="Mensagem" />)
    const textarea = screen.getByLabelText('Mensagem') as HTMLTextAreaElement

    expect(textarea.getAttribute('aria-multiline')).toBe('true')
    expect(textarea.className).toContain('resize-vertical')
  })

  it('shows error state with aria-describedby', () => {
    render(<Textarea label="Mensagem" error="Erro" />)
    const textarea = screen.getByLabelText('Mensagem') as HTMLTextAreaElement
    const error = screen.getByText('Erro')

    expect(textarea.getAttribute('aria-invalid')).toBe('true')
    expect(textarea.getAttribute('aria-describedby')).toBe(error.id)
  })
})
