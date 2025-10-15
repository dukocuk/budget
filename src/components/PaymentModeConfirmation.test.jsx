/**
 * Tests for PaymentModeConfirmation component
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaymentModeConfirmation } from './PaymentModeConfirmation'

describe('PaymentModeConfirmation', () => {
  it('should not render when isOpen is false', () => {
    const { container } = render(
      <PaymentModeConfirmation
        isOpen={false}
        mode="fixed"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('should render with fixed mode message', () => {
    render(
      <PaymentModeConfirmation
        isOpen={true}
        mode="fixed"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    expect(screen.getByText('💰 Skift til fast beløb?')).toBeInTheDocument()
    expect(screen.getByText(/Dine variable månedlige beløb vil blive nulstillet/)).toBeInTheDocument()
  })

  it('should render with variable mode message', () => {
    render(
      <PaymentModeConfirmation
        isOpen={true}
        mode="variable"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    expect(screen.getByText('💰 Skift til variabel beløb?')).toBeInTheDocument()
    expect(screen.getByText(/Alle måneder vil blive initialiseret med det aktuelle faste beløb/)).toBeInTheDocument()
  })

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()

    render(
      <PaymentModeConfirmation
        isOpen={true}
        mode="fixed"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    )

    await user.click(screen.getByText('Annuller'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('should call onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()

    render(
      <PaymentModeConfirmation
        isOpen={true}
        mode="variable"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    )

    await user.click(screen.getByText('Bekræft'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('should call onCancel when clicking overlay', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()

    render(
      <PaymentModeConfirmation
        isOpen={true}
        mode="fixed"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    )

    const overlay = screen.getByText('💰 Skift til fast beløb?').closest('.modal-overlay')
    await user.click(overlay)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('should not call onCancel when clicking modal content', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()

    render(
      <PaymentModeConfirmation
        isOpen={true}
        mode="fixed"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    )

    const modalContent = screen.getByText('💰 Skift til fast beløb?').closest('.modal-content')
    await user.click(modalContent)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('should have cancel and confirm buttons', () => {
    render(
      <PaymentModeConfirmation
        isOpen={true}
        mode="fixed"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    expect(screen.getByText('Annuller')).toBeInTheDocument()
    expect(screen.getByText('Bekræft')).toBeInTheDocument()
  })
})
