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
    return crypto.randomUUID();
  }

  // Fallback for older browsers (RFC4122 version 4)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
