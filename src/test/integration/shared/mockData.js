/**
 * Mock Data Factory for Integration Tests
 *
 * Provides reusable mock data and factory functions for:
 * - Users
 * - Budget periods
 * - Expenses
 * - Templates
 */

// Mock user data
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  picture: 'https://example.com/avatar.jpg',
};

export const mockUser2 = {
  id: 'user-456',
  email: 'user2@example.com',
  name: 'Second User',
  picture: 'https://example.com/avatar2.jpg',
};

// Mock budget periods
export const mockPeriod2024 = {
  id: 'period-2024',
  user_id: 'user-123',
  year: 2024,
  monthly_payment: 5000,
  previous_balance: 10000,
  monthly_payments: JSON.stringify(Array(12).fill(5000)),
  status: 'archived',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-12-31T23:59:59Z',
};

export const mockPeriod2025 = {
  id: 'period-2025',
  user_id: 'user-123',
  year: 2025,
  monthly_payment: 5500,
  previous_balance: 12345.67,
  monthly_payments: JSON.stringify(Array(12).fill(5500)),
  status: 'active',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-15T12:00:00Z',
};

export const mockPeriod2026 = {
  id: 'period-2026',
  user_id: 'user-123',
  year: 2026,
  monthly_payment: 6000,
  previous_balance: 15000,
  monthly_payments: JSON.stringify(Array(12).fill(6000)),
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// Mock expenses
export const mockMonthlyExpense = {
  id: 'exp-monthly-1',
  budget_period_id: 'period-2025',
  name: 'Netflix',
  amount: 79,
  frequency: 'monthly',
  start_month: 1,
  end_month: 12,
  payment_mode: 'fixed',
  monthly_amounts: null,
  created_at: '2025-01-01T10:00:00Z',
  updated_at: '2025-01-01T10:00:00Z',
};

export const mockQuarterlyExpense = {
  id: 'exp-quarterly-1',
  budget_period_id: 'period-2025',
  name: 'Forsikring',
  amount: 1200,
  frequency: 'quarterly',
  start_month: 1,
  end_month: 12,
  payment_mode: 'fixed',
  monthly_amounts: null,
  created_at: '2025-01-01T10:00:00Z',
  updated_at: '2025-01-01T10:00:00Z',
};

export const mockYearlyExpense = {
  id: 'exp-yearly-1',
  budget_period_id: 'period-2025',
  name: 'Årlig abonnement',
  amount: 2400,
  frequency: 'yearly',
  start_month: 3,
  end_month: 3,
  payment_mode: 'fixed',
  monthly_amounts: null,
  created_at: '2025-01-01T10:00:00Z',
  updated_at: '2025-01-01T10:00:00Z',
};

export const mockVariableExpense = {
  id: 'exp-variable-1',
  budget_period_id: 'period-2025',
  name: 'Variable Payment',
  amount: 0, // Calculated from monthly_amounts
  frequency: 'monthly',
  start_month: 1,
  end_month: 12,
  payment_mode: 'variable',
  monthly_amounts: JSON.stringify([
    100, 200, 150, 175, 125, 180, 190, 160, 140, 210, 220, 250,
  ]),
  created_at: '2025-01-01T10:00:00Z',
  updated_at: '2025-01-15T14:00:00Z',
};

// Mock templates
export const mockTemplate = {
  id: 'template-1',
  user_id: 'user-123',
  name: 'Standard Budget',
  description: 'Monthly subscriptions and utilities',
  expenses: JSON.stringify([
    { name: 'Netflix', amount: 79, frequency: 'monthly' },
    { name: 'Spotify', amount: 99, frequency: 'monthly' },
    { name: 'El', amount: 500, frequency: 'monthly' },
  ]),
  created_at: '2024-12-01T00:00:00Z',
  updated_at: '2024-12-01T00:00:00Z',
};

// Factory functions

/**
 * Create a mock expense with customizable properties
 */
export const createMockExpense = (overrides = {}) => {
  return {
    id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    budget_period_id: 'period-2025',
    name: 'Test Expense',
    amount: 100,
    frequency: 'monthly',
    start_month: 1,
    end_month: 12,
    payment_mode: 'fixed',
    monthly_amounts: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
};

/**
 * Create a mock budget period with customizable properties
 */
export const createMockPeriod = (year, overrides = {}) => {
  const monthlyPayment = overrides.monthly_payment || 5000;
  return {
    id: `period-${year}`,
    user_id: 'user-123',
    year,
    monthly_payment: monthlyPayment,
    previous_balance: 0,
    monthly_payments: JSON.stringify(Array(12).fill(monthlyPayment)),
    status: 'active',
    created_at: `${year}-01-01T00:00:00Z`,
    updated_at: new Date().toISOString(),
    ...overrides,
  };
};

/**
 * Create a mock user with customizable properties
 */
export const createMockUser = (overrides = {}) => {
  const id = overrides.id || `user-${Date.now()}`;
  return {
    id,
    email: `${id}@example.com`,
    name: 'Test User',
    picture: 'https://example.com/avatar.jpg',
    ...overrides,
  };
};

/**
 * Create a mock template with customizable properties
 */
export const createMockTemplate = (overrides = {}) => {
  return {
    id: `template-${Date.now()}`,
    user_id: 'user-123',
    name: 'Test Template',
    description: 'Test description',
    expenses: JSON.stringify([]),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
};

/**
 * Create a batch of mock expenses
 */
export const createMockExpenses = (count = 5, periodId = 'period-2025') => {
  const frequencies = ['monthly', 'quarterly', 'yearly'];
  return Array.from({ length: count }, (_, index) => {
    const frequency = frequencies[index % frequencies.length];
    return createMockExpense({
      name: `Expense ${index + 1}`,
      amount: (index + 1) * 100,
      frequency,
      budget_period_id: periodId,
    });
  });
};

/**
 * Create OAuth token response
 */
export const createMockTokenResponse = (overrides = {}) => {
  return {
    access_token: 'mock-access-token-12345',
    refresh_token: 'mock-refresh-token-67890',
    expires_in: 3600,
    token_type: 'Bearer',
    scope:
      'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile',
    ...overrides,
  };
};

/**
 * Create Google Drive file metadata
 */
export const createMockDriveFile = (overrides = {}) => {
  return {
    id: 'drive-file-123',
    name: 'budget-data.json',
    mimeType: 'application/json',
    createdTime: '2025-01-01T00:00:00Z',
    modifiedTime: new Date().toISOString(),
    ...overrides,
  };
};

/**
 * Create complete sync payload
 */
export const createMockSyncPayload = (
  periods = [mockPeriod2025],
  expenses = [mockMonthlyExpense]
) => {
  return {
    budget_periods: periods,
    expenses: expenses,
    last_updated: new Date().toISOString(),
  };
};
