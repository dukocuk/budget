import { useState, useEffect, useRef } from 'react';

/**
 * Debounce utility function
 * Delays function execution until after specified wait time has elapsed
 * since the last time it was invoked
 *
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait before executing
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Custom hook for responsive viewport size detection
 *
 * Tracks window dimensions and provides breakpoint helpers
 * for mobile-first responsive design.
 *
 * Breakpoints:
 * - Mobile: < 768px
 * - Tablet: 768px - 1023px
 * - Desktop: >= 1024px
 *
 * Performance Optimizations:
 * - 300ms debounce on resize events to prevent excessive re-renders
 * - requestAnimationFrame for smooth updates
 * - Removed orientationchange listener (resize fires after orientation)
 *
 * @returns {Object} Viewport state and breakpoint helpers
 * @property {number} width - Current window width in pixels
 * @property {number} height - Current window height in pixels
 * @property {boolean} isMobile - True if width < 768px
 * @property {boolean} isTablet - True if 768px <= width < 1024px
 * @property {boolean} isDesktop - True if width >= 1024px
 * @property {boolean} isTouchDevice - True if device supports touch
 *
 * @example
 * const { isMobile, isTablet, isDesktop, width } = useViewportSize();
 *
 * if (isMobile) {
 *   return <MobileView />;
 * }
 * return <DesktopView />;
 */
export const useViewportSize = () => {
  const [viewportSize, setViewportSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  // Track previous breakpoint to prevent unnecessary re-renders
  const prevBreakpointRef = useRef(null);

  useEffect(() => {
    // Don't run in SSR environments
    if (typeof window === 'undefined') {
      return;
    }

    /**
     * Update viewport dimensions
     * Uses requestAnimationFrame for smooth, batched updates
     */
    let rafId = null;

    const updateSize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;

      // Calculate new breakpoint
      const newBreakpoint =
        newWidth < 768 ? 'mobile' : newWidth < 1024 ? 'tablet' : 'desktop';

      // Only update state if breakpoint changed (prevents unnecessary re-renders)
      if (prevBreakpointRef.current !== newBreakpoint) {
        prevBreakpointRef.current = newBreakpoint;
        setViewportSize({
          width: newWidth,
          height: newHeight,
        });
      }
      // If breakpoint didn't change, skip state update → no re-render!
    };

    /**
     * Debounced resize handler
     * Prevents excessive state updates during rapid resize events
     * 300ms delay ensures smooth orientation changes without flickering
     */
    const debouncedResize = debounce(() => {
      // Cancel any pending animation frame
      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      // Schedule update on next animation frame
      rafId = requestAnimationFrame(updateSize);
    }, 300);

    // Set initial size immediately (no debounce)
    updateSize();

    // Listen for resize events (includes orientation changes)
    // Note: orientationchange is redundant as resize fires after orientation
    window.addEventListener('resize', debouncedResize);

    // Cleanup
    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener('resize', debouncedResize);
    };
  }, []);

  // Breakpoint calculations (mobile-first)
  const isMobile = viewportSize.width < 768;
  const isTablet = viewportSize.width >= 768 && viewportSize.width < 1024;
  const isDesktop = viewportSize.width >= 1024;

  // Touch device detection
  const isTouchDevice =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  return {
    width: viewportSize.width,
    height: viewportSize.height,
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
  };
};

export default useViewportSize;
