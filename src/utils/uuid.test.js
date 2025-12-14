/**
 * Tests for UUID utility functions
 */

import { describe, it, expect } from 'vitest';
import { generateUUID } from './uuid';

describe('uuid utilities', () => {
  describe('generateUUID', () => {
    it('should generate a valid UUID', () => {
      const uuid = generateUUID();

      expect(uuid).toBeDefined();
      expect(typeof uuid).toBe('string');
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();

      expect(uuid1).not.toBe(uuid2);
    });

    it('should generate UUIDs with correct format', () => {
      const uuid = generateUUID();

      // UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should generate multiple valid UUIDs', () => {
      for (let i = 0; i < 10; i++) {
        const uuid = generateUUID();
        expect(uuid).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
      }
    });
  });
});
