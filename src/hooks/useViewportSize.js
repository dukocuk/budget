import { useState, useEffect } from 'react';

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

  useEffect(() => {
    // Don't run in SSR environments
    if (typeof window === 'undefined') {
      return;
    }

    /**
     * Update viewport dimensions on window resize
     * Debounced via requestAnimationFrame for better performance
     */
    let timeoutId = null;

    const handleResize = () => {
      // Cancel any pending updates
      if (timeoutId) {
        cancelAnimationFrame(timeoutId);
      }

      // Schedule update on next animation frame
      timeoutId = requestAnimationFrame(() => {
        setViewportSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      });
    };

    // Set initial size
    handleResize();

    // Listen for resize events
    window.addEventListener('resize', handleResize);

    // Listen for orientation changes (mobile devices)
    window.addEventListener('orientationchange', handleResize);

    // Cleanup
    return () => {
      if (timeoutId) {
        cancelAnimationFrame(timeoutId);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
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
