/**
 * Tests for useAlert hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAlert } from './useAlert';
import { ALERT_TYPES, ALERT_DURATION } from '../utils/constants';

describe('useAlert', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with no alert', () => {
    const { result } = renderHook(() => useAlert());
    expect(result.current.alert).toBeNull();
  });

  it('shows alert with default info type', () => {
    const { result } = renderHook(() => useAlert());

    act(() => {
      result.current.showAlert('Test message');
    });

    expect(result.current.alert).toEqual({
      message: 'Test message',
      type: ALERT_TYPES.INFO,
    });
  });

  it('shows alert with custom type', () => {
    const { result } = renderHook(() => useAlert());

    act(() => {
      result.current.showAlert('Success message', ALERT_TYPES.SUCCESS);
    });

    expect(result.current.alert).toEqual({
      message: 'Success message',
      type: ALERT_TYPES.SUCCESS,
    });
  });

  it('shows error alert', () => {
    const { result } = renderHook(() => useAlert());

    act(() => {
      result.current.showAlert('Error message', ALERT_TYPES.ERROR);
    });

    expect(result.current.alert).toEqual({
      message: 'Error message',
      type: ALERT_TYPES.ERROR,
    });
  });

  it('auto-dismisses alert after ALERT_DURATION', () => {
    const { result } = renderHook(() => useAlert());

    act(() => {
      result.current.showAlert('Test message');
    });

    expect(result.current.alert).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(ALERT_DURATION);
    });

    expect(result.current.alert).toBeNull();
  });

  it('manually hides alert', () => {
    const { result } = renderHook(() => useAlert());

    act(() => {
      result.current.showAlert('Test message');
    });

    expect(result.current.alert).not.toBeNull();

    act(() => {
      result.current.hideAlert();
    });

    expect(result.current.alert).toBeNull();
  });

  it('replaces previous alert with new one', () => {
    const { result } = renderHook(() => useAlert());

    act(() => {
      result.current.showAlert('First message', ALERT_TYPES.INFO);
    });

    expect(result.current.alert.message).toBe('First message');

    act(() => {
      result.current.showAlert('Second message', ALERT_TYPES.SUCCESS);
    });

    expect(result.current.alert.message).toBe('Second message');
    expect(result.current.alert.type).toBe(ALERT_TYPES.SUCCESS);
  });
});
