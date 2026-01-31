/**
 * Tests for ExpensesTable - Complex component with filtering and inline editing
 * Focus on critical functionality due to component complexity (738 lines)
 *
 * Priority: HIGH (0% → 70%+ coverage target)
 * Critical: Complex filtering, editing, and selection logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
} from '@testing-library/react';
import { ExpensesTable } from './ExpensesTable';

// Mock dependencies
vi.mock('../../utils/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../hooks/useViewportSize', () => ({
  useViewportSize: () => ({ isMobile: false, width: 1200, height: 800 }),
}));

describe('ExpensesTable', () => {
  let mockOnToggleSelection;
  let mockOnToggleSelectAll;
  let mockOnUpdate;
  let mockOnDelete;
  let mockOnAdd;
  let mockOnEdit;
  let mockOnEditMonthlyAmounts;

  const mockExpenses = [
    {
      id: 'exp-1',
      name: 'Netflix',
      amount: 79,
      frequency: 'monthly',
      startMonth: 1,
      endMonth: 12,
    },
    {
      id: 'exp-2',
      name: 'Spotify',
      amount: 99,
      frequency: 'monthly',
      startMonth: 1,
      endMonth: 12,
    },
    {
      id: 'exp-3',
      name: 'Årlig forsikring',
      amount: 1200,
      frequency: 'yearly',
      startMonth: 3,
      endMonth: 3,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();

    mockOnToggleSelection = vi.fn();
    mockOnToggleSelectAll = vi.fn();
    mockOnUpdate = vi.fn();
    mockOnDelete = vi.fn();
    mockOnAdd = vi.fn();
    mockOnEdit = vi.fn();
    mockOnEditMonthlyAmounts = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('should render empty table when no expenses', () => {
      render(
        <ExpensesTable
          expenses={[]}
          selectedExpenses={[]}
          onToggleSelection={mockOnToggleSelection}
          onToggleSelectAll={mockOnToggleSelectAll}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onAdd={mockOnAdd}
          onEdit={mockOnEdit}
          onEditMonthlyAmounts={mockOnEditMonthlyAmounts}
        />
      );

      // Desktop view shows empty table, not empty state message
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      // No expense rows should be present
      const rows = screen.queryAllByRole('row');
      expect(rows.length).toBe(1); // Only header row
    });

    it('should render expenses table with data', () => {
      render(
        <ExpensesTable
          expenses={mockExpenses}
          selectedExpenses={[]}
          onToggleSelection={mockOnToggleSelection}
          onToggleSelectAll={mockOnToggleSelectAll}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onAdd={mockOnAdd}
          onEdit={mockOnEdit}
          onEditMonthlyAmounts={mockOnEditMonthlyAmounts}
        />
      );

      // Expense names are in input fields, use getByDisplayValue
      expect(screen.getByDisplayValue('Netflix')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Spotify')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Årlig forsikring')).toBeInTheDocument();
    });

    it('should display all table columns', () => {
      render(
        <ExpensesTable
          expenses={mockExpenses}
          selectedExpenses={[]}
          onToggleSelection={mockOnToggleSelection}
          onToggleSelectAll={mockOnToggleSelectAll}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onAdd={mockOnAdd}
          onEdit={mockOnEdit}
          onEditMonthlyAmounts={mockOnEditMonthlyAmounts}
        />
      );

      // Check for column headers
      expect(screen.getByText('Udgift')).toBeInTheDocument();
      expect(screen.getByText('Beløb (kr.)')).toBeInTheDocument();
      expect(screen.getByText('Frekvens')).toBeInTheDocument();
      expect(screen.getByText('Start måned')).toBeInTheDocument();
      expect(screen.getByText('Slut måned')).toBeInTheDocument();
      expect(screen.getByText('Årlig total')).toBeInTheDocument();
    });

    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        id: `exp-${i}`,
        name: `Expense ${i}`,
        amount: 100 + i,
        frequency: 'monthly',
        startMonth: 1,
        endMonth: 12,
      }));

      render(
        <ExpensesTable
          expenses={largeDataset}
          selectedExpenses={[]}
          onToggleSelection={mockOnToggleSelection}
          onToggleSelectAll={mockOnToggleSelectAll}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onAdd={mockOnAdd}
          onEdit={mockOnEdit}
          onEditMonthlyAmounts={mockOnEditMonthlyAmounts}
        />
      );

      // Should render without crashing - expense names are in input fields
      expect(screen.getByDisplayValue('Expense 0')).toBeInTheDocument();
    });
  });

  describe('Filtering & Search', () => {
    it('should filter expenses by search text', () => {
      render(
        <ExpensesTable
          expenses={mockExpenses}
          selectedExpenses={[]}
          onToggleSelection={mockOnToggleSelection}
          onToggleSelectAll={mockOnToggleSelectAll}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onAdd={mockOnAdd}
          onEdit={mockOnEdit}
          onEditMonthlyAmounts={mockOnEditMonthlyAmounts}
        />
      );

      const searchInput = screen.getByPlaceholderText(/Søg efter udgift/i);
      fireEvent.change(searchInput, { target: { value: 'Netflix' } });

      // Check that only Netflix expense remains (using checkbox label)
      expect(screen.getByLabelText('Vælg Netflix')).toBeInTheDocument();
      expect(screen.queryByLabelText('Vælg Spotify')).not.toBeInTheDocument();
    });

    it('should filter by frequency', () => {
      render(
        <ExpensesTable
          expenses={mockExpenses}
          selectedExpenses={[]}
          onToggleSelection={mockOnToggleSelection}
          onToggleSelectAll={mockOnToggleSelectAll}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onAdd={mockOnAdd}
          onEdit={mockOnEdit}
          onEditMonthlyAmounts={mockOnEditMonthlyAmounts}
        />
      );

      const frequencyFilter = screen.getByRole('combobox', {
        name: /Filtrer efter frekvens/i,
      });
      fireEvent.change(frequencyFilter, { target: { value: 'yearly' } });

      // Filtering is synchronous, check immediately - expense names are in input fields
      expect(screen.getByDisplayValue('Årlig forsikring')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Netflix')).not.toBeInTheDocument();
    });

    it('should clear filters', () => {
      render(
        <ExpensesTable
          expenses={mockExpenses}
          selectedExpenses={[]}
          onToggleSelection={mockOnToggleSelection}
          onToggleSelectAll={mockOnToggleSelectAll}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onAdd={mockOnAdd}
          onEdit={mockOnEdit}
          onEditMonthlyAmounts={mockOnEditMonthlyAmounts}
        />
      );

      // Apply filter
      const searchInput = screen.getByPlaceholderText(/Søg efter udgift/i);
      fireEvent.change(searchInput, { target: { value: 'Netflix' } });

      // Verify filter applied - expense names are in input fields
      expect(screen.queryByDisplayValue('Spotify')).not.toBeInTheDocument();

      // Clear filter
      const clearButton = screen.getByText(/Ryd filtre/i);
      fireEvent.click(clearButton);

      // Verify all expenses visible again
      expect(screen.getByDisplayValue('Spotify')).toBeInTheDocument();
    });

    it('should show filtered count', () => {
      render(
        <ExpensesTable
          expenses={mockExpenses}
          selectedExpenses={[]}
          onToggleSelection={mockOnToggleSelection}
          onToggleSelectAll={mockOnToggleSelectAll}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onAdd={mockOnAdd}
          onEdit={mockOnEdit}
          onEditMonthlyAmounts={mockOnEditMonthlyAmounts}
        />
      );

      const searchInput = screen.getByPlaceholderText(/Søg efter udgift/i);
      fireEvent.change(searchInput, { target: { value: 'Netflix' } });

      // Filtering is synchronous, check immediately
      expect(screen.getByText(/Viser 1 af 3 udgifter/i)).toBeInTheDocument();
    });
  });

  describe('Inline Editing', () => {
    it('should update expense name on blur', () => {
      render(
        <ExpensesTable
          expenses={mockExpenses}
          selectedExpenses={[]}
          onToggleSelection={mockOnToggleSelection}
          onToggleSelectAll={mockOnToggleSelectAll}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onAdd={mockOnAdd}
          onEdit={mockOnEdit}
          onEditMonthlyAmounts={mockOnEditMonthlyAmounts}
        />
      );

      const nameInput = screen.getAllByLabelText('Udgiftsnavn')[0];

      act(() => {
        fireEvent.change(nameInput, { target: { value: 'Netflix Premium' } });
        fireEvent.blur(nameInput);
      });

      // Blur handler calls onUpdate if value changed
      expect(mockOnUpdate).toHaveBeenCalledWith('exp-1', {
        name: 'Netflix Premium',
      });
    });

    it('should update expense amount on blur', () => {
      render(
        <ExpensesTable
          expenses={mockExpenses}
          selectedExpenses={[]}
          onToggleSelection={mockOnToggleSelection}
          onToggleSelectAll={mockOnToggleSelectAll}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onAdd={mockOnAdd}
          onEdit={mockOnEdit}
          onEditMonthlyAmounts={mockOnEditMonthlyAmounts}
        />
      );

      const amountInputs = screen.getAllByLabelText('Beløb');

      act(() => {
        fireEvent.change(amountInputs[0], { target: { value: '89' } });
        fireEvent.blur(amountInputs[0]);
      });

      // Blur handler calls onUpdate if value changed
      expect(mockOnUpdate).toHaveBeenCalledWith('exp-1', { amount: '89' });
    });

    it('should not update if value unchanged', () => {
      render(
        <ExpensesTable
          expenses={mockExpenses}
          selectedExpenses={[]}
          onToggleSelection={mockOnToggleSelection}
          onToggleSelectAll={mockOnToggleSelectAll}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onAdd={mockOnAdd}
          onEdit={mockOnEdit}
          onEditMonthlyAmounts={mockOnEditMonthlyAmounts}
        />
      );

      const nameInput = screen.getAllByLabelText('Udgiftsnavn')[0];
      fireEvent.focus(nameInput);
      fireEvent.blur(nameInput);

      expect(mockOnUpdate).not.toHaveBeenCalled();
    });

    it('should maintain focus during typing', () => {
      render(
        <ExpensesTable
          expenses={mockExpenses}
          selectedExpenses={[]}
          onToggleSelection={mockOnToggleSelection}
          onToggleSelectAll={mockOnToggleSelectAll}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onAdd={mockOnAdd}
          onEdit={mockOnEdit}
          onEditMonthlyAmounts={mockOnEditMonthlyAmounts}
        />
      );

      const nameInput = screen.getAllByLabelText('Udgiftsnavn')[0];
      nameInput.focus();
      fireEvent.change(nameInput, { target: { value: 'Test' } });

      expect(document.activeElement).toBe(nameInput);
    });

    it('should disable inputs in read-only mode', () => {
      render(
        <ExpensesTable
          expenses={mockExpenses}
          selectedExpenses={[]}
          onToggleSelection={mockOnToggleSelection}
          onToggleSelectAll={mockOnToggleSelectAll}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onAdd={mockOnAdd}
          onEdit={mockOnEdit}
          onEditMonthlyAmounts={mockOnEditMonthlyAmounts}
          readOnly={true}
        />
      );

      const nameInputs = screen.getAllByLabelText('Udgiftsnavn');
      expect(nameInputs[0]).toBeDisabled();
    });
  });

  describe('Selection & Bulk Operations', () => {
    it('should toggle single expense selection', () => {
      render(
        <ExpensesTable
          expenses={mockExpenses}
          selectedExpenses={[]}
          onToggleSelection={mockOnToggleSelection}
          onToggleSelectAll={mockOnToggleSelectAll}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onAdd={mockOnAdd}
          onEdit={mockOnEdit}
          onEditMonthlyAmounts={mockOnEditMonthlyAmounts}
        />
      );

      const checkbox = screen.getByLabelText('Vælg Netflix');
      fireEvent.click(checkbox);

      expect(mockOnToggleSelection).toHaveBeenCalledWith('exp-1');
    });

    it('should toggle select all', () => {
      render(
        <ExpensesTable
          expenses={mockExpenses}
          selectedExpenses={[]}
          onToggleSelection={mockOnToggleSelection}
          onToggleSelectAll={mockOnToggleSelectAll}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onAdd={mockOnAdd}
          onEdit={mockOnEdit}
          onEditMonthlyAmounts={mockOnEditMonthlyAmounts}
        />
      );

      const selectAllCheckbox = screen.getByLabelText('Vælg alle udgifter');
      fireEvent.click(selectAllCheckbox);

      expect(mockOnToggleSelectAll).toHaveBeenCalled();
    });

    it('should mark checkboxes as checked when expenses selected', () => {
      render(
        <ExpensesTable
          expenses={mockExpenses}
          selectedExpenses={['exp-1', 'exp-2']}
          onToggleSelection={mockOnToggleSelection}
          onToggleSelectAll={mockOnToggleSelectAll}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onAdd={mockOnAdd}
          onEdit={mockOnEdit}
          onEditMonthlyAmounts={mockOnEditMonthlyAmounts}
        />
      );

      const netflixCheckbox = screen.getByLabelText('Vælg Netflix');
      const spotifyCheckbox = screen.getByLabelText('Vælg Spotify');

      expect(netflixCheckbox).toBeChecked();
      expect(spotifyCheckbox).toBeChecked();
    });

    it('should disable selection in read-only mode', () => {
      render(
        <ExpensesTable
          expenses={mockExpenses}
          selectedExpenses={[]}
          onToggleSelection={mockOnToggleSelection}
          onToggleSelectAll={mockOnToggleSelectAll}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onAdd={mockOnAdd}
          onEdit={mockOnEdit}
          onEditMonthlyAmounts={mockOnEditMonthlyAmounts}
          readOnly={true}
        />
      );

      const checkbox = screen.getByLabelText('Vælg Netflix');
      expect(checkbox).toBeDisabled();
    });
  });

  describe('Actions', () => {
    it('should call onDelete when delete button clicked', () => {
      render(
        <ExpensesTable
          expenses={mockExpenses}
          selectedExpenses={[]}
          onToggleSelection={mockOnToggleSelection}
          onToggleSelectAll={mockOnToggleSelectAll}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onAdd={mockOnAdd}
          onEdit={mockOnEdit}
          onEditMonthlyAmounts={mockOnEditMonthlyAmounts}
        />
      );

      const deleteButtons = screen.getAllByText('Slet');
      fireEvent.click(deleteButtons[0]);

      expect(mockOnDelete).toHaveBeenCalledWith('exp-1');
    });

    it('should call onEdit when edit button clicked', () => {
      render(
        <ExpensesTable
          expenses={mockExpenses}
          selectedExpenses={[]}
          onToggleSelection={mockOnToggleSelection}
          onToggleSelectAll={mockOnToggleSelectAll}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onAdd={mockOnAdd}
          onEdit={mockOnEdit}
          onEditMonthlyAmounts={mockOnEditMonthlyAmounts}
        />
      );

      const editButtons = screen.getAllByLabelText(/Rediger/i);
      fireEvent.click(editButtons[0]);

      expect(mockOnEdit).toHaveBeenCalledWith(mockExpenses[0]);
    });

    it('should disable action buttons in read-only mode', () => {
      render(
        <ExpensesTable
          expenses={mockExpenses}
          selectedExpenses={[]}
          onToggleSelection={mockOnToggleSelection}
          onToggleSelectAll={mockOnToggleSelectAll}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onAdd={mockOnAdd}
          onEdit={mockOnEdit}
          onEditMonthlyAmounts={mockOnEditMonthlyAmounts}
          readOnly={true}
        />
      );

      const editButtons = screen.getAllByLabelText(/Rediger/i);
      expect(editButtons[0]).toBeDisabled();

      const deleteButtons = screen.getAllByText('Slet');
      expect(deleteButtons[0]).toBeDisabled();
    });
  });

  describe('Variable Amounts', () => {
    it('should display variable amount badge', () => {
      const variableExpense = {
        id: 'exp-var',
        name: 'Variable Payment',
        amount: 0,
        frequency: 'monthly',
        startMonth: 1,
        endMonth: 12,
        monthlyAmounts: [
          100, 200, 300, 100, 100, 100, 100, 100, 100, 100, 100, 100,
        ],
      };

      render(
        <ExpensesTable
          expenses={[variableExpense]}
          selectedExpenses={[]}
          onToggleSelection={mockOnToggleSelection}
          onToggleSelectAll={mockOnToggleSelectAll}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onAdd={mockOnAdd}
          onEdit={mockOnEdit}
          onEditMonthlyAmounts={mockOnEditMonthlyAmounts}
        />
      );

      expect(screen.getByText(/Variabel/i)).toBeInTheDocument();
    });

    it('should call onEditMonthlyAmounts when edit variable clicked', () => {
      const variableExpense = {
        id: 'exp-var',
        name: 'Variable Payment',
        amount: 0,
        frequency: 'monthly',
        startMonth: 1,
        endMonth: 12,
        monthlyAmounts: [
          100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100,
        ],
      };

      render(
        <ExpensesTable
          expenses={[variableExpense]}
          selectedExpenses={[]}
          onToggleSelection={mockOnToggleSelection}
          onToggleSelectAll={mockOnToggleSelectAll}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onAdd={mockOnAdd}
          onEdit={mockOnEdit}
          onEditMonthlyAmounts={mockOnEditMonthlyAmounts}
        />
      );

      const editButton = screen.getByLabelText(/Rediger månedlige beløb/i);
      fireEvent.click(editButton);

      expect(mockOnEditMonthlyAmounts).toHaveBeenCalledWith(variableExpense);
    });
  });

  describe('Annual Total Calculation', () => {
    it('should display correct annual total for monthly expense', () => {
      render(
        <ExpensesTable
          expenses={[mockExpenses[0]]} // Netflix: 79/month * 12 = 948
          selectedExpenses={[]}
          onToggleSelection={mockOnToggleSelection}
          onToggleSelectAll={mockOnToggleSelectAll}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onAdd={mockOnAdd}
          onEdit={mockOnEdit}
          onEditMonthlyAmounts={mockOnEditMonthlyAmounts}
        />
      );

      expect(screen.getByText(/948/)).toBeInTheDocument();
    });

    it('should display correct annual total for yearly expense', () => {
      render(
        <ExpensesTable
          expenses={[mockExpenses[2]]} // Yearly: 1200 * 1 = 1200
          selectedExpenses={[]}
          onToggleSelection={mockOnToggleSelection}
          onToggleSelectAll={mockOnToggleSelectAll}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onAdd={mockOnAdd}
          onEdit={mockOnEdit}
          onEditMonthlyAmounts={mockOnEditMonthlyAmounts}
        />
      );

      expect(screen.getByText(/1\.200/)).toBeInTheDocument();
    });
  });
});
