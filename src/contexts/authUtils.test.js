/**
 * Tests for authUtils
 *
 * Tests getSessionInitialized default, set/get round-trip,
 * and resetAuthSession clears state.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSessionInitialized,
  setSessionInitialized,
  resetAuthSession,
} from './authUtils';

describe('authUtils', () => {
  beforeEach(() => {
    resetAuthSession();
  });

  describe('getSessionInitialized', () => {
    it('returns false by default', () => {
      expect(getSessionInitialized()).toBe(false);
    });
  });

  describe('setSessionInitialized', () => {
    it('sets value to true', () => {
      setSessionInitialized(true);
      expect(getSessionInitialized()).toBe(true);
    });

    it('sets value to false', () => {
      setSessionInitialized(true);
      setSessionInitialized(false);
      expect(getSessionInitialized()).toBe(false);
    });

    it('round-trips correctly', () => {
      expect(getSessionInitialized()).toBe(false);
      setSessionInitialized(true);
      expect(getSessionInitialized()).toBe(true);
      setSessionInitialized(false);
      expect(getSessionInitialized()).toBe(false);
    });
  });

  describe('resetAuthSession', () => {
    it('resets session to false', () => {
      setSessionInitialized(true);
      expect(getSessionInitialized()).toBe(true);

      resetAuthSession();
      expect(getSessionInitialized()).toBe(false);
    });

    it('is idempotent', () => {
      resetAuthSession();
      resetAuthSession();
      expect(getSessionInitialized()).toBe(false);
    });
  });
});
