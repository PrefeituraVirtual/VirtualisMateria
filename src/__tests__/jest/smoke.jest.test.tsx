// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/Button'

describe('jest smoke', () => {
  it('renders a button', () => {
    render(<Button>Confirmar</Button>)
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument()
  })
})
