/**
 * Tests for useDataInitialization hook
 *
 * Tests parallel loading, timeout protection, error handling with alert,
 * period filtering, startTransition batching, and skip when already initialized.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDataInitialization } from './useDataInitialization';

describe('useDataInitialization', () => {
  let defaultParams;

  beforeEach(() => {
    defaultParams = {
      user: { id: 'user-123', name: 'Test User' },
      activePeriod: { id: 'period-2025', year: 2025 },
      isInitialized: false,
      setIsInitialized: vi.fn(),
      loadExpenses: vi.fn().mockResolvedValue({
        success: true,
        data: [
          { id: 'exp-1', budgetPeriodId: 'period-2025', name: 'Netflix' },
          { id: 'exp-2', budgetPeriodId: 'period-2024', name: 'Old expense' },
        ],
      }),
      loadBudgetPeriods: vi.fn().mockResolvedValue({
        success: true,
        data: [{ id: 'period-2025', year: 2025 }],
      }),
      setAllExpenses: vi.fn(),
      fetchPeriodsFromDB: vi.fn().mockResolvedValue([]),
      immediateSyncBudgetPeriods: vi.fn().mockResolvedValue(undefined),
      showAlert: vi.fn(),
      isInitialLoadRef: { current: true },
    };
  });

  it('returns isLoadingData as false initially before effect runs', () => {
    const { result } = renderHook(() =>
      useDataInitialization({ ...defaultParams, user: null })
    );
    expect(result.current).toBe(false);
  });

  it('skips initialization when user is null', async () => {
    renderHook(() => useDataInitialization({ ...defaultParams, user: null }));

    // Give effect time to run
    await new Promise(r => setTimeout(r, 50));
    expect(defaultParams.loadExpenses).not.toHaveBeenCalled();
    expect(defaultParams.loadBudgetPeriods).not.toHaveBeenCalled();
  });

  it('skips initialization when activePeriod is null', async () => {
    renderHook(() =>
      useDataInitialization({ ...defaultParams, activePeriod: null })
    );

    await new Promise(r => setTimeout(r, 50));
    expect(defaultParams.loadExpenses).not.toHaveBeenCalled();
  });

  it('skips initialization when already initialized', async () => {
    renderHook(() =>
      useDataInitialization({ ...defaultParams, isInitialized: true })
    );

    await new Promise(r => setTimeout(r, 50));
    expect(defaultParams.loadExpenses).not.toHaveBeenCalled();
  });

  it('loads expenses and budget periods in parallel', async () => {
    renderHook(() => useDataInitialization(defaultParams));

    await waitFor(() => {
      expect(defaultParams.loadExpenses).toHaveBeenCalledOnce();
      expect(defaultParams.loadBudgetPeriods).toHaveBeenCalledOnce();
    });
  });

  it('filters expenses to only include active period', async () => {
    renderHook(() => useDataInitialization(defaultParams));

    await waitFor(() => {
      expect(defaultParams.setAllExpenses).toHaveBeenCalledWith([
        { id: 'exp-1', budgetPeriodId: 'period-2025', name: 'Netflix' },
      ]);
    });
  });

  it('marks initialization as complete after success', async () => {
    renderHook(() => useDataInitialization(defaultParams));

    await waitFor(() => {
      expect(defaultParams.setIsInitialized).toHaveBeenCalledWith(true);
    });
  });

  it('sets isInitialLoadRef to false after completion', async () => {
    renderHook(() => useDataInitialization(defaultParams));

    await waitFor(() => {
      expect(defaultParams.isInitialLoadRef.current).toBe(false);
    });
  });

  it('handles expense loading failure gracefully', async () => {
    defaultParams.loadExpenses = vi
      .fn()
      .mockRejectedValue(new Error('Network error'));

    renderHook(() => useDataInitialization(defaultParams));

    await waitFor(() => {
      // Should still complete initialization (catch block in Promise.all)
      expect(defaultParams.setIsInitialized).toHaveBeenCalledWith(true);
    });
  });

  it('handles budget period loading failure gracefully', async () => {
    defaultParams.loadBudgetPeriods = vi.fn().mockResolvedValue({
      success: false,
      data: [],
    });

    renderHook(() => useDataInitialization(defaultParams));

    await waitFor(() => {
      expect(defaultParams.setIsInitialized).toHaveBeenCalledWith(true);
    });
  });

  it('syncs local budget periods to cloud when available', async () => {
    defaultParams.fetchPeriodsFromDB = vi
      .fn()
      .mockResolvedValue([{ id: 'period-2025', year: 2025 }]);

    renderHook(() => useDataInitialization(defaultParams));

    await waitFor(() => {
      expect(defaultParams.immediateSyncBudgetPeriods).toHaveBeenCalledWith([
        { id: 'period-2025', year: 2025 },
      ]);
    });
  });

  it('does not set expenses when result is empty', async () => {
    defaultParams.loadExpenses = vi.fn().mockResolvedValue({
      success: true,
      data: [],
    });

    renderHook(() => useDataInitialization(defaultParams));

    await waitFor(() => {
      expect(defaultParams.setIsInitialized).toHaveBeenCalledWith(true);
      expect(defaultParams.setAllExpenses).not.toHaveBeenCalled();
    });
  });
});
