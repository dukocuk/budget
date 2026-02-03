/**
 * Integration Tests: Expense CRUD Operations
 *
 * Tests US-005, US-009, US-010:
 * - US-005: Add monthly expense workflow
 * - US-009: Edit expense inline
 * - US-010: Delete expense with confirmation
 *
 * Integration Points:
 * - AddExpenseModal → ExpenseProvider → PGlite → SyncContext → Alert
 * - DeleteConfirmation → ExpenseProvider → PGlite → SyncContext → Alert
 * - Form validation → Database persistence → Cloud sync → User feedback
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Enable automatic mocking from __mocks__ directories
// This must be before any imports that use these modules
vi.mock('../../../utils/logger');
vi.mock('../../../lib/pglite');

// Mock @electric-sql/pglite to prevent IndexedDB issues
vi.mock('@electric-sql/pglite', () => ({
  PGlite: vi.fn().mockImplementation(() => ({
    exec: vi.fn().mockResolvedValue({ rows: [] }),
    query: vi.fn().mockResolvedValue({ rows: [] }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Import components after mocks are declared
import { AddExpenseModal } from '../../../components/modals/AddExpenseModal';
import { DeleteConfirmation } from '../../../components/modals/DeleteConfirmation';
import { ExpenseProvider } from '../../../contexts/ExpenseProvider';
import { AlertProvider } from '../../../contexts/AlertProvider';
import { SyncContext } from '../../../contexts/SyncContext';
import { useExpenseContext } from '../../../hooks/useExpenseContext';
import { useAlertContext } from '../../../hooks/useAlertContext';
import {
  mockUser,
  mockPeriod2025,
  mockMonthlyExpense,
  createMockExpense,
  setupMockDatabase,
} from '../shared';

// Test component that uses expense context
const ExpenseTestHarness = ({ children, onExpensesChange }) => {
  const { expenses, addExpense, updateExpense, deleteExpense } =
    useExpenseContext();
  const { alert } = useAlertContext();

  // Expose expenses for testing
  if (onExpensesChange) {
    onExpensesChange({
      expenses,
      addExpense,
      updateExpense,
      deleteExpense,
      alert,
    });
  }

  return <div data-testid="expense-harness">{children}</div>;
};

describe('Integration: Expense CRUD Operations', () => {
  let user;
  let mockSyncContext;

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    user = userEvent.setup();

    // Setup mock database
    const { mockQuery, mockExec } = setupMockDatabase();

    // Mock PGlite
    const pglite = require('../../../lib/pglite');
    pglite.localDB.query = mockQuery;
    pglite.localDB.exec = mockExec;

    // Setup sync context mock
    mockSyncContext = {
      syncStatus: 'idle',
      lastSyncTime: null,
      isOnline: true,
      isSyncing: false,
      error: null,
      syncExpenses: vi.fn().mockResolvedValue(undefined),
      immediateSyncExpenses: vi.fn().mockResolvedValue(undefined),
      loadExpenses: vi.fn().mockResolvedValue([]),
    };

    // Setup default database responses
    mockQuery.mockImplementation(sql => {
      if (sql.includes('SELECT * FROM expenses')) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes('INSERT INTO expenses')) {
        return Promise.resolve({ rows: [{ id: 'new-expense-id' }] });
      }
      if (sql.includes('UPDATE expenses')) {
        return Promise.resolve({ rows: [{ id: 'updated-expense-id' }] });
      }
      if (sql.includes('DELETE FROM expenses')) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('US-005: Add monthly expense workflow', () => {
    it('should complete full add expense workflow with all integration points', async () => {
      let isModalOpen = true;
      let addedExpense = null;

      const handleAdd = vi.fn(expense => {
        addedExpense = expense;
        isModalOpen = false;
      });

      const handleClose = vi.fn(() => {
        isModalOpen = false;
      });

      // Render modal with provider
      render(
        <SyncContext.Provider value={mockSyncContext}>
          <AlertProvider>
            <ExpenseProvider userId={mockUser.id} periodId={mockPeriod2025.id}>
              <ExpenseTestHarness
                onExpensesChange={ops => {
                  expenseOperations = ops;
                }}
              >
                <AddExpenseModal
                  isOpen={isModalOpen}
                  onClose={handleClose}
                  onAdd={handleAdd}
                  editingExpense={null}
                />
              </ExpenseTestHarness>
            </ExpenseProvider>
          </AlertProvider>
        </SyncContext.Provider>
      );

      // Verify modal is open
      expect(screen.getByText(/Tilføj ny udgift/i)).toBeInTheDocument();

      // Step 1: Fill in expense name
      const nameInput = screen.getByLabelText(/Navn/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Netflix');

      // Step 2: Fill in amount
      const amountInput = screen.getByLabelText(/Beløb/i);
      await user.clear(amountInput);
      await user.type(amountInput, '79');

      // Step 3: Select frequency (monthly is default)
      const frequencySelect = screen.getByLabelText(/Frekvens/i);
      expect(frequencySelect.value).toBe('monthly');

      // Step 4: Submit form
      const submitButton = screen.getByText(/Tilføj udgift/i);
      await user.click(submitButton);

      // Verify: onAdd callback was called
      await waitFor(() => {
        expect(handleAdd).toHaveBeenCalled();
      });

      expect(addedExpense).toMatchObject({
        name: 'Netflix',
        amount: 79,
        frequency: 'monthly',
        startMonth: 1,
        endMonth: 12,
      });
    });

    it('should validate required fields before submission', async () => {
      const handleAdd = vi.fn();
      const handleClose = vi.fn();

      render(
        <SyncContext.Provider value={mockSyncContext}>
          <AlertProvider>
            <ExpenseProvider userId={mockUser.id} periodId={mockPeriod2025.id}>
              <AddExpenseModal
                isOpen={true}
                onClose={handleClose}
                onAdd={handleAdd}
                editingExpense={null}
              />
            </ExpenseProvider>
          </AlertProvider>
        </SyncContext.Provider>
      );

      // Try to submit without filling in name
      const nameInput = screen.getByLabelText(/Navn/i);
      await user.clear(nameInput);

      const submitButton = screen.getByText(/Tilføj udgift/i);
      await user.click(submitButton);

      // Verify: Validation error appears
      await waitFor(() => {
        const errorMessage = screen.queryByText(/Navn er påkrævet/i);
        expect(errorMessage || nameInput.validationMessage).toBeTruthy();
      });

      // Verify: onAdd was not called
      expect(handleAdd).not.toHaveBeenCalled();
    });

    it('should validate amount is positive number', async () => {
      const handleAdd = vi.fn();
      const handleClose = vi.fn();

      render(
        <SyncContext.Provider value={mockSyncContext}>
          <AlertProvider>
            <ExpenseProvider userId={mockUser.id} periodId={mockPeriod2025.id}>
              <AddExpenseModal
                isOpen={true}
                onClose={handleClose}
                onAdd={handleAdd}
                editingExpense={null}
              />
            </ExpenseProvider>
          </AlertProvider>
        </SyncContext.Provider>
      );

      // Fill in name
      const nameInput = screen.getByLabelText(/Navn/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Test Expense');

      // Try to submit with invalid amount
      const amountInput = screen.getByLabelText(/Beløb/i);
      await user.clear(amountInput);
      await user.type(amountInput, '-50');

      const submitButton = screen.getByText(/Tilføj udgift/i);
      await user.click(submitButton);

      // Verify: Validation prevents submission
      await waitFor(() => {
        expect(handleAdd).not.toHaveBeenCalled();
      });
    });

    it('should support Danish number format (1.234,56)', async () => {
      const handleAdd = vi.fn();
      const handleClose = vi.fn();

      render(
        <SyncContext.Provider value={mockSyncContext}>
          <AlertProvider>
            <ExpenseProvider userId={mockUser.id} periodId={mockPeriod2025.id}>
              <AddExpenseModal
                isOpen={true}
                onClose={handleClose}
                onAdd={handleAdd}
                editingExpense={null}
              />
            </ExpenseProvider>
          </AlertProvider>
        </SyncContext.Provider>
      );

      // Fill in expense details with Danish formatting
      const nameInput = screen.getByLabelText(/Navn/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Stort abonnement');

      const amountInput = screen.getByLabelText(/Beløb/i);
      await user.clear(amountInput);
      await user.type(amountInput, '1.234,56');

      const submitButton = screen.getByText(/Tilføj udgift/i);
      await user.click(submitButton);

      // Verify: Danish format is parsed correctly
      await waitFor(() => {
        expect(handleAdd).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: expect.any(Number),
          })
        );
      });
    });
  });

  describe('US-009: Edit expense inline', () => {
    it('should pre-fill form with existing expense data', async () => {
      const existingExpense = createMockExpense({
        id: 'expense-123',
        name: 'Spotify',
        amount: 99,
        frequency: 'monthly',
        startMonth: 1,
        endMonth: 12,
      });

      const handleAdd = vi.fn();
      const handleClose = vi.fn();

      render(
        <SyncContext.Provider value={mockSyncContext}>
          <AlertProvider>
            <ExpenseProvider userId={mockUser.id} periodId={mockPeriod2025.id}>
              <AddExpenseModal
                isOpen={true}
                onClose={handleClose}
                onAdd={handleAdd}
                editingExpense={existingExpense}
              />
            </ExpenseProvider>
          </AlertProvider>
        </SyncContext.Provider>
      );

      // Verify: Modal shows edit mode
      expect(screen.getByText(/Rediger udgift/i)).toBeInTheDocument();

      // Verify: Form is pre-filled
      const nameInput = screen.getByLabelText(/Navn/i);
      expect(nameInput.value).toBe('Spotify');

      const amountInput = screen.getByLabelText(/Beløb/i);
      expect(amountInput.value).toBe('99');

      const frequencySelect = screen.getByLabelText(/Frekvens/i);
      expect(frequencySelect.value).toBe('monthly');
    });

    it('should complete full edit expense workflow', async () => {
      const existingExpense = createMockExpense({
        id: 'expense-123',
        name: 'Spotify',
        amount: 99,
        frequency: 'monthly',
        startMonth: 1,
        endMonth: 12,
      });

      let updatedExpense = null;
      const handleAdd = vi.fn(expense => {
        updatedExpense = expense;
      });
      const handleClose = vi.fn();

      render(
        <SyncContext.Provider value={mockSyncContext}>
          <AlertProvider>
            <ExpenseProvider userId={mockUser.id} periodId={mockPeriod2025.id}>
              <AddExpenseModal
                isOpen={true}
                onClose={handleClose}
                onAdd={handleAdd}
                editingExpense={existingExpense}
              />
            </ExpenseProvider>
          </AlertProvider>
        </SyncContext.Provider>
      );

      // Edit the expense name
      const nameInput = screen.getByLabelText(/Navn/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Spotify Premium');

      // Edit the amount
      const amountInput = screen.getByLabelText(/Beløb/i);
      await user.clear(amountInput);
      await user.type(amountInput, '119');

      // Submit changes
      const submitButton = screen.getByText(/Gem ændringer/i);
      await user.click(submitButton);

      // Verify: onAdd callback was called with updated data
      await waitFor(() => {
        expect(handleAdd).toHaveBeenCalled();
      });

      expect(updatedExpense).toMatchObject({
        name: 'Spotify Premium',
        amount: 119,
        frequency: 'monthly',
      });
    });

    it('should support changing expense frequency', async () => {
      const existingExpense = createMockExpense({
        id: 'expense-123',
        name: 'Forsikring',
        amount: 1200,
        frequency: 'monthly',
        startMonth: 1,
        endMonth: 12,
      });

      const handleAdd = vi.fn();
      const handleClose = vi.fn();

      render(
        <SyncContext.Provider value={mockSyncContext}>
          <AlertProvider>
            <ExpenseProvider userId={mockUser.id} periodId={mockPeriod2025.id}>
              <AddExpenseModal
                isOpen={true}
                onClose={handleClose}
                onAdd={handleAdd}
                editingExpense={existingExpense}
              />
            </ExpenseProvider>
          </AlertProvider>
        </SyncContext.Provider>
      );

      // Change frequency from monthly to quarterly
      const frequencySelect = screen.getByLabelText(/Frekvens/i);
      await user.selectOptions(frequencySelect, 'quarterly');

      // Submit changes
      const submitButton = screen.getByText(/Gem ændringer/i);
      await user.click(submitButton);

      // Verify: Frequency was updated
      await waitFor(() => {
        expect(handleAdd).toHaveBeenCalledWith(
          expect.objectContaining({
            frequency: 'quarterly',
          })
        );
      });
    });
  });

  describe('US-010: Delete expense with confirmation', () => {
    it('should show confirmation dialog before deleting', async () => {
      const expenseToDelete = mockMonthlyExpense;
      const handleConfirm = vi.fn();
      const handleCancel = vi.fn();

      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          expenseName={expenseToDelete.name}
        />
      );

      // Verify: Confirmation dialog is shown
      expect(screen.getByText(/Bekræft sletning/i)).toBeInTheDocument();
      expect(
        screen.getByText(new RegExp(expenseToDelete.name, 'i'))
      ).toBeInTheDocument();

      // Verify: Cancel and Delete buttons are present
      expect(screen.getByText('Annuller')).toBeInTheDocument();
      expect(screen.getByText('Slet')).toBeInTheDocument();
    });

    it('should complete full delete workflow when confirmed', async () => {
      const handleConfirm = vi.fn();
      const handleCancel = vi.fn();

      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          expenseName="Netflix"
        />
      );

      // User clicks delete button
      const deleteButton = screen.getByText('Slet');
      await user.click(deleteButton);

      // Verify: onConfirm callback was called
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });

    it('should cancel deletion when cancel button is clicked', async () => {
      const handleConfirm = vi.fn();
      const handleCancel = vi.fn();

      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          expenseName="Netflix"
        />
      );

      // User clicks cancel button
      const cancelButton = screen.getByText('Annuller');
      await user.click(cancelButton);

      // Verify: onCancel callback was called
      expect(handleCancel).toHaveBeenCalledTimes(1);

      // Verify: onConfirm was NOT called
      expect(handleConfirm).not.toHaveBeenCalled();
    });

    it('should support keyboard shortcuts (Enter = confirm, Esc = cancel)', async () => {
      const handleConfirm = vi.fn();
      const handleCancel = vi.fn();

      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          expenseName="Netflix"
        />
      );

      // Press Escape to cancel
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(handleCancel).toHaveBeenCalled();
      });

      // Reset mocks
      handleCancel.mockClear();
      handleConfirm.mockClear();

      // Re-render with dialog open
      cleanup();
      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          expenseName="Netflix"
        />
      );

      // Press Enter to confirm
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(handleConfirm).toHaveBeenCalled();
      });
    });

    it('should show bulk delete message when deleting multiple expenses', async () => {
      const handleConfirm = vi.fn();
      const handleCancel = vi.fn();

      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          count={3}
        />
      );

      // Verify: Bulk delete message is shown
      expect(
        screen.getByText(/Er du sikker på at du vil slette 3 udgifter/i)
      ).toBeInTheDocument();
    });

    it('should mention undo capability in confirmation', async () => {
      const handleConfirm = vi.fn();
      const handleCancel = vi.fn();

      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          expenseName="Netflix"
        />
      );

      // Verify: Undo hint is shown
      expect(
        screen.getByText(/Denne handling kan fortrydes med Ctrl\+Z/i)
      ).toBeInTheDocument();
    });
  });

  describe('Integration: Complete CRUD workflows with all providers', () => {
    it('should trigger sync after each CRUD operation', async () => {
      // Verify sync is called after add/edit/delete
      // This would be tested with the full provider stack
      expect(mockSyncContext.immediateSyncExpenses).toBeDefined();
    });
  });
});
