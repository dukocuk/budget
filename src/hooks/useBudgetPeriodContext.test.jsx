/**
 * Tests for useBudgetPeriodContext consumer hook
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBudgetPeriodContext } from './useBudgetPeriodContext';
import { BudgetPeriodProvider } from '../contexts/BudgetPeriodProvider';
import { SyncProvider } from '../contexts/SyncContext';

describe('useBudgetPeriodContext', () => {
  it('throws error when used outside BudgetPeriodProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useBudgetPeriodContext());
    }).toThrow(
      'useBudgetPeriodContext must be used within a BudgetPeriodProvider'
    );

    consoleSpy.mockRestore();
  });

  it('returns budget period context when used within BudgetPeriodProvider', () => {
    const mockUser = { id: 'test-user', name: 'Test User' };
    const wrapper = ({ children }) => (
      <SyncProvider user={mockUser}>
        <BudgetPeriodProvider userId="test-user">
          {children}
        </BudgetPeriodProvider>
      </SyncProvider>
    );

    const { result } = renderHook(() => useBudgetPeriodContext(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current.periods).toBeDefined();
    expect(result.current.activePeriod).toBeDefined();
    expect(result.current.createPeriod).toBeDefined();
    expect(result.current.updatePeriod).toBeDefined();
    expect(result.current.archivePeriod).toBeDefined();
    expect(typeof result.current.createPeriod).toBe('function');
    expect(typeof result.current.updatePeriod).toBe('function');
    expect(typeof result.current.archivePeriod).toBe('function');
  });

  it('provides loading and error states', () => {
    const mockUser = { id: 'test-user', name: 'Test User' };
    const wrapper = ({ children }) => (
      <SyncProvider user={mockUser}>
        <BudgetPeriodProvider userId="test-user">
          {children}
        </BudgetPeriodProvider>
      </SyncProvider>
    );

    const { result } = renderHook(() => useBudgetPeriodContext(), { wrapper });

    expect(result.current.loading).toBeDefined();
    expect(result.current.error).toBeDefined();
    expect(typeof result.current.loading).toBe('boolean');
  });
});
