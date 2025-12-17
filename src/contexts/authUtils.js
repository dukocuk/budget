/**
 * Authentication Utilities
 * Session initialization guard and test utilities
 * Separated from AuthProvider to maintain React Fast Refresh compatibility
 */

/**
 * Session initialization guard (prevents double-loading in Strict Mode)
 * @private
 */
let sessionInitialized = false;

/**
 * Get current session initialization state
 * @returns {boolean} Whether session has been initialized
 */
export function getSessionInitialized() {
  return sessionInitialized;
}

/**
 * Set session initialization state
 * @param {boolean} value - New initialization state
 */
export function setSessionInitialized(value) {
  sessionInitialized = value;
}

/**
 * Reset session initialized flag (for testing only)
 * @public
 */
export function resetAuthSession() {
  sessionInitialized = false;
}
