/**
 * Logger utility for development-only console output
 * In production builds, these methods do nothing to keep the console clean
 *
 * ✅ Phase 2 Enhancements:
 * - Conditional logging (dev only by default)
 * - Production error tracking (errors always logged, can integrate monitoring)
 * - Performance measurement utilities
 * - Memory-efficient log levels
 *
 * @example
 * import { logger } from './utils/logger'
 * logger.log('Debug info:', data)
 * logger.error('Error occurred:', error)
 * logger.perf('InitApp', () => initializeApp())
 */

// Safe access to import.meta.env for test environments
const isDev = import.meta?.env?.DEV ?? false;
const isProd = import.meta?.env?.PROD ?? false;

// Performance marks storage
const perfMarks = new Map();

export const logger = {
  /**
   * Log debug messages (development only)
   * @param {...any} args - Arguments to log
   */
  log: (...args) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Log warning messages (development only)
   * @param {...any} args - Arguments to log
   */
  warn: (...args) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  /**
   * Log debug/detailed messages (development only)
   * Use for technical details that users don't need to see
   * @param {...any} args - Arguments to log
   */
  debug: (...args) => {
    if (isDev) {
      console.debug(...args);
    }
  },

  /**
   * Log error messages (ALWAYS logged, even in production)
   * ✅ Critical errors should always be visible for debugging
   * In production, could integrate with error monitoring service (Sentry, LogRocket, etc.)
   * @param {...any} args - Arguments to log
   */
  error: (...args) => {
    console.error(...args);

    // ✅ Production: Send to monitoring service (example integration point)
    if (isProd && typeof window !== 'undefined') {
      // TODO: Integrate with error monitoring service
      // Example: Sentry.captureException(args[0])
      // Example: LogRocket.captureException(args[0])
    }
  },

  /**
   * Log informational messages (always, even in production)
   * Use sparingly for critical user-facing information
   * @param {...any} args - Arguments to log
   */
  info: (...args) => {
    console.info(...args);
  },

  /**
   * Performance measurement utility
   * ✅ Measures execution time of async/sync operations
   * Only active in development mode
   *
   * @param {string} label - Performance mark label
   * @param {Function} fn - Function to measure (can be async)
   * @returns {Promise<any>|any} Result of the function
   *
   * @example
   * await logger.perf('DataLoad', async () => await loadData())
   */
  perf: async (label, fn) => {
    if (!isDev) {
      // In production, just execute without measuring
      return await fn();
    }

    const startMark = `${label}-start`;
    const endMark = `${label}-end`;
    const measureName = `${label}-measure`;

    try {
      performance.mark(startMark);
      perfMarks.set(label, Date.now());

      const result = await fn();

      performance.mark(endMark);
      performance.measure(measureName, startMark, endMark);

      const measure = performance.getEntriesByName(measureName)[0];
      const duration = measure.duration.toFixed(2);

      console.log(`⏱️ [${label}] ${duration}ms`);

      // Cleanup
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
      performance.clearMeasures(measureName);
      perfMarks.delete(label);

      return result;
    } catch (error) {
      console.error(
        `❌ [${label}] Error during performance measurement:`,
        error
      );
      throw error;
    }
  },

  /**
   * Start a performance timer
   * ✅ Use with logger.perfEnd() for manual timing control
   * Only active in development mode
   *
   * @param {string} label - Timer label
   *
   * @example
   * logger.perfStart('LongOperation')
   * // ... do work ...
   * logger.perfEnd('LongOperation')
   */
  perfStart: label => {
    if (isDev) {
      perfMarks.set(label, Date.now());
      console.log(`⏱️ [${label}] Started`);
    }
  },

  /**
   * End a performance timer
   * ✅ Use with logger.perfStart() for manual timing control
   * Only active in development mode
   *
   * @param {string} label - Timer label
   */
  perfEnd: label => {
    if (!isDev) return;

    const startTime = perfMarks.get(label);
    if (!startTime) {
      console.warn(`⚠️ [${label}] No start time found`);
      return;
    }

    const duration = Date.now() - startTime;
    console.log(`⏱️ [${label}] ${duration}ms`);
    perfMarks.delete(label);
  },
};
