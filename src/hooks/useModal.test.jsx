/**
 * Tests for useModal consumer hook
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useModal } from './useModal';
import { ModalProvider } from '../contexts/ModalProvider';

describe('useModal', () => {
  it('throws error when used outside ModalProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useModal());
    }).toThrow('useModal must be used within a ModalProvider');

    consoleSpy.mockRestore();
  });

  it('returns modal context when used within ModalProvider', () => {
    const wrapper = ({ children }) => <ModalProvider>{children}</ModalProvider>;

    const { result } = renderHook(() => useModal(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current.openAddExpenseModal).toBeDefined();
    expect(result.current.closeAddExpenseModal).toBeDefined();
    expect(result.current.openSettingsModal).toBeDefined();
    expect(result.current.closeSettingsModal).toBeDefined();
    expect(typeof result.current.openAddExpenseModal).toBe('function');
    expect(typeof result.current.closeAddExpenseModal).toBe('function');
  });

  it('provides access to all modal state properties', () => {
    const wrapper = ({ children }) => <ModalProvider>{children}</ModalProvider>;

    const { result } = renderHook(() => useModal(), { wrapper });

    // Check that all expected modal properties exist
    expect(result.current).toHaveProperty('addExpenseModal');
    expect(result.current).toHaveProperty('showSettingsModal');
    expect(result.current).toHaveProperty('showCreateYearModal');
    expect(result.current).toHaveProperty('showTemplateManagerModal');
    expect(result.current).toHaveProperty('deleteConfirmation');
    expect(result.current).toHaveProperty('closeAllModals');
  });
});
