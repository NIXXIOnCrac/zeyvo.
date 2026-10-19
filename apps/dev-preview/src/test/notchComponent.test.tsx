import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Notch from '../components/Notch'

describe('Notch component', () => {
  it('renders idle pill with Zeyvo text', () => {
    render(<Notch />)
    expect(screen.getByText(/Zeyvo/)).toBeInTheDocument()
  })
  it('shows keyboard shortcut hint on pill', () => {
    render(<Notch />)
    expect(screen.getByText(/⌘/)).toBeInTheDocument()
  })
  it('expands on click', async () => {
    render(<Notch />)
    // pill is the outermost motion.div — click it
    const pill = document.querySelector('.notch-glass') as HTMLElement
    expect(pill).toBeTruthy()
    fireEvent.click(pill)
    // after click, should show input placeholder
    // give animation time
    await new Promise(r=>setTimeout(r, 500))
    expect(screen.getByPlaceholderText(/Ask Zeyvo/)).toBeInTheDocument()
  })
})
