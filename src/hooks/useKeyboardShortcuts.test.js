/**
 * Tests for useKeyboardShortcuts Hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  let mockCallbacks;

  beforeEach(() => {
    mockCallbacks = {
      onAddExpense: vi.fn(),
      onUndo: vi.fn(() => true),
      onRedo: vi.fn(() => true),
      canUndo: true,
      canRedo: true,
      showAlert: vi.fn(),
    };
  });

  it('should return a handleKeyPress function', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(mockCallbacks));
    expect(typeof result.current).toBe('function');
  });

  describe('Ctrl+N / Cmd+N', () => {
    it('should call onAddExpense on Ctrl+N', () => {
      const { result } = renderHook(() => useKeyboardShortcuts(mockCallbacks));
      const event = new KeyboardEvent('keydown', { key: 'n', ctrlKey: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      result.current(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(mockCallbacks.onAddExpense).toHaveBeenCalledOnce();
    });

    it('should call onAddExpense on Cmd+N (Mac)', () => {
      const { result } = renderHook(() => useKeyboardShortcuts(mockCallbacks));
      const event = new KeyboardEvent('keydown', { key: 'n', metaKey: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      result.current(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(mockCallbacks.onAddExpense).toHaveBeenCalledOnce();
    });
  });

  describe('Ctrl+Z / Cmd+Z (Undo)', () => {
    it('should call onUndo on Ctrl+Z when canUndo is true', () => {
      const { result } = renderHook(() => useKeyboardShortcuts(mockCallbacks));
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        shiftKey: false,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      result.current(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(mockCallbacks.onUndo).toHaveBeenCalledOnce();
      expect(mockCallbacks.showAlert).toHaveBeenCalledWith(
        'Handling fortrudt',
        'info'
      );
    });

    it('should not call onUndo when canUndo is false', () => {
      mockCallbacks.canUndo = false;
      const { result } = renderHook(() => useKeyboardShortcuts(mockCallbacks));
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        shiftKey: false,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      result.current(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(mockCallbacks.onUndo).not.toHaveBeenCalled();
      expect(mockCallbacks.showAlert).not.toHaveBeenCalled();
    });

    it('should not show alert if onUndo returns false', () => {
      mockCallbacks.onUndo = vi.fn(() => false);
      const { result } = renderHook(() => useKeyboardShortcuts(mockCallbacks));
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        shiftKey: false,
      });

      result.current(event);

      expect(mockCallbacks.onUndo).toHaveBeenCalledOnce();
      expect(mockCallbacks.showAlert).not.toHaveBeenCalled();
    });
  });

  describe('Ctrl+Shift+Z / Cmd+Shift+Z (Redo)', () => {
    it('should call onRedo on Ctrl+Shift+Z when canRedo is true', () => {
      const { result } = renderHook(() => useKeyboardShortcuts(mockCallbacks));
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        shiftKey: true,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      result.current(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(mockCallbacks.onRedo).toHaveBeenCalledOnce();
      expect(mockCallbacks.showAlert).toHaveBeenCalledWith(
        'Handling gentaget',
        'info'
      );
    });

    it('should not call onRedo when canRedo is false', () => {
      mockCallbacks.canRedo = false;
      const { result } = renderHook(() => useKeyboardShortcuts(mockCallbacks));
      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        shiftKey: true,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      result.current(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(mockCallbacks.onRedo).not.toHaveBeenCalled();
      expect(mockCallbacks.showAlert).not.toHaveBeenCalled();
    });
  });

  describe('Other key combinations', () => {
    it('should not call any callbacks for unhandled keys', () => {
      const { result } = renderHook(() => useKeyboardShortcuts(mockCallbacks));
      const event = new KeyboardEvent('keydown', { key: 'a', ctrlKey: true });

      result.current(event);

      expect(mockCallbacks.onAddExpense).not.toHaveBeenCalled();
      expect(mockCallbacks.onUndo).not.toHaveBeenCalled();
      expect(mockCallbacks.onRedo).not.toHaveBeenCalled();
    });

    it('should not call callbacks for keys without modifiers', () => {
      const { result } = renderHook(() => useKeyboardShortcuts(mockCallbacks));
      const event = new KeyboardEvent('keydown', { key: 'n' });

      result.current(event);

      expect(mockCallbacks.onAddExpense).not.toHaveBeenCalled();
    });
  });
});
