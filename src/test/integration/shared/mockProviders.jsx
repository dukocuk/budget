/**
 * Mock Provider Wrapper for Integration Tests
 *
 * Provides a reusable test wrapper that includes all 6 context providers
 * with customizable mock values for testing complete workflows.
 */

import React from 'react';
import { vi } from 'vitest';
import { ExpenseContext } from '../../../contexts/ExpenseContext';
import { BudgetPeriodContext } from '../../../contexts/BudgetPeriodContext';
import { ModalContext } from '../../../contexts/ModalContext';
import { SyncContext } from '../../../contexts/SyncContext';
import { AlertContext } from '../../../contexts/AlertContext';
import { LoadingContext } from '../../../contexts/LoadingContext';
import { mockUser, mockPeriod2025, mockMonthlyExpense } from './mockData';

/**
 * Default mock values for contexts
 */
export const createDefaultMockValues = (overrides = {}) => {
  return {
    auth: {
      user: mockUser,
      loading: false,
      error: null,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      ...overrides.auth,
    },
    expense: {
      expenses: [mockMonthlyExpense],
      selectedExpenses: [],
      loading: false,
      error: null,
      canUndo: false,
      canRedo: false,
      addExpense: vi.fn(),
      updateExpense: vi.fn(),
      deleteExpense: vi.fn(),
      bulkDeleteExpenses: vi.fn(),
      selectExpense: vi.fn(),
      clearSelection: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      ...overrides.expense,
    },
    budgetPeriod: {
      periods: [mockPeriod2025],
      activePeriod: mockPeriod2025,
      loading: false,
      error: null,
      createPeriod: vi.fn(),
      updatePeriod: vi.fn(),
      archivePeriod: vi.fn(),
      setActivePeriod: vi.fn(),
      deletePeriod: vi.fn(),
      ...overrides.budgetPeriod,
    },
    modal: {
      isOpen: false,
      modalType: null,
      modalProps: {},
      openModal: vi.fn(),
      closeModal: vi.fn(),
      ...overrides.modal,
    },
    sync: {
      syncStatus: 'idle',
      lastSyncTime: null,
      isOnline: true,
      isSyncing: false,
      error: null,
      syncExpenses: vi.fn(),
      syncSettings: vi.fn(),
      loadExpenses: vi.fn(),
      ...overrides.sync,
    },
    alert: {
      alert: null,
      showAlert: vi.fn(),
      hideAlert: vi.fn(),
      ...overrides.alert,
    },
    loading: {
      loading: false,
      loadingStage: 'complete',
      progress: 100,
      setLoading: vi.fn(),
      setLoadingStage: vi.fn(),
      setProgress: vi.fn(),
      ...overrides.loading,
    },
  };
};

/**
 * Test Provider Wrapper Component
 *
 * Wraps children with all 6 context providers using mock values.
 * Allows customization of mock values via initialState parameter.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Components to wrap
 * @param {Object} props.initialState - Custom mock values to override defaults
 * @param {Object} props.initialState.auth - Auth context overrides
 * @param {Object} props.initialState.expense - Expense context overrides
 * @param {Object} props.initialState.budgetPeriod - Budget period context overrides
 * @param {Object} props.initialState.modal - Modal context overrides
 * @param {Object} props.initialState.sync - Sync context overrides
 * @param {Object} props.initialState.alert - Alert context overrides
 * @param {Object} props.initialState.loading - Loading context overrides
 */
export const TestProviderWrapper = ({ children, initialState = {} }) => {
  const mockValues = createDefaultMockValues(initialState);

  return (
    <LoadingContext.Provider value={mockValues.loading}>
      <SyncContext.Provider value={mockValues.sync}>
        <BudgetPeriodContext.Provider value={mockValues.budgetPeriod}>
          <AlertContext.Provider value={mockValues.alert}>
            <ModalContext.Provider value={mockValues.modal}>
              <ExpenseContext.Provider value={mockValues.expense}>
                {children}
              </ExpenseContext.Provider>
            </ModalContext.Provider>
          </AlertContext.Provider>
        </BudgetPeriodContext.Provider>
      </SyncContext.Provider>
    </LoadingContext.Provider>
  );
};

/**
 * Create a test wrapper with custom render function for @testing-library/react
 *
 * Usage:
 * const { render } = createTestWrapper({ initialState: { ... } });
 * render(<MyComponent />);
 */
export const createTestWrapper = (options = {}) => {
  const { initialState = {} } = options;

  return {
    wrapper: ({ children }) => (
      <TestProviderWrapper initialState={initialState}>
        {children}
      </TestProviderWrapper>
    ),
  };
};

/**
 * Minimal wrapper for testing components that only need specific contexts
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {Array<string>} props.contexts - Array of context names to include
 * @param {Object} props.initialState - Custom mock values
 */
export const MinimalTestWrapper = ({
  children,
  contexts = [],
  initialState = {},
}) => {
  const mockValues = createDefaultMockValues(initialState);

  let wrappedChildren = children;

  // Wrap only requested contexts
  if (contexts.includes('expense')) {
    wrappedChildren = (
      <ExpenseContext.Provider value={mockValues.expense}>
        {wrappedChildren}
      </ExpenseContext.Provider>
    );
  }

  if (contexts.includes('budgetPeriod')) {
    wrappedChildren = (
      <BudgetPeriodContext.Provider value={mockValues.budgetPeriod}>
        {wrappedChildren}
      </BudgetPeriodContext.Provider>
    );
  }

  if (contexts.includes('modal')) {
    wrappedChildren = (
      <ModalContext.Provider value={mockValues.modal}>
        {wrappedChildren}
      </ModalContext.Provider>
    );
  }

  if (contexts.includes('sync')) {
    wrappedChildren = (
      <SyncContext.Provider value={mockValues.sync}>
        {wrappedChildren}
      </SyncContext.Provider>
    );
  }

  if (contexts.includes('alert')) {
    wrappedChildren = (
      <AlertContext.Provider value={mockValues.alert}>
        {wrappedChildren}
      </AlertContext.Provider>
    );
  }

  if (contexts.includes('loading')) {
    wrappedChildren = (
      <LoadingContext.Provider value={mockValues.loading}>
        {wrappedChildren}
      </LoadingContext.Provider>
    );
  }

  return wrappedChildren;
};
