/**
 * Test Utility Functions
 *
 * Non-component utilities for test setup.
 * Separated from mockProviders.jsx to enable React Fast Refresh.
 */

import { vi } from 'vitest';
import { mockUser, mockPeriod2025, mockMonthlyExpense } from './mockData';
import { TestProviderWrapper } from './mockProviders';

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
 * Create a test wrapper with custom render function for @testing-library/react
 *
 * Usage:
 * const { wrapper } = createTestWrapper({ initialState: { ... } });
 * render(<MyComponent />, { wrapper });
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
