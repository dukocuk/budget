/**
 * Tests for useViewportSize hook
 *
 * Tests initial dimensions, breakpoint calculations (mobile/tablet/desktop),
 * resize handler updates, debounce prevents excessive renders.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewportSize } from './useViewportSize';

describe('useViewportSize', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Restore original dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      value: originalInnerHeight,
    });
  });

  const setWindowSize = (width, height) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      value: height,
    });
  };

  it('returns initial window dimensions', () => {
    setWindowSize(1024, 768);
    const { result } = renderHook(() => useViewportSize());

    expect(result.current.width).toBe(1024);
    expect(result.current.height).toBe(768);
  });

  describe('breakpoint calculations', () => {
    it('detects mobile (< 768px)', () => {
      setWindowSize(375, 667);
      const { result } = renderHook(() => useViewportSize());

      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
    });

    it('detects tablet (768px - 1023px)', () => {
      setWindowSize(768, 1024);
      const { result } = renderHook(() => useViewportSize());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isDesktop).toBe(false);
    });

    it('detects desktop (>= 1024px)', () => {
      setWindowSize(1024, 768);
      const { result } = renderHook(() => useViewportSize());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(true);
    });

    it('handles mobile boundary (767px)', () => {
      setWindowSize(767, 600);
      const { result } = renderHook(() => useViewportSize());

      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
    });

    it('handles tablet boundary (768px)', () => {
      setWindowSize(768, 600);
      const { result } = renderHook(() => useViewportSize());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(true);
    });

    it('handles desktop boundary (1024px)', () => {
      setWindowSize(1024, 600);
      const { result } = renderHook(() => useViewportSize());

      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(true);
    });
  });

  describe('resize handling', () => {
    it('updates on breakpoint change after debounce', async () => {
      setWindowSize(1024, 768);
      const { result } = renderHook(() => useViewportSize());

      expect(result.current.isDesktop).toBe(true);

      // Resize to mobile
      setWindowSize(375, 667);

      await act(async () => {
        window.dispatchEvent(new Event('resize'));
        // Advance past debounce (300ms) + rAF
        vi.advanceTimersByTime(350);
      });

      expect(result.current.isMobile).toBe(true);
      expect(result.current.width).toBe(375);
    });

    it('cleans up event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useViewportSize());
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('touch device detection', () => {
    it('returns isTouchDevice boolean', () => {
      setWindowSize(1024, 768);
      const { result } = renderHook(() => useViewportSize());

      // jsdom may or may not have touch support; just verify it's a boolean
      expect(typeof result.current.isTouchDevice).toBe('boolean');
    });
  });
});
