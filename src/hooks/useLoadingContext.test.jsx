/**
 * Tests for useLoadingContext consumer hook
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLoadingContext } from './useLoadingContext';
import { LoadingProvider } from '../contexts/LoadingProvider';

describe('useLoadingContext', () => {
  it('throws error when used outside LoadingProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useLoadingContext());
    }).toThrow('useLoadingContext must be used within LoadingProvider');

    consoleSpy.mockRestore();
  });

  it('returns loading context when used within LoadingProvider', () => {
    const wrapper = ({ children }) => (
      <LoadingProvider>{children}</LoadingProvider>
    );

    const { result } = renderHook(() => useLoadingContext(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current.isLoading).toBeDefined();
    expect(result.current.stage).toBeDefined();
    expect(result.current.message).toBeDefined();
    expect(result.current.progress).toBeDefined();
    expect(result.current.setLoadingStage).toBeDefined();
    expect(typeof result.current.setLoadingStage).toBe('function');
  });

  it('provides correct loading state properties', () => {
    const wrapper = ({ children }) => (
      <LoadingProvider>{children}</LoadingProvider>
    );

    const { result } = renderHook(() => useLoadingContext(), { wrapper });

    expect(typeof result.current.isLoading).toBe('boolean');
    expect(typeof result.current.stage).toBe('string');
    expect(typeof result.current.message).toBe('string');
    expect(typeof result.current.progress).toBe('number');
  });
});
