/**
 * Tests for useBudgetPeriods hook
 * Tests budget period management, especially getExpensesForPeriod for year comparison
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBudgetPeriods } from './useBudgetPeriods';
import { localDB } from '../lib/pglite';
// useSyncContext is mocked below
// import { useSyncContext } from './useSyncContext';

// Mock PGlite database
vi.mock('../lib/pglite', () => ({
  localDB: {
    query: vi.fn(),
    exec: vi.fn(),
  },
  migrateToBudgetPeriods: vi.fn().mockResolvedValue(undefined),
}));

// Mock SyncContext with persistent spy
const mockSyncBudgetPeriods = vi.fn();
vi.mock('./useSyncContext', () => ({
  useSyncContext: () => ({
    syncBudgetPeriods: mockSyncBudgetPeriods,
  }),
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock UUID generator
vi.mock('../utils/uuid', () => ({
  generateUUID: vi.fn(() => 'test-uuid-123'),
}));

describe('useBudgetPeriods', () => {
  const mockUserId = 'test-user-id';

  const mockPeriodsRows = [
    {
      id: 'period-2025',
      user_id: mockUserId,
      year: 2025,
      monthly_payment: 6000,
      previous_balance: 5000,
      monthly_payments: null,
      status: 'active',
      is_template: 0,
      template_name: null,
      template_description: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
    {
      id: 'period-2024',
      user_id: mockUserId,
      year: 2024,
      monthly_payment: 5700,
      previous_balance: 4831,
      monthly_payments: null,
      status: 'archived',
      is_template: 0,
      template_name: null,
      template_description: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  const mockExpensesRows = [
    {
      id: 'expense-1',
      name: 'Netflix',
      amount: 120,
      frequency: 'monthly',
      start_month: 1,
      end_month: 12,
    },
    {
      id: 'expense-2',
      name: 'Gym',
      amount: 300,
      frequency: 'monthly',
      start_month: 1,
      end_month: 12,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for periods query
    localDB.query.mockImplementation(query => {
      if (
        query.includes('SELECT * FROM budget_periods') &&
        query.includes('is_template = 0')
      ) {
        return Promise.resolve({ rows: mockPeriodsRows });
      }
      return Promise.resolve({ rows: [] });
    });
  });

  describe('getExpensesForPeriod', () => {
    it('should load period with expenses successfully', async () => {
      localDB.query.mockImplementation((query, params) => {
        // Initial periods load
        if (
          query.includes('SELECT * FROM budget_periods') &&
          query.includes('is_template = 0')
        ) {
          return Promise.resolve({ rows: mockPeriodsRows });
        }
        // getExpensesForPeriod period query
        if (
          query.includes('SELECT * FROM budget_periods') &&
          params.includes('period-2025')
        ) {
          return Promise.resolve({ rows: [mockPeriodsRows[0]] });
        }
        // getExpensesForPeriod expenses query
        if (
          query.includes('SELECT * FROM expenses') &&
          query.includes('budget_period_id')
        ) {
          return Promise.resolve({ rows: mockExpensesRows });
        }
        return Promise.resolve({ rows: [] });
      });

      const { result } = renderHook(() => useBudgetPeriods(mockUserId));

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Call getExpensesForPeriod
      const periodData =
        await result.current.getExpensesForPeriod('period-2025');

      // Verify structure
      expect(periodData).toEqual({
        id: 'period-2025',
        year: 2025,
        monthlyPayment: 6000,
        previousBalance: 5000,
        monthlyPayments: null,
        status: 'active',
        expenses: [
          {
            id: 'expense-1',
            name: 'Netflix',
            amount: 120,
            frequency: 'monthly',
            startMonth: 1,
            endMonth: 12,
          },
          {
            id: 'expense-2',
            name: 'Gym',
            amount: 300,
            frequency: 'monthly',
            startMonth: 1,
            endMonth: 12,
          },
        ],
      });

      // Verify queries were called
      expect(localDB.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM budget_periods'),
        ['period-2025', mockUserId]
      );
      expect(localDB.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM expenses'),
        expect.arrayContaining(['period-2025'])
      );
    });

    it('should throw error for non-existent period', async () => {
      localDB.query.mockImplementation((query, params) => {
        if (
          query.includes('SELECT * FROM budget_periods') &&
          query.includes('is_template = 0')
        ) {
          return Promise.resolve({ rows: mockPeriodsRows });
        }
        if (
          query.includes('SELECT * FROM budget_periods') &&
          params.includes('non-existent')
        ) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const { result } = renderHook(() => useBudgetPeriods(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should throw error
      await expect(
        result.current.getExpensesForPeriod('non-existent')
      ).rejects.toThrow('Period not found');
    });

    it('should return null for null userId', async () => {
      const { result } = renderHook(() => useBudgetPeriods(null));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const periodData =
        await result.current.getExpensesForPeriod('period-2025');
      expect(periodData).toBeNull();
    });

    it('should parse monthlyPayments JSON correctly', async () => {
      const periodWithVariablePayments = {
        ...mockPeriodsRows[0],
        monthly_payments: JSON.stringify([
          5000, 5500, 6000, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700,
          6000,
        ]),
      };

      localDB.query.mockImplementation((query, params) => {
        if (
          query.includes('SELECT * FROM budget_periods') &&
          query.includes('is_template = 0')
        ) {
          return Promise.resolve({ rows: mockPeriodsRows });
        }
        if (
          query.includes('SELECT * FROM budget_periods') &&
          params.includes('period-2025')
        ) {
          return Promise.resolve({ rows: [periodWithVariablePayments] });
        }
        if (query.includes('SELECT * FROM expenses')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const { result } = renderHook(() => useBudgetPeriods(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const periodData =
        await result.current.getExpensesForPeriod('period-2025');

      expect(periodData.monthlyPayments).toEqual([
        5000, 5500, 6000, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 6000,
      ]);
    });

    it('should handle null monthlyPayments', async () => {
      localDB.query.mockImplementation((query, params) => {
        if (
          query.includes('SELECT * FROM budget_periods') &&
          query.includes('is_template = 0')
        ) {
          return Promise.resolve({ rows: mockPeriodsRows });
        }
        if (
          query.includes('SELECT * FROM budget_periods') &&
          params.includes('period-2025')
        ) {
          return Promise.resolve({ rows: [mockPeriodsRows[0]] });
        }
        if (query.includes('SELECT * FROM expenses')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const { result } = renderHook(() => useBudgetPeriods(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const periodData =
        await result.current.getExpensesForPeriod('period-2025');

      expect(periodData.monthlyPayments).toBeNull();
    });

    it('should map expense data structure correctly (snake_case to camelCase)', async () => {
      localDB.query.mockImplementation((query, params) => {
        if (
          query.includes('SELECT * FROM budget_periods') &&
          query.includes('is_template = 0')
        ) {
          return Promise.resolve({ rows: mockPeriodsRows });
        }
        if (
          query.includes('SELECT * FROM budget_periods') &&
          params.includes('period-2025')
        ) {
          return Promise.resolve({ rows: [mockPeriodsRows[0]] });
        }
        if (
          query.includes('SELECT * FROM expenses') &&
          query.includes('budget_period_id')
        ) {
          return Promise.resolve({ rows: mockExpensesRows });
        }
        return Promise.resolve({ rows: [] });
      });

      const { result } = renderHook(() => useBudgetPeriods(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const periodData =
        await result.current.getExpensesForPeriod('period-2025');

      // Check that snake_case fields are mapped to camelCase
      periodData.expenses.forEach(expense => {
        expect(expense).toHaveProperty('startMonth');
        expect(expense).toHaveProperty('endMonth');
        expect(expense).not.toHaveProperty('start_month');
        expect(expense).not.toHaveProperty('end_month');
      });
    });

    it('should return empty expenses array when period has no expenses', async () => {
      localDB.query.mockImplementation((query, params) => {
        if (
          query.includes('SELECT * FROM budget_periods') &&
          query.includes('is_template = 0')
        ) {
          return Promise.resolve({ rows: mockPeriodsRows });
        }
        if (
          query.includes('SELECT * FROM budget_periods') &&
          params.includes('period-2025')
        ) {
          return Promise.resolve({ rows: [mockPeriodsRows[0]] });
        }
        if (query.includes('SELECT * FROM expenses')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const { result } = renderHook(() => useBudgetPeriods(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const periodData =
        await result.current.getExpensesForPeriod('period-2025');

      expect(periodData.expenses).toEqual([]);
      expect(periodData.expenses).toHaveLength(0);
    });

    it('should order expenses by name', async () => {
      const unorderedExpenses = [
        {
          id: '1',
          name: 'Zzz Last',
          amount: 100,
          frequency: 'monthly',
          start_month: 1,
          end_month: 12,
        },
        {
          id: '2',
          name: 'Aaa First',
          amount: 200,
          frequency: 'monthly',
          start_month: 1,
          end_month: 12,
        },
        {
          id: '3',
          name: 'Mmm Middle',
          amount: 150,
          frequency: 'monthly',
          start_month: 1,
          end_month: 12,
        },
      ];

      localDB.query.mockImplementation((query, params) => {
        if (
          query.includes('SELECT * FROM budget_periods') &&
          query.includes('is_template = 0')
        ) {
          return Promise.resolve({ rows: mockPeriodsRows });
        }
        if (
          query.includes('SELECT * FROM budget_periods') &&
          params.includes('period-2025')
        ) {
          return Promise.resolve({ rows: [mockPeriodsRows[0]] });
        }
        if (
          query.includes('SELECT * FROM expenses') &&
          query.includes('ORDER BY name')
        ) {
          // Simulate database ordering
          const sorted = [...unorderedExpenses].sort((a, b) =>
            a.name.localeCompare(b.name)
          );
          return Promise.resolve({ rows: sorted });
        }
        return Promise.resolve({ rows: [] });
      });

      const { result } = renderHook(() => useBudgetPeriods(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const periodData =
        await result.current.getExpensesForPeriod('period-2025');

      expect(periodData.expenses[0].name).toBe('Aaa First');
      expect(periodData.expenses[1].name).toBe('Mmm Middle');
      expect(periodData.expenses[2].name).toBe('Zzz Last');
    });
  });

  describe('Initial Load', () => {
    it('should load all non-template periods', async () => {
      const { result } = renderHook(() => useBudgetPeriods(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.periods).toHaveLength(2);
      expect(result.current.periods[0].year).toBe(2025);
      expect(result.current.periods[1].year).toBe(2024);
    });

    it('should set active period to first active status', async () => {
      const { result } = renderHook(() => useBudgetPeriods(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.activePeriod).not.toBeNull();
      expect(result.current.activePeriod.status).toBe('active');
      expect(result.current.activePeriod.year).toBe(2025);
    });

    it('should handle no periods gracefully', async () => {
      localDB.query.mockResolvedValue({ rows: [] });

      const { result } = renderHook(() => useBudgetPeriods(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.periods).toEqual([]);
      expect(result.current.activePeriod).toBeNull();
    });

    it('should handle null userId', async () => {
      const { result } = renderHook(() => useBudgetPeriods(null));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.periods).toEqual([]);
      expect(localDB.query).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle database query errors in getExpensesForPeriod', async () => {
      localDB.query.mockImplementation((query, params) => {
        if (
          query.includes('SELECT * FROM budget_periods') &&
          query.includes('is_template = 0')
        ) {
          return Promise.resolve({ rows: mockPeriodsRows });
        }
        if (
          query.includes('SELECT * FROM budget_periods') &&
          params.includes('period-2025')
        ) {
          return Promise.reject(new Error('Database error'));
        }
        return Promise.resolve({ rows: [] });
      });

      const { result } = renderHook(() => useBudgetPeriods(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        result.current.getExpensesForPeriod('period-2025')
      ).rejects.toThrow('Database error');
    });

    it('should log errors to logger', async () => {
      const { logger } = await import('../utils/logger');

      localDB.query.mockImplementation((query, params) => {
        if (
          query.includes('SELECT * FROM budget_periods') &&
          query.includes('is_template = 0')
        ) {
          return Promise.resolve({ rows: mockPeriodsRows });
        }
        if (params && params.includes('period-2025')) {
          return Promise.reject(new Error('Database error'));
        }
        return Promise.resolve({ rows: [] });
      });

      const { result } = renderHook(() => useBudgetPeriods(mockUserId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      try {
        await result.current.getExpensesForPeriod('period-2025');
      } catch {
        // Expected error
      }

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error loading expenses for period'),
        expect.any(Error)
      );
    });
  });

  describe('Template Management', () => {
    describe('getTemplates', () => {
      it('should load all templates for user', async () => {
        const mockTemplates = [
          {
            id: 'template-1',
            user_id: mockUserId,
            year: 0,
            monthly_payment: 5700,
            previous_balance: 0,
            monthly_payments: null,
            status: 'active',
            is_template: 1,
            template_name: 'Basic Budget',
            template_description: 'Standard monthly expenses',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
          },
        ];

        localDB.query.mockImplementation(query => {
          if (
            query.includes('SELECT * FROM budget_periods') &&
            query.includes('is_template = 0')
          ) {
            return Promise.resolve({ rows: mockPeriodsRows });
          }
          if (
            query.includes('SELECT * FROM budget_periods') &&
            query.includes('is_template = 1')
          ) {
            return Promise.resolve({ rows: mockTemplates });
          }
          return Promise.resolve({ rows: [] });
        });

        const { result } = renderHook(() => useBudgetPeriods(mockUserId));

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        const templates = await result.current.getTemplates();

        expect(templates).toHaveLength(1);
        expect(templates[0]).toMatchObject({
          id: 'template-1',
          templateName: 'Basic Budget',
          templateDescription: 'Standard monthly expenses',
          monthlyPayment: 5700,
        });
      });

      it('should return empty array when no templates exist', async () => {
        localDB.query.mockImplementation(query => {
          if (
            query.includes('SELECT * FROM budget_periods') &&
            query.includes('is_template = 0')
          ) {
            return Promise.resolve({ rows: mockPeriodsRows });
          }
          if (
            query.includes('SELECT * FROM budget_periods') &&
            query.includes('is_template = 1')
          ) {
            return Promise.resolve({ rows: [] });
          }
          return Promise.resolve({ rows: [] });
        });

        const { result } = renderHook(() => useBudgetPeriods(mockUserId));

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        const templates = await result.current.getTemplates();
        expect(templates).toEqual([]);
      });

      it('should parse monthlyPayments JSONB in templates', async () => {
        const mockTemplates = [
          {
            id: 'template-1',
            user_id: mockUserId,
            year: 0,
            monthly_payment: 0,
            previous_balance: 0,
            monthly_payments: JSON.stringify([
              5000, 5500, 6000, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700,
              6000,
            ]),
            status: 'active',
            is_template: 1,
            template_name: 'Variable Budget',
            template_description: null,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
          },
        ];

        localDB.query.mockImplementation(query => {
          if (
            query.includes('SELECT * FROM budget_periods') &&
            query.includes('is_template = 0')
          ) {
            return Promise.resolve({ rows: mockPeriodsRows });
          }
          if (
            query.includes('SELECT * FROM budget_periods') &&
            query.includes('is_template = 1')
          ) {
            return Promise.resolve({ rows: mockTemplates });
          }
          return Promise.resolve({ rows: [] });
        });

        const { result } = renderHook(() => useBudgetPeriods(mockUserId));

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        const templates = await result.current.getTemplates();
        expect(templates[0].monthlyPayments).toEqual([
          5000, 5500, 6000, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700,
          6000,
        ]);
      });
    });

    describe('saveAsTemplate', () => {
      it('should create template from budget period successfully', async () => {
        let templateCreated = false;

        localDB.query.mockImplementation((query, params) => {
          if (
            query.includes('SELECT * FROM budget_periods') &&
            query.includes('is_template = 0')
          ) {
            return Promise.resolve({ rows: mockPeriodsRows });
          }
          // Get source period
          if (
            query.includes('SELECT * FROM budget_periods') &&
            params.includes('period-2025')
          ) {
            return Promise.resolve({ rows: [mockPeriodsRows[0]] });
          }
          // Insert template
          if (
            query.includes('INSERT INTO budget_periods') &&
            query.includes('is_template')
          ) {
            templateCreated = true;
            return Promise.resolve({ rows: [] });
          }
          // Copy expenses
          if (
            query.includes('SELECT * FROM expenses') &&
            query.includes('budget_period_id')
          ) {
            return Promise.resolve({ rows: mockExpensesRows });
          }
          if (query.includes('INSERT INTO expenses')) {
            return Promise.resolve({ rows: [] });
          }
          return Promise.resolve({ rows: [] });
        });

        const { result } = renderHook(() => useBudgetPeriods(mockUserId));

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        const templateResult = await result.current.saveAsTemplate(
          'period-2025',
          'My Template',
          'Test description'
        );

        expect(templateCreated).toBe(true);
        expect(templateResult).toMatchObject({
          id: 'test-uuid-123',
          templateName: 'My Template',
        });

        // Verify sync was called
        expect(mockSyncBudgetPeriods).toHaveBeenCalled();
      });

      it('should throw error when template name is missing', async () => {
        const { result } = renderHook(() => useBudgetPeriods(mockUserId));

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        await expect(
          result.current.saveAsTemplate('period-2025', '', 'Description')
        ).rejects.toThrow('Skabelon navn er påkrævet');
      });

      it('should throw error when source period not found', async () => {
        localDB.query.mockImplementation((query, params) => {
          if (
            query.includes('SELECT * FROM budget_periods') &&
            query.includes('is_template = 0')
          ) {
            return Promise.resolve({ rows: mockPeriodsRows });
          }
          if (
            query.includes('SELECT * FROM budget_periods') &&
            params.includes('non-existent')
          ) {
            return Promise.resolve({ rows: [] });
          }
          return Promise.resolve({ rows: [] });
        });

        const { result } = renderHook(() => useBudgetPeriods(mockUserId));

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        await expect(
          result.current.saveAsTemplate(
            'non-existent',
            'Template Name',
            'Description'
          )
        ).rejects.toThrow('Budget periode ikke fundet');
      });

      it('should create template with year=0 and previous_balance=0', async () => {
        let insertedData = null;

        localDB.query.mockImplementation((query, params) => {
          if (
            query.includes('SELECT * FROM budget_periods') &&
            query.includes('is_template = 0')
          ) {
            return Promise.resolve({ rows: mockPeriodsRows });
          }
          if (
            query.includes('SELECT * FROM budget_periods') &&
            params.includes('period-2025')
          ) {
            return Promise.resolve({ rows: [mockPeriodsRows[0]] });
          }
          if (query.includes('INSERT INTO budget_periods')) {
            insertedData = params;
            return Promise.resolve({ rows: [] });
          }
          if (
            query.includes('SELECT * FROM expenses') &&
            query.includes('budget_period_id')
          ) {
            return Promise.resolve({ rows: [] });
          }
          return Promise.resolve({ rows: [] });
        });

        const { result } = renderHook(() => useBudgetPeriods(mockUserId));

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        await result.current.saveAsTemplate(
          'period-2025',
          'Template Name',
          'Description'
        );

        expect(insertedData).toContain(0); // year = 0
        expect(insertedData[4]).toBe(0); // previous_balance = 0
        expect(insertedData[8]).toBe('Template Name');
      });
    });

    describe('deleteTemplate', () => {
      it('should delete template successfully', async () => {
        let templateDeleted = false;

        localDB.query.mockImplementation(query => {
          if (
            query.includes('SELECT * FROM budget_periods') &&
            query.includes('is_template = 0')
          ) {
            return Promise.resolve({ rows: mockPeriodsRows });
          }
          if (
            query.includes('DELETE FROM budget_periods') &&
            query.includes('is_template = 1')
          ) {
            templateDeleted = true;
            return Promise.resolve({ rows: [] });
          }
          return Promise.resolve({ rows: [] });
        });

        const { result } = renderHook(() => useBudgetPeriods(mockUserId));

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        await result.current.deleteTemplate('template-123');

        expect(templateDeleted).toBe(true);

        // Verify sync was called
        expect(mockSyncBudgetPeriods).toHaveBeenCalled();
      });
    });

    describe('createFromTemplate', () => {
      it('should create new period from template with all expenses', async () => {
        const mockTemplate = {
          id: 'template-1',
          user_id: mockUserId,
          year: 0,
          monthly_payment: 5700,
          previous_balance: 0,
          monthly_payments: null,
          status: 'active',
          is_template: 1,
        };

        let periodCreated = false;

        localDB.query.mockImplementation((query, params) => {
          if (
            query.includes('SELECT * FROM budget_periods') &&
            query.includes('is_template = 0')
          ) {
            return Promise.resolve({ rows: mockPeriodsRows });
          }
          // Get template
          if (
            query.includes('SELECT * FROM budget_periods') &&
            query.includes('is_template = 1') &&
            params.includes('template-1')
          ) {
            return Promise.resolve({ rows: [mockTemplate] });
          }
          // Check year exists
          if (
            query.includes('SELECT id FROM budget_periods') &&
            params.includes(2026)
          ) {
            return Promise.resolve({ rows: [] });
          }
          // Create period
          if (
            query.includes('INSERT INTO budget_periods') &&
            params.includes(2026)
          ) {
            periodCreated = true;
            return Promise.resolve({ rows: [] });
          }
          // Copy expenses
          if (
            query.includes('SELECT * FROM expenses') &&
            query.includes('budget_period_id')
          ) {
            return Promise.resolve({ rows: mockExpensesRows });
          }
          if (query.includes('INSERT INTO expenses')) {
            return Promise.resolve({ rows: [] });
          }
          return Promise.resolve({ rows: [] });
        });

        const { result } = renderHook(() => useBudgetPeriods(mockUserId));

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        const newPeriod = await result.current.createFromTemplate({
          templateId: 'template-1',
          year: 2026,
          previousBalance: 1000,
        });

        expect(periodCreated).toBe(true);
        expect(newPeriod).toMatchObject({
          id: 'test-uuid-123',
          year: 2026,
          status: 'active',
        });
      });

      it('should create period with selected expenses only', async () => {
        const mockTemplate = {
          id: 'template-1',
          user_id: mockUserId,
          year: 0,
          monthly_payment: 5700,
          previous_balance: 0,
          monthly_payments: null,
          status: 'active',
          is_template: 1,
        };

        const selectedExpenseIds = ['expense-1']; // Only copy first expense

        let copiedExpenseIds = [];

        localDB.query.mockImplementation((query, params) => {
          if (
            query.includes('SELECT * FROM budget_periods') &&
            query.includes('is_template = 0')
          ) {
            return Promise.resolve({ rows: mockPeriodsRows });
          }
          if (
            query.includes('SELECT * FROM budget_periods') &&
            query.includes('is_template = 1') &&
            params.includes('template-1')
          ) {
            return Promise.resolve({ rows: [mockTemplate] });
          }
          if (
            query.includes('SELECT id FROM budget_periods') &&
            params.includes(2026)
          ) {
            return Promise.resolve({ rows: [] });
          }
          if (query.includes('INSERT INTO budget_periods')) {
            return Promise.resolve({ rows: [] });
          }
          // Selective copy
          if (
            query.includes('SELECT * FROM expenses') &&
            query.includes('budget_period_id') &&
            query.includes('id IN')
          ) {
            return Promise.resolve({ rows: [mockExpensesRows[0]] }); // Only first expense
          }
          if (query.includes('INSERT INTO expenses')) {
            copiedExpenseIds.push(params[2]); // Track copied expense names
            return Promise.resolve({ rows: [] });
          }
          return Promise.resolve({ rows: [] });
        });

        const { result } = renderHook(() => useBudgetPeriods(mockUserId));

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        await result.current.createFromTemplate({
          templateId: 'template-1',
          year: 2026,
          previousBalance: 1000,
          selectedExpenseIds,
        });

        // Verify only selected expense was copied
        expect(copiedExpenseIds).toHaveLength(1);
        expect(copiedExpenseIds[0]).toBe('Netflix');
      });

      it('should throw error when template not found', async () => {
        localDB.query.mockImplementation(query => {
          if (
            query.includes('SELECT * FROM budget_periods') &&
            query.includes('is_template = 0')
          ) {
            return Promise.resolve({ rows: mockPeriodsRows });
          }
          if (
            query.includes('SELECT * FROM budget_periods') &&
            query.includes('is_template = 1')
          ) {
            return Promise.resolve({ rows: [] });
          }
          return Promise.resolve({ rows: [] });
        });

        const { result } = renderHook(() => useBudgetPeriods(mockUserId));

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        await expect(
          result.current.createFromTemplate({
            templateId: 'non-existent',
            year: 2026,
            previousBalance: 0,
          })
        ).rejects.toThrow('Skabelon ikke fundet');
      });

      it('should throw error when year already exists', async () => {
        const mockTemplate = {
          id: 'template-1',
          user_id: mockUserId,
          year: 0,
          monthly_payment: 5700,
          previous_balance: 0,
          monthly_payments: null,
          status: 'active',
          is_template: 1,
        };

        localDB.query.mockImplementation((query, params) => {
          if (
            query.includes('SELECT * FROM budget_periods') &&
            query.includes('is_template = 0')
          ) {
            return Promise.resolve({ rows: mockPeriodsRows });
          }
          if (
            query.includes('SELECT * FROM budget_periods') &&
            query.includes('is_template = 1')
          ) {
            return Promise.resolve({ rows: [mockTemplate] });
          }
          if (
            query.includes('SELECT id FROM budget_periods') &&
            params.includes(2025)
          ) {
            return Promise.resolve({ rows: [{ id: 'period-2025' }] }); // Year already exists
          }
          return Promise.resolve({ rows: [] });
        });

        const { result } = renderHook(() => useBudgetPeriods(mockUserId));

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        await expect(
          result.current.createFromTemplate({
            templateId: 'template-1',
            year: 2025, // Already exists
            previousBalance: 0,
          })
        ).rejects.toThrow('Budget for år 2025 findes allerede');
      });

      it('should copy template settings to new period', async () => {
        const mockTemplate = {
          id: 'template-1',
          user_id: mockUserId,
          year: 0,
          monthly_payment: 6200,
          previous_balance: 0,
          monthly_payments: JSON.stringify([
            5000, 5500, 6000, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700,
            6000,
          ]),
          status: 'active',
          is_template: 1,
        };

        let insertedPeriodData = null;

        localDB.query.mockImplementation((query, params) => {
          if (
            query.includes('SELECT * FROM budget_periods') &&
            query.includes('is_template = 0')
          ) {
            return Promise.resolve({ rows: mockPeriodsRows });
          }
          if (
            query.includes('SELECT * FROM budget_periods') &&
            query.includes('is_template = 1')
          ) {
            return Promise.resolve({ rows: [mockTemplate] });
          }
          if (
            query.includes('SELECT id FROM budget_periods') &&
            params.includes(2026)
          ) {
            return Promise.resolve({ rows: [] });
          }
          if (
            query.includes('INSERT INTO budget_periods') &&
            params.includes(2026)
          ) {
            insertedPeriodData = params;
            return Promise.resolve({ rows: [] });
          }
          if (
            query.includes('SELECT * FROM expenses') &&
            query.includes('budget_period_id')
          ) {
            return Promise.resolve({ rows: [] });
          }
          return Promise.resolve({ rows: [] });
        });

        const { result } = renderHook(() => useBudgetPeriods(mockUserId));

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        await result.current.createFromTemplate({
          templateId: 'template-1',
          year: 2026,
          previousBalance: 2000,
        });

        // Verify settings were copied from template
        expect(insertedPeriodData[2]).toBe(2026); // year
        expect(insertedPeriodData[3]).toBe(6200); // monthly_payment from template
        expect(insertedPeriodData[4]).toBe(2000); // previous_balance from param
        expect(insertedPeriodData[5]).toContain('[5000,5500,6000'); // monthly_payments from template
      });
    });
  });
});
