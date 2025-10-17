/**
 * Tests for UUID utility functions
 */

import { describe, it, expect } from 'vitest'
import { generateUUID, isValidUUID, isNumericId, numericToUUID } from './uuid'

describe('uuid utilities', () => {
  describe('generateUUID', () => {
    it('should generate a valid UUID', () => {
      const uuid = generateUUID()

      expect(uuid).toBeDefined()
      expect(typeof uuid).toBe('string')
      expect(isValidUUID(uuid)).toBe(true)
    })

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUUID()
      const uuid2 = generateUUID()

      expect(uuid1).not.toBe(uuid2)
    })

    it('should generate UUIDs with correct format', () => {
      const uuid = generateUUID()

      // UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    })

    it('should generate multiple valid UUIDs', () => {
      for (let i = 0; i < 10; i++) {
        const uuid = generateUUID()
        expect(isValidUUID(uuid)).toBe(true)
      }
    })
  })

  describe('isValidUUID', () => {
    it('should return true for valid UUIDs', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
      expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true)
      expect(isValidUUID('6ba7b811-9dad-11d1-80b4-00c04fd430c8')).toBe(true)
    })

    it('should return false for invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false)
      expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false)
      expect(isValidUUID('550e8400e29b41d4a716446655440000')).toBe(false) // No dashes
    })

    it('should return false for non-string values', () => {
      expect(isValidUUID(123)).toBe(false)
      expect(isValidUUID(null)).toBe(false)
      expect(isValidUUID(undefined)).toBe(false)
      expect(isValidUUID({})).toBe(false)
      expect(isValidUUID([])).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isValidUUID('')).toBe(false)
    })

    it('should be case insensitive', () => {
      expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true)
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    })

    it('should validate generated UUIDs', () => {
      const uuid = generateUUID()
      expect(isValidUUID(uuid)).toBe(true)
    })
  })

  describe('isNumericId', () => {
    it('should return true for numeric IDs', () => {
      expect(isNumericId(123)).toBe(true)
      expect(isNumericId(0)).toBe(true)
      expect(isNumericId('456')).toBe(true)
      expect(isNumericId('0')).toBe(true)
    })

    it('should return false for non-numeric values', () => {
      expect(isNumericId('abc')).toBe(false)
      expect(isNumericId('123abc')).toBe(false)
      expect(isNumericId('abc123')).toBe(false)
      expect(isNumericId('')).toBe(false)
    })

    it('should return false for UUIDs', () => {
      expect(isNumericId('550e8400-e29b-41d4-a716-446655440000')).toBe(false)
    })

    it('should return false for null and undefined', () => {
      expect(isNumericId(null)).toBe(false)
      expect(isNumericId(undefined)).toBe(false)
    })

    it('should return false for objects and arrays', () => {
      expect(isNumericId({})).toBe(false)
      expect(isNumericId([])).toBe(false)
    })
  })

  describe('numericToUUID', () => {
    it('should convert numeric ID to UUID format', () => {
      const uuid = numericToUUID(123)

      expect(typeof uuid).toBe('string')
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    })

    it('should be deterministic (same input = same output)', () => {
      const uuid1 = numericToUUID(123)
      const uuid2 = numericToUUID(123)

      expect(uuid1).toBe(uuid2)
    })

    it('should generate different UUIDs for different IDs', () => {
      const uuid1 = numericToUUID(123)
      const uuid2 = numericToUUID(456)

      expect(uuid1).not.toBe(uuid2)
    })

    it('should handle zero', () => {
      const uuid = numericToUUID(0)

      expect(uuid).toBe('00000000-0000-4000-8000-000000000000')
    })

    it('should pad small numbers', () => {
      const uuid = numericToUUID(1)

      expect(uuid).toBe('00000000-0000-4000-8000-000000000001')
    })

    it('should handle large numbers', () => {
      const uuid = numericToUUID(999999999999)

      expect(uuid).toBe('00000000-0000-4000-8000-999999999999')
    })
  })
})
