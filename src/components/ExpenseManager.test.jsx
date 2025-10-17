/**
 * Tests for ExpenseManager component
 * Tests inline editing, bulk operations, and search functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExpenseManager from './ExpenseManager'
import { useExpenses } from '../hooks/useExpenses'

// Mock the hooks
vi.mock('../hooks/useExpenses')

describe('ExpenseManager', () => {
  const mockExpenses = [
    {
      id: 1,
      name: 'Netflix',
      amount: 79,
      frequency: 'monthly',
      startMonth: 1,
      endMonth: 12
    },
    {
      id: 2,
      name: 'Spotify',
      amount: 99,
      frequency: 'monthly',
      startMonth: 1,
      endMonth: 12
    }
  ]

  const mockAddExpense = vi.fn()
  const mockUpdateExpense = vi.fn()
  const mockDeleteExpense = vi.fn()
  const mockDeleteExpenses = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useExpenses.mockReturnValue({
      expenses: mockExpenses,
      loading: false,
      addExpense: mockAddExpense,
      updateExpense: mockUpdateExpense,
      deleteExpense: mockDeleteExpense,
      deleteExpenses: mockDeleteExpenses
    })
  })

  describe('Rendering', () => {
    it('should render expense manager with header', () => {
      render(<ExpenseManager userId="test-user-id" />)

      expect(screen.getByText('💰 Dine udgifter')).toBeInTheDocument()
    })

    it('should render search input', () => {
      render(<ExpenseManager userId="test-user-id" />)

      expect(screen.getByPlaceholderText('Søg udgifter...')).toBeInTheDocument()
    })

    it('should render add expense button', () => {
      render(<ExpenseManager userId="test-user-id" />)

      expect(screen.getByText('➕ Tilføj ny udgift')).toBeInTheDocument()
    })

    it('should render all expenses in table', () => {
      render(<ExpenseManager userId="test-user-id" />)

      expect(screen.getByDisplayValue('Netflix')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Spotify')).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('should show loading message when expenses are loading', () => {
      useExpenses.mockReturnValue({
        expenses: [],
        loading: true,
        addExpense: mockAddExpense,
        updateExpense: mockUpdateExpense,
        deleteExpense: mockDeleteExpense,
        deleteExpenses: mockDeleteExpenses
      })

      render(<ExpenseManager userId="test-user-id" />)

      expect(screen.getByText('Indlæser udgifter...')).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('should filter expenses by search term', async () => {
      const user = userEvent.setup()
      render(<ExpenseManager userId="test-user-id" />)

      const searchInput = screen.getByPlaceholderText('Søg udgifter...')
      await user.type(searchInput, 'Netflix')

      // Search input will have "Netflix", and table row will have "Netflix" - expect multiple
      const netflixInputs = screen.getAllByDisplayValue('Netflix')
      expect(netflixInputs.length).toBeGreaterThanOrEqual(1)
      expect(screen.queryByDisplayValue('Spotify')).not.toBeInTheDocument()
    })

    it('should be case-insensitive', async () => {
      const user = userEvent.setup()
      render(<ExpenseManager userId="test-user-id" />)

      const searchInput = screen.getByPlaceholderText('Søg udgifter...')
      await user.type(searchInput, 'netflix')

      // Table should show Netflix row even though search was lowercase
      const netflixInputs = screen.getAllByDisplayValue('Netflix')
      expect(netflixInputs.length).toBeGreaterThanOrEqual(1)
    })

    it('should show no results message when no matches', async () => {
      const user = userEvent.setup()
      render(<ExpenseManager userId="test-user-id" />)

      const searchInput = screen.getByPlaceholderText('Søg udgifter...')
      await user.type(searchInput, 'NonExistent')

      expect(screen.getByText(/Ingen udgifter matcher "NonExistent"/)).toBeInTheDocument()
    })
  })

  describe('Add Expense', () => {
    it('should call addExpense when add button is clicked', async () => {
      const user = userEvent.setup()
      render(<ExpenseManager userId="test-user-id" />)

      const addButton = screen.getByText('➕ Tilføj ny udgift')
      await user.click(addButton)

      await waitFor(() => {
        expect(mockAddExpense).toHaveBeenCalledWith({
          name: 'Ny udgift',
          amount: 100,
          frequency: 'monthly',
          startMonth: 1,
          endMonth: 12
        })
      })
    })
  })

  describe('Inline Editing', () => {
    it('should update expense name when edited', async () => {
      const user = userEvent.setup()
      render(<ExpenseManager userId="test-user-id" />)

      const nameInput = screen.getByDisplayValue('Netflix')
      await user.clear(nameInput)
      await user.type(nameInput, 'Netflix Premium')

      // Wait for debounce (300ms)
      await waitFor(() => {
        expect(mockUpdateExpense).toHaveBeenCalledWith(1, { name: 'Netflix Premium' })
      }, { timeout: 500 })
    })

    it('should update expense amount when edited', async () => {
      const user = userEvent.setup()
      render(<ExpenseManager userId="test-user-id" />)

      const amountInput = screen.getByDisplayValue('79')
      await user.clear(amountInput)
      await user.type(amountInput, '89')

      await waitFor(() => {
        expect(mockUpdateExpense).toHaveBeenCalledWith(1, { amount: 89 })
      }, { timeout: 500 })
    })

    it('should update frequency immediately when changed', async () => {
      const user = userEvent.setup()
      render(<ExpenseManager userId="test-user-id" />)

      const frequencySelects = screen.getAllByDisplayValue('Månedlig')
      await user.selectOptions(frequencySelects[0], 'quarterly')

      await waitFor(() => {
        expect(mockUpdateExpense).toHaveBeenCalledWith(1, { frequency: 'quarterly' })
      })
    })
  })

  describe('Selection and Bulk Delete', () => {
    it('should allow selecting individual expenses', async () => {
      const user = userEvent.setup()
      render(<ExpenseManager userId="test-user-id" />)

      const checkboxes = screen.getAllByRole('checkbox')
      // First checkbox is "select all", so use second checkbox
      await user.click(checkboxes[1])

      expect(checkboxes[1]).toBeChecked()
    })

    it('should show delete button when expenses are selected', async () => {
      const user = userEvent.setup()
      render(<ExpenseManager userId="test-user-id" />)

      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[1])

      expect(screen.getByText(/Slet 1 valgte/)).toBeInTheDocument()
    })

    it('should select all expenses when select all is clicked', async () => {
      const user = userEvent.setup()
      render(<ExpenseManager userId="test-user-id" />)

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
      await user.click(selectAllCheckbox)

      const checkboxes = screen.getAllByRole('checkbox')
      checkboxes.forEach(checkbox => {
        expect(checkbox).toBeChecked()
      })
    })
  })

  describe('Delete Operations', () => {
    it('should open delete confirmation for single expense', async () => {
      const user = userEvent.setup()
      render(<ExpenseManager userId="test-user-id" />)

      const deleteButtons = screen.getAllByText('Slet')
      await user.click(deleteButtons[0])

      // DeleteConfirmation modal should open
      await waitFor(() => {
        expect(screen.getByText('Bekræft sletning')).toBeInTheDocument()
      })
    })
  })

  describe('Empty States', () => {
    it('should show empty state when no expenses exist', () => {
      useExpenses.mockReturnValue({
        expenses: [],
        loading: false,
        addExpense: mockAddExpense,
        updateExpense: mockUpdateExpense,
        deleteExpense: mockDeleteExpense,
        deleteExpenses: mockDeleteExpenses
      })

      render(<ExpenseManager userId="test-user-id" />)

      expect(screen.getByText(/Ingen udgifter endnu/)).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle update errors gracefully', async () => {
      mockUpdateExpense.mockRejectedValue(new Error('Update failed'))
      const user = userEvent.setup()
      render(<ExpenseManager userId="test-user-id" />)

      const nameInput = screen.getByDisplayValue('Netflix')
      await user.clear(nameInput)
      await user.type(nameInput, 'Netflix Premium')

      // Error should be caught and displayed
      await waitFor(() => {
        expect(screen.getByText(/Fejl ved opdatering/)).toBeInTheDocument()
      }, { timeout: 500 })
    })
  })

  describe('Debouncing', () => {
    it('should debounce text input updates', async () => {
      const user = userEvent.setup()
      render(<ExpenseManager userId="test-user-id" />)

      const nameInput = screen.getByDisplayValue('Netflix')

      // Type multiple characters quickly
      await user.clear(nameInput)
      await user.type(nameInput, 'Test')

      // Should only call updateExpense once after debounce
      await waitFor(() => {
        expect(mockUpdateExpense).toHaveBeenCalledTimes(1)
      }, { timeout: 500 })
    })
  })
})
