/**
 * Logger utility for development-only console output
 * In production builds, these methods do nothing to keep the console clean
 *
 * @example
 * import { logger } from './utils/logger'
 * logger.log('Debug info:', data)
 * logger.error('Error occurred:', error)
 */

const isDev = import.meta.env.DEV

export const logger = {
  /**
   * Log informational messages (development only)
   * @param {...any} args - Arguments to log
   */
  log: (...args) => {
    if (isDev) {
      console.log(...args)
    }
  },

  /**
   * Log warning messages (development only)
   * @param {...any} args - Arguments to log
   */
  warn: (...args) => {
    if (isDev) {
      console.warn(...args)
    }
  },

  /**
   * Log error messages (development only)
   * @param {...any} args - Arguments to log
   */
  error: (...args) => {
    if (isDev) {
      console.error(...args)
    }
  },

  /**
   * Log informational messages (always, even in production)
   * Use sparingly for critical user-facing information
   * @param {...any} args - Arguments to log
   */
  info: (...args) => {
    console.info(...args)
  }
}
