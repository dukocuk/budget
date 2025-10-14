/**
 * Tests for AddExpenseModal component
 */

import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AddExpenseModal } from './AddExpenseModal'
import Modal from 'react-modal'

// Mock Modal.setAppElement to avoid warnings in tests
beforeAll(() => {
  const root = document.createElement('div')
  root.id = 'root'
  document.body.appendChild(root)
  Modal.setAppElement(root)
})

describe('AddExpenseModal', () => {
  const mockOnClose = vi.fn()
  const mockOnAdd = vi.fn()

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onAdd: mockOnAdd
  }

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render modal when open', () => {
      render(<AddExpenseModal {...defaultProps} />)

      expect(screen.getByText('➕ Tilføj ny udgift')).toBeInTheDocument()
    })

    it('should not render modal when closed', () => {
      render(<AddExpenseModal {...defaultProps} isOpen={false} />)

      expect(screen.queryByText('➕ Tilføj ny udgift')).not.toBeInTheDocument()
    })

    it('should render all form fields', () => {
      render(<AddExpenseModal {...defaultProps} />)

      expect(screen.getByLabelText(/Udgiftsnavn/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Beløb/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Frekvens/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Start måned/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Slut måned/)).toBeInTheDocument()
    })

    it('should render action buttons', () => {
      render(<AddExpenseModal {...defaultProps} />)

      expect(screen.getByText('Annuller')).toBeInTheDocument()
      expect(screen.getByText('➕ Tilføj udgift')).toBeInTheDocument()
    })

    it('should render close button', () => {
      render(<AddExpenseModal {...defaultProps} />)

      expect(screen.getByLabelText('Luk modal')).toBeInTheDocument()
    })
  })

  describe('Form Initialization', () => {
    it('should initialize with default values', () => {
      render(<AddExpenseModal {...defaultProps} />)

      expect(screen.getByLabelText(/Udgiftsnavn/)).toHaveValue('Ny udgift')
      expect(screen.getByLabelText(/Beløb/)).toHaveValue(100)
      expect(screen.getByLabelText(/Frekvens/)).toHaveValue('monthly')
    })

    it('should reset form when modal reopens', () => {
      const { rerender } = render(<AddExpenseModal {...defaultProps} />)

      // Change some values
      const nameInput = screen.getByLabelText(/Udgiftsnavn/)
      fireEvent.change(nameInput, { target: { value: 'Custom Name' } })

      // Close and reopen
      rerender(<AddExpenseModal {...defaultProps} isOpen={false} />)
      rerender(<AddExpenseModal {...defaultProps} isOpen={true} />)

      // Should be reset to default
      expect(screen.getByLabelText(/Udgiftsnavn/)).toHaveValue('Ny udgift')
    })
  })

  describe('Name Field Validation', () => {
    it('should show error for empty name', () => {
      render(<AddExpenseModal {...defaultProps} />)

      const nameInput = screen.getByLabelText(/Udgiftsnavn/)
      fireEvent.change(nameInput, { target: { value: '' } })

      expect(screen.getByText('Udgiftsnavn er påkrævet')).toBeInTheDocument()
    })

    it('should clear error when valid name entered', () => {
      render(<AddExpenseModal {...defaultProps} />)

      const nameInput = screen.getByLabelText(/Udgiftsnavn/)
      fireEvent.change(nameInput, { target: { value: '' } })
      expect(screen.getByText('Udgiftsnavn er påkrævet')).toBeInTheDocument()

      fireEvent.change(nameInput, { target: { value: 'Valid Name' } })
      expect(screen.queryByText('Udgiftsnavn er påkrævet')).not.toBeInTheDocument()
    })

    it('should accept names with special characters', () => {
      render(<AddExpenseModal {...defaultProps} />)

      const nameInput = screen.getByLabelText(/Udgiftsnavn/)
      fireEvent.change(nameInput, { target: { value: 'Netflix & HBO' } })

      expect(screen.queryByText('Udgiftsnavn er påkrævet')).not.toBeInTheDocument()
    })
  })

  describe('Amount Field Validation', () => {
    it('should show error for negative amount', () => {
      render(<AddExpenseModal {...defaultProps} />)

      const amountInput = screen.getByLabelText(/Beløb/)
      fireEvent.change(amountInput, { target: { value: '-100' } })

      expect(screen.getByText('Beløbet skal være mindst 0 kr.')).toBeInTheDocument()
    })

    it('should show error for invalid amount', () => {
      render(<AddExpenseModal {...defaultProps} />)

      const amountInput = screen.getByLabelText(/Beløb/)
      fireEvent.change(amountInput, { target: { value: 'abc' } })

      expect(screen.getByText('Beløbet skal være mindst 0 kr.')).toBeInTheDocument()
    })

    it('should accept zero as valid amount', () => {
      render(<AddExpenseModal {...defaultProps} />)

      const amountInput = screen.getByLabelText(/Beløb/)
      fireEvent.change(amountInput, { target: { value: '0' } })

      expect(screen.queryByText('Beløbet skal være mindst 0 kr.')).not.toBeInTheDocument()
    })

    it('should accept decimal amounts', () => {
      render(<AddExpenseModal {...defaultProps} />)

      const amountInput = screen.getByLabelText(/Beløb/)
      fireEvent.change(amountInput, { target: { value: '99.99' } })

      expect(screen.queryByText('Beløbet skal være mindst 0 kr.')).not.toBeInTheDocument()
    })
  })

  describe('Month Range Validation', () => {
    it('should auto-adjust end month when start month is greater', () => {
      render(<AddExpenseModal {...defaultProps} />)

      const startMonthSelect = screen.getByLabelText(/Start måned/)
      fireEvent.change(startMonthSelect, { target: { value: '12' } })

      const endMonthSelect = screen.getByLabelText(/Slut måned/)
      expect(endMonthSelect).toHaveValue('12')
    })

    it('should keep end month when start month is less', () => {
      render(<AddExpenseModal {...defaultProps} />)

      const endMonthSelect = screen.getByLabelText(/Slut måned/)
      fireEvent.change(endMonthSelect, { target: { value: '6' } })

      const startMonthSelect = screen.getByLabelText(/Start måned/)
      fireEvent.change(startMonthSelect, { target: { value: '3' } })

      expect(endMonthSelect).toHaveValue('6')
    })
  })

  describe('Form Submission', () => {
    it('should call onAdd with form data when submit button clicked', () => {
      render(<AddExpenseModal {...defaultProps} />)

      const nameInput = screen.getByLabelText(/Udgiftsnavn/)
      fireEvent.change(nameInput, { target: { value: 'Test Expense' } })

      const amountInput = screen.getByLabelText(/Beløb/)
      fireEvent.change(amountInput, { target: { value: '500' } })

      const submitButton = screen.getByText('➕ Tilføj udgift')
      fireEvent.click(submitButton)

      expect(mockOnAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Expense',
          amount: 500
        })
      )
    })

    it('should call onClose after successful submission', () => {
      render(<AddExpenseModal {...defaultProps} />)

      const submitButton = screen.getByText('➕ Tilføj udgift')
      fireEvent.click(submitButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should not submit with invalid form', () => {
      render(<AddExpenseModal {...defaultProps} />)

      const nameInput = screen.getByLabelText(/Udgiftsnavn/)
      fireEvent.change(nameInput, { target: { value: '' } })

      const submitButton = screen.getByText('➕ Tilføj udgift')
      fireEvent.click(submitButton)

      expect(mockOnAdd).not.toHaveBeenCalled()
    })

    it('should disable submit button when there are errors', () => {
      render(<AddExpenseModal {...defaultProps} />)

      const amountInput = screen.getByLabelText(/Beløb/)
      fireEvent.change(amountInput, { target: { value: '-100' } })

      const submitButton = screen.getByText('➕ Tilføj udgift')
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Form Cancellation', () => {
    it('should call onClose when cancel button clicked', () => {
      render(<AddExpenseModal {...defaultProps} />)

      const cancelButton = screen.getByText('Annuller')
      fireEvent.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should call onClose when close button clicked', () => {
      render(<AddExpenseModal {...defaultProps} />)

      const closeButton = screen.getByLabelText('Luk modal')
      fireEvent.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should reset form when cancelled', () => {
      render(<AddExpenseModal {...defaultProps} />)

      const nameInput = screen.getByLabelText(/Udgiftsnavn/)
      fireEvent.change(nameInput, { target: { value: 'Custom Name' } })

      const cancelButton = screen.getByText('Annuller')
      fireEvent.click(cancelButton)

      // Reopen modal
      const { rerender } = render(<AddExpenseModal {...defaultProps} isOpen={false} />)
      rerender(<AddExpenseModal {...defaultProps} isOpen={true} />)

      expect(screen.getByLabelText(/Udgiftsnavn/)).toHaveValue('Ny udgift')
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should submit form when Enter is pressed', () => {
      render(<AddExpenseModal {...defaultProps} />)

      const form = screen.getByText('➕ Tilføj ny udgift').closest('form')
      fireEvent.keyDown(form, { key: 'Enter' })

      expect(mockOnAdd).toHaveBeenCalled()
    })

    it('should not submit when Enter is pressed with Shift', () => {
      render(<AddExpenseModal {...defaultProps} />)

      const form = screen.getByText('➕ Tilføj ny udgift').closest('form')
      fireEvent.keyDown(form, { key: 'Enter', shiftKey: true })

      expect(mockOnAdd).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have required aria attributes', () => {
      render(<AddExpenseModal {...defaultProps} />)

      const nameInput = screen.getByLabelText(/Udgiftsnavn/)
      expect(nameInput).toHaveAttribute('aria-required', 'true')

      const amountInput = screen.getByLabelText(/Beløb/)
      expect(amountInput).toHaveAttribute('aria-required', 'true')
    })

    it('should mark invalid fields with aria-invalid', () => {
      render(<AddExpenseModal {...defaultProps} />)

      const nameInput = screen.getByLabelText(/Udgiftsnavn/)
      fireEvent.change(nameInput, { target: { value: '' } })

      expect(nameInput).toHaveAttribute('aria-invalid', 'true')
    })

    it('should link errors with aria-describedby', () => {
      render(<AddExpenseModal {...defaultProps} />)

      const nameInput = screen.getByLabelText(/Udgiftsnavn/)
      fireEvent.change(nameInput, { target: { value: '' } })

      expect(nameInput).toHaveAttribute('aria-describedby', 'name-error')
    })

    it('should have autofocus on name input', () => {
      render(<AddExpenseModal {...defaultProps} />)

      const nameInput = screen.getByLabelText(/Udgiftsnavn/)
      expect(nameInput).toHaveAttribute('autofocus')
    })
  })

  describe('Frequency Selection', () => {
    it('should allow selecting monthly frequency', () => {
      render(<AddExpenseModal {...defaultProps} />)

      const frequencySelect = screen.getByLabelText(/Frekvens/)
      fireEvent.change(frequencySelect, { target: { value: 'monthly' } })

      expect(frequencySelect).toHaveValue('monthly')
    })

    it('should allow selecting quarterly frequency', () => {
      render(<AddExpenseModal {...defaultProps} />)

      const frequencySelect = screen.getByLabelText(/Frekvens/)
      fireEvent.change(frequencySelect, { target: { value: 'quarterly' } })

      expect(frequencySelect).toHaveValue('quarterly')
    })

    it('should allow selecting yearly frequency', () => {
      render(<AddExpenseModal {...defaultProps} />)

      const frequencySelect = screen.getByLabelText(/Frekvens/)
      fireEvent.change(frequencySelect, { target: { value: 'yearly' } })

      expect(frequencySelect).toHaveValue('yearly')
    })
  })
})
