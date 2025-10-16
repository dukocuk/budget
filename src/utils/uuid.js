/**
 * UUID utility functions for generating and validating UUIDs
 * Uses crypto.randomUUID() for secure client-side UUID generation
 */

/**
 * Generate a new UUID v4
 * @returns {string} UUID string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 */
export function generateUUID() {
  // Use native crypto.randomUUID() if available (modern browsers)
  if (crypto && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  // Fallback for older browsers (RFC4122 version 4)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Validate if a string is a valid UUID
 * @param {string} uuid - String to validate
 * @returns {boolean} True if valid UUID
 */
export function isValidUUID(uuid) {
  if (typeof uuid !== 'string') return false

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Check if value is a numeric ID (legacy format)
 * @param {any} id - Value to check
 * @returns {boolean} True if numeric ID
 */
export function isNumericId(id) {
  return typeof id === 'number' || (typeof id === 'string' && /^\d+$/.test(id))
}

/**
 * Convert numeric ID to UUID format (for migration)
 * Creates a deterministic UUID based on numeric ID
 * @param {number} numericId - Numeric ID to convert
 * @returns {string} UUID string
 */
export function numericToUUID(numericId) {
  // Create deterministic UUID from numeric ID
  // Use namespace UUID as base and append numeric ID
  const namespace = '00000000-0000-4000-8000-000000000000'
  const idStr = String(numericId).padStart(12, '0')

  return `${namespace.slice(0, 24)}${idStr}`
}
