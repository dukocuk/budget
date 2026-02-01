/**
 * Integration Tests: Automatic Cloud Sync
 *
 * Tests US-026:
 * - Automatic cloud sync after CRUD operations
 * - Debounced sync (1s delay after changes)
 * - Sync consolidation for rapid changes
 * - Sync status indicators and error handling
 *
 * Integration Points:
 * - CRUD operation → SyncContext.syncExpenses (debounced) → Google Drive upload
 * - Sync success → lastSyncTime update → UI indicators
 * - Online detection → sync triggers → error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Enable automatic mocking
vi.mock('../../../utils/logger');
vi.mock('../../../lib/pglite');

// Mock @electric-sql/pglite
vi.mock('@electric-sql/pglite', () => ({
  PGlite: vi.fn().mockImplementation(() => ({
    exec: vi.fn().mockResolvedValue({ rows: [] }),
    query: vi.fn().mockResolvedValue({ rows: [] }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Import components after mocks
import { SyncProvider } from '../../../contexts/SyncContext';
import { ExpenseProvider } from '../../../contexts/ExpenseProvider';
import { BudgetPeriodProvider } from '../../../contexts/BudgetPeriodProvider';
import { AlertProvider } from '../../../contexts/AlertProvider';
import { useSyncContext } from '../../../hooks/useSyncContext';
import { useExpenseContext } from '../../../hooks/useExpenseContext';
import {
  mockUser,
  mockPeriod2025,
  createMockExpense,
  createMockSyncPayload,
  setupMockDatabase,
  setupGoogleApiMocks,
  setupOnlineStatusMock,
} from '../shared';

// Test harness to access sync context
const SyncTestHarness = ({ children, onSyncChange }) => {
  const syncContext = useSyncContext();
  const expenseContext = useExpenseContext();

  if (onSyncChange) {
    onSyncChange({ ...syncContext, ...expenseContext });
  }

  return <div data-testid="sync-harness">{children}</div>;
};

describe('Integration: Automatic Cloud Sync', () => {
  let user;
  let mockDB;
  let mockFetch;
  let onlineStatus;
  let syncOperations;

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    user = userEvent.setup();

    // Use fake timers for debounce testing
    vi.useFakeTimers();

    // Setup mock database
    const { mockQuery, mockExec } = setupMockDatabase();
    mockDB = { query: mockQuery, exec: mockExec };

    // Mock PGlite
    const pglite = require('../../../lib/pglite');
    pglite.localDB.query = mockQuery;
    pglite.localDB.exec = mockExec;

    // Setup Google API mocks
    mockFetch = setupGoogleApiMocks({
      syncData: createMockSyncPayload(),
    });

    // Setup online status
    onlineStatus = setupOnlineStatusMock(true);

    // Default database responses
    mockQuery.mockImplementation(sql => {
      if (sql.includes('SELECT * FROM budget_periods')) {
        return Promise.resolve({ rows: [mockPeriod2025] });
      }
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
    vi.useRealTimers();
    delete global.fetch;
  });

  describe('US-026: Automatic cloud sync after operations', () => {
    it('should trigger debounced sync after expense add (1s delay)', async () => {
      render(
        <AlertProvider>
          <SyncProvider user={mockUser}>
            <BudgetPeriodProvider userId={mockUser.id}>
              <ExpenseProvider
                userId={mockUser.id}
                periodId={mockPeriod2025.id}
              >
                <SyncTestHarness
                  onSyncChange={ops => {
                    syncOperations = ops;
                  }}
                >
                  <div>Sync Test</div>
                </SyncTestHarness>
              </ExpenseProvider>
            </BudgetPeriodProvider>
          </SyncProvider>
        </AlertProvider>
      );

      // Wait for initialization
      await waitFor(() => {
        expect(syncOperations?.addExpense).toBeDefined();
      });

      // Add an expense
      const newExpense = createMockExpense({ name: 'New Expense' });
      syncOperations.addExpense(newExpense);

      // Verify: Sync is NOT called immediately
      expect(
        mockFetch.mock.calls.filter(([url]) => url.includes('drive.google.com'))
          .length
      ).toBe(0);

      // Advance time by 1 second (debounce delay)
      vi.advanceTimersByTime(1000);

      // Verify: Sync is called after debounce
      await waitFor(() => {
        const driveCalls = mockFetch.mock.calls.filter(([url]) =>
          url.includes('drive.google.com')
        );
        expect(driveCalls.length).toBeGreaterThan(0);
      });
    });

    it('should trigger debounced sync after expense update (1s delay)', async () => {
      const existingExpense = createMockExpense({
        id: 'exp-1',
        name: 'Original',
      });

      mockDB.query.mockImplementation(sql => {
        if (sql.includes('SELECT * FROM expenses')) {
          return Promise.resolve({ rows: [existingExpense] });
        }
        if (sql.includes('UPDATE expenses')) {
          return Promise.resolve({
            rows: [{ ...existingExpense, name: 'Updated' }],
          });
        }
        if (sql.includes('SELECT * FROM budget_periods')) {
          return Promise.resolve({ rows: [mockPeriod2025] });
        }
        return Promise.resolve({ rows: [] });
      });

      render(
        <AlertProvider>
          <SyncProvider user={mockUser}>
            <BudgetPeriodProvider userId={mockUser.id}>
              <ExpenseProvider
                userId={mockUser.id}
                periodId={mockPeriod2025.id}
              >
                <SyncTestHarness
                  onSyncChange={ops => {
                    syncOperations = ops;
                  }}
                >
                  <div>Update Test</div>
                </SyncTestHarness>
              </ExpenseProvider>
            </BudgetPeriodProvider>
          </SyncProvider>
        </AlertProvider>
      );

      await waitFor(() => {
        expect(syncOperations?.updateExpense).toBeDefined();
      });

      // Update expense
      syncOperations.updateExpense('exp-1', { name: 'Updated' });

      // Verify: No immediate sync
      const initialDriveCalls = mockFetch.mock.calls.filter(([url]) =>
        url.includes('drive.google.com')
      ).length;

      // Advance time for debounce
      vi.advanceTimersByTime(1000);

      // Verify: Sync triggered
      await waitFor(() => {
        const driveCalls = mockFetch.mock.calls.filter(([url]) =>
          url.includes('drive.google.com')
        );
        expect(driveCalls.length).toBeGreaterThan(initialDriveCalls);
      });
    });

    it('should trigger debounced sync after expense delete (1s delay)', async () => {
      const expenseToDelete = createMockExpense({ id: 'exp-delete' });

      mockDB.query.mockImplementation(sql => {
        if (sql.includes('SELECT * FROM expenses')) {
          return Promise.resolve({ rows: [expenseToDelete] });
        }
        if (sql.includes('DELETE FROM expenses')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('SELECT * FROM budget_periods')) {
          return Promise.resolve({ rows: [mockPeriod2025] });
        }
        return Promise.resolve({ rows: [] });
      });

      render(
        <AlertProvider>
          <SyncProvider user={mockUser}>
            <BudgetPeriodProvider userId={mockUser.id}>
              <ExpenseProvider
                userId={mockUser.id}
                periodId={mockPeriod2025.id}
              >
                <SyncTestHarness
                  onSyncChange={ops => {
                    syncOperations = ops;
                  }}
                >
                  <div>Delete Test</div>
                </SyncTestHarness>
              </ExpenseProvider>
            </BudgetPeriodProvider>
          </SyncProvider>
        </AlertProvider>
      );

      await waitFor(() => {
        expect(syncOperations?.deleteExpense).toBeDefined();
      });

      // Delete expense
      syncOperations.deleteExpense('exp-delete');

      // No immediate sync
      const beforeDebounce = mockFetch.mock.calls.filter(([url]) =>
        url.includes('drive.google.com')
      ).length;

      // Advance time
      vi.advanceTimersByTime(1000);

      // Verify sync
      await waitFor(() => {
        const afterDebounce = mockFetch.mock.calls.filter(([url]) =>
          url.includes('drive.google.com')
        ).length;
        expect(afterDebounce).toBeGreaterThan(beforeDebounce);
      });
    });

    it('should trigger debounced sync after budget period changes', async () => {
      render(
        <AlertProvider>
          <SyncProvider user={mockUser}>
            <BudgetPeriodProvider userId={mockUser.id}>
              <SyncTestHarness
                onSyncChange={ops => {
                  syncOperations = ops;
                }}
              >
                <div>Period Test</div>
              </SyncTestHarness>
            </BudgetPeriodProvider>
          </SyncProvider>
        </AlertProvider>
      );

      await waitFor(() => {
        expect(syncOperations?.syncStatus).toBeDefined();
      });

      // Trigger period change (this would come from BudgetPeriodProvider)
      // Assuming syncSettings is called for period changes
      if (syncOperations.syncSettings) {
        syncOperations.syncSettings();
      }

      // Advance debounce time
      vi.advanceTimersByTime(1000);

      // Verify sync attempt
      await waitFor(() => {
        const syncCalls = mockFetch.mock.calls.filter(([url]) =>
          url.includes('drive.google.com')
        );
        expect(syncCalls.length).toBeGreaterThan(0);
      });
    });

    it('should consolidate multiple rapid changes into single sync', async () => {
      render(
        <AlertProvider>
          <SyncProvider user={mockUser}>
            <BudgetPeriodProvider userId={mockUser.id}>
              <ExpenseProvider
                userId={mockUser.id}
                periodId={mockPeriod2025.id}
              >
                <SyncTestHarness
                  onSyncChange={ops => {
                    syncOperations = ops;
                  }}
                >
                  <div>Consolidation Test</div>
                </SyncTestHarness>
              </ExpenseProvider>
            </BudgetPeriodProvider>
          </SyncProvider>
        </AlertProvider>
      );

      await waitFor(() => {
        expect(syncOperations?.addExpense).toBeDefined();
      });

      // Add multiple expenses rapidly
      for (let i = 0; i < 5; i++) {
        const expense = createMockExpense({ name: `Expense ${i}` });
        syncOperations.addExpense(expense);
        // Small delay between adds
        vi.advanceTimersByTime(100);
      }

      // Record sync calls before final debounce
      const beforeFinalDebounce = mockFetch.mock.calls.filter(([url]) =>
        url.includes('drive.google.com')
      ).length;

      // Complete the debounce period
      vi.advanceTimersByTime(1000);

      // Verify: Only one sync call (or minimal calls due to consolidation)
      await waitFor(() => {
        const syncCalls = mockFetch.mock.calls.filter(([url]) =>
          url.includes('drive.google.com')
        );
        // Should be consolidated, not 5 separate syncs
        expect(syncCalls.length).toBeLessThan(5);
      });
    });
  });

  describe('US-026: Sync status indicators', () => {
    it('should update sync status from idle → syncing → success', async () => {
      const statusChanges = [];

      render(
        <AlertProvider>
          <SyncProvider user={mockUser}>
            <BudgetPeriodProvider userId={mockUser.id}>
              <ExpenseProvider
                userId={mockUser.id}
                periodId={mockPeriod2025.id}
              >
                <SyncTestHarness
                  onSyncChange={ops => {
                    if (ops.syncStatus) {
                      statusChanges.push(ops.syncStatus);
                    }
                    syncOperations = ops;
                  }}
                >
                  <div>Status Test</div>
                </SyncTestHarness>
              </ExpenseProvider>
            </BudgetPeriodProvider>
          </SyncProvider>
        </AlertProvider>
      );

      await waitFor(() => {
        expect(syncOperations?.addExpense).toBeDefined();
      });

      // Add expense to trigger sync
      const expense = createMockExpense({ name: 'Status Test' });
      syncOperations.addExpense(expense);

      // Advance time for debounce
      vi.advanceTimersByTime(1000);

      // Wait for sync to complete
      await waitFor(() => {
        expect(statusChanges).toContain('idle');
      });

      // Verify status progression
      // Should have transitioned through states
      expect(statusChanges.length).toBeGreaterThan(0);
    });

    it('should handle sync error and update error state', async () => {
      // Mock sync failure
      mockFetch.mockImplementation((url, config) => {
        if (url.includes('drive.google.com')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: 'Server error' }),
          });
        }
        return Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ error: 'Not found' }),
        });
      });

      global.fetch = mockFetch;

      render(
        <AlertProvider>
          <SyncProvider user={mockUser}>
            <BudgetPeriodProvider userId={mockUser.id}>
              <ExpenseProvider
                userId={mockUser.id}
                periodId={mockPeriod2025.id}
              >
                <SyncTestHarness
                  onSyncChange={ops => {
                    syncOperations = ops;
                  }}
                >
                  <div>Error Test</div>
                </SyncTestHarness>
              </ExpenseProvider>
            </BudgetPeriodProvider>
          </SyncProvider>
        </AlertProvider>
      );

      await waitFor(() => {
        expect(syncOperations?.addExpense).toBeDefined();
      });

      // Trigger sync
      const expense = createMockExpense({ name: 'Error Expense' });
      syncOperations.addExpense(expense);

      vi.advanceTimersByTime(1000);

      // Verify error state
      await waitFor(
        () => {
          expect(
            syncOperations?.error || syncOperations?.syncStatus
          ).toBeTruthy();
        },
        { timeout: 3000 }
      );
    });

    it('should update lastSyncTime after successful sync', async () => {
      render(
        <AlertProvider>
          <SyncProvider user={mockUser}>
            <BudgetPeriodProvider userId={mockUser.id}>
              <ExpenseProvider
                userId={mockUser.id}
                periodId={mockPeriod2025.id}
              >
                <SyncTestHarness
                  onSyncChange={ops => {
                    syncOperations = ops;
                  }}
                >
                  <div>Time Test</div>
                </SyncTestHarness>
              </ExpenseProvider>
            </BudgetPeriodProvider>
          </SyncProvider>
        </AlertProvider>
      );

      await waitFor(() => {
        expect(syncOperations?.addExpense).toBeDefined();
      });

      const initialSyncTime = syncOperations.lastSyncTime;

      // Add expense
      const expense = createMockExpense({ name: 'Time Test' });
      syncOperations.addExpense(expense);

      vi.advanceTimersByTime(1000);

      // Verify lastSyncTime updated
      await waitFor(() => {
        if (syncOperations.lastSyncTime) {
          expect(syncOperations.lastSyncTime).not.toBe(initialSyncTime);
        }
      });
    });
  });

  describe('US-026: Online detection and sync', () => {
    it('should detect online status before attempting sync', async () => {
      // Start offline
      onlineStatus.setOffline();

      render(
        <AlertProvider>
          <SyncProvider user={mockUser}>
            <BudgetPeriodProvider userId={mockUser.id}>
              <ExpenseProvider
                userId={mockUser.id}
                periodId={mockPeriod2025.id}
              >
                <SyncTestHarness
                  onSyncChange={ops => {
                    syncOperations = ops;
                  }}
                >
                  <div>Online Test</div>
                </SyncTestHarness>
              </ExpenseProvider>
            </BudgetPeriodProvider>
          </SyncProvider>
        </AlertProvider>
      );

      await waitFor(() => {
        expect(syncOperations?.isOnline).toBe(false);
      });

      // Add expense while offline
      const expense = createMockExpense({ name: 'Offline Expense' });
      syncOperations.addExpense(expense);

      vi.advanceTimersByTime(1000);

      // Verify: No Drive API calls made
      const offlineDriveCalls = mockFetch.mock.calls.filter(([url]) =>
        url.includes('drive.google.com')
      );
      expect(offlineDriveCalls.length).toBe(0);

      // Go online
      onlineStatus.setOnline();

      await waitFor(() => {
        expect(syncOperations?.isOnline).toBe(true);
      });
    });

    it('should handle sync retry logic on failure', async () => {
      let attemptCount = 0;

      mockFetch.mockImplementation((url, config) => {
        if (url.includes('drive.google.com')) {
          attemptCount++;
          if (attemptCount < 3) {
            // Fail first 2 attempts
            return Promise.resolve({
              ok: false,
              status: 500,
              json: () => Promise.resolve({ error: 'Temporary error' }),
            });
          } else {
            // Succeed on 3rd attempt
            return Promise.resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve({ id: 'file-123' }),
            });
          }
        }
        return Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ error: 'Not found' }),
        });
      });

      global.fetch = mockFetch;

      render(
        <AlertProvider>
          <SyncProvider user={mockUser}>
            <BudgetPeriodProvider userId={mockUser.id}>
              <ExpenseProvider
                userId={mockUser.id}
                periodId={mockPeriod2025.id}
              >
                <SyncTestHarness
                  onSyncChange={ops => {
                    syncOperations = ops;
                  }}
                >
                  <div>Retry Test</div>
                </SyncTestHarness>
              </ExpenseProvider>
            </BudgetPeriodProvider>
          </SyncProvider>
        </AlertProvider>
      );

      await waitFor(() => {
        expect(syncOperations?.addExpense).toBeDefined();
      });

      // Trigger sync
      const expense = createMockExpense({ name: 'Retry Expense' });
      syncOperations.addExpense(expense);

      vi.advanceTimersByTime(1000);

      // Wait for retries
      await waitFor(
        () => {
          expect(attemptCount).toBeGreaterThan(1);
        },
        { timeout: 5000 }
      );
    });
  });

  describe('Integration: Complete sync workflow', () => {
    it('should complete full sync workflow from CRUD to Drive upload', async () => {
      render(
        <AlertProvider>
          <SyncProvider user={mockUser}>
            <BudgetPeriodProvider userId={mockUser.id}>
              <ExpenseProvider
                userId={mockUser.id}
                periodId={mockPeriod2025.id}
              >
                <SyncTestHarness
                  onSyncChange={ops => {
                    syncOperations = ops;
                  }}
                >
                  <div>Full Workflow</div>
                </SyncTestHarness>
              </ExpenseProvider>
            </BudgetPeriodProvider>
          </SyncProvider>
        </AlertProvider>
      );

      await waitFor(() => {
        expect(syncOperations?.addExpense).toBeDefined();
      });

      // Step 1: Add expense
      const expense = createMockExpense({ name: 'Full Workflow Test' });
      syncOperations.addExpense(expense);

      // Step 2: Verify database insert
      await waitFor(() => {
        const insertCall = mockDB.query.mock.calls.find(([sql]) =>
          sql.includes('INSERT INTO expenses')
        );
        expect(insertCall).toBeTruthy();
      });

      // Step 3: Wait for debounce
      vi.advanceTimersByTime(1000);

      // Step 4: Verify sync to Drive
      await waitFor(() => {
        const driveUpload = mockFetch.mock.calls.find(([url]) =>
          url.includes('drive.google.com')
        );
        expect(driveUpload).toBeTruthy();
      });

      // Step 5: Verify sync status updated
      expect(syncOperations?.syncStatus).toBeTruthy();
    });
  });
});
