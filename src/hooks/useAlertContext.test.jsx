/**
 * Tests for useAlertContext consumer hook
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAlertContext } from './useAlertContext';
import { AlertProvider } from '../contexts/AlertProvider';

describe('useAlertContext', () => {
  it('throws error when used outside AlertProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAlertContext());
    }).toThrow('useAlertContext must be used within AlertProvider');

    consoleSpy.mockRestore();
  });

  it('returns alert context when used within AlertProvider', () => {
    const wrapper = ({ children }) => <AlertProvider>{children}</AlertProvider>;

    const { result } = renderHook(() => useAlertContext(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current.alert).toBeDefined();
    expect(result.current.showAlert).toBeDefined();
    expect(result.current.hideAlert).toBeDefined();
    expect(typeof result.current.showAlert).toBe('function');
    expect(typeof result.current.hideAlert).toBe('function');
  });

  it('provides initial null alert state', () => {
    const wrapper = ({ children }) => <AlertProvider>{children}</AlertProvider>;

    const { result } = renderHook(() => useAlertContext(), { wrapper });

    expect(result.current.alert).toBeNull();
  });
});
