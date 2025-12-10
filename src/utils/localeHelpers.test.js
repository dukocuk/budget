import { describe, it, expect } from 'vitest';
import {
  parseDanishNumber,
  formatDanishNumber,
  isValidDanishNumber,
} from './localeHelpers';

describe('localeHelpers', () => {
  describe('parseDanishNumber', () => {
    describe('basic decimal parsing', () => {
      it('should parse Danish decimal format with comma', () => {
        expect(parseDanishNumber('100,95')).toBe(100.95);
      });

      it('should parse period decimal format for flexibility', () => {
        expect(parseDanishNumber('100.95')).toBe(100.95);
      });

      it('should parse whole numbers', () => {
        expect(parseDanishNumber('100')).toBe(100);
      });

      it('should parse numbers with one decimal place', () => {
        expect(parseDanishNumber('100,5')).toBe(100.5);
      });

      it('should parse numbers with two decimal places', () => {
        expect(parseDanishNumber('100,95')).toBe(100.95);
      });
    });

    describe('thousands separator handling', () => {
      it('should parse number with thousands separator and comma decimal', () => {
        expect(parseDanishNumber('1.234,56')).toBe(1234.56);
      });

      it('should parse number with thousands separator without decimal', () => {
        expect(parseDanishNumber('1.234')).toBe(1234);
      });

      it('should parse large numbers with multiple thousand separators', () => {
        expect(parseDanishNumber('1.234.567,89')).toBe(1234567.89);
      });

      it('should parse number without thousands separator', () => {
        expect(parseDanishNumber('1234,56')).toBe(1234.56);
      });
    });

    describe('edge cases', () => {
      it('should return 0 for empty string', () => {
        expect(parseDanishNumber('')).toBe(0);
      });

      it('should return 0 for null', () => {
        expect(parseDanishNumber(null)).toBe(0);
      });

      it('should return 0 for undefined', () => {
        expect(parseDanishNumber(undefined)).toBe(0);
      });

      it('should return 0 for whitespace-only string', () => {
        expect(parseDanishNumber('   ')).toBe(0);
      });

      it('should handle leading and trailing whitespace', () => {
        expect(parseDanishNumber('  100,95  ')).toBe(100.95);
      });

      it('should return value as-is if already a number', () => {
        expect(parseDanishNumber(100.95)).toBe(100.95);
      });

      it('should return 0 for invalid input', () => {
        expect(parseDanishNumber('abc')).toBe(0);
        expect(parseDanishNumber('12abc')).toBe(0);
      });
    });

    describe('negative numbers', () => {
      it('should parse negative decimal numbers', () => {
        expect(parseDanishNumber('-100,95')).toBe(-100.95);
      });

      it('should parse negative whole numbers', () => {
        expect(parseDanishNumber('-100')).toBe(-100);
      });

      it('should parse negative numbers with thousands separator', () => {
        expect(parseDanishNumber('-1.234,56')).toBe(-1234.56);
      });
    });

    describe('zero handling', () => {
      it('should parse zero', () => {
        expect(parseDanishNumber('0')).toBe(0);
      });

      it('should parse zero with decimal', () => {
        expect(parseDanishNumber('0,00')).toBe(0);
      });

      it('should parse negative zero', () => {
        expect(parseDanishNumber('-0')).toBe(-0);
      });
    });

    describe('real-world examples', () => {
      it('should parse typical monthly payment amount', () => {
        expect(parseDanishNumber('5.700,00')).toBe(5700);
      });

      it('should parse typical expense amount', () => {
        expect(parseDanishNumber('249,95')).toBe(249.95);
      });

      it('should parse large annual budget', () => {
        expect(parseDanishNumber('68.400,00')).toBe(68400);
      });

      it('should parse small decimal amount', () => {
        expect(parseDanishNumber('9,99')).toBe(9.99);
      });
    });
  });

  describe('formatDanishNumber', () => {
    describe('basic formatting', () => {
      it('should format number with 2 decimal places by default', () => {
        expect(formatDanishNumber(100.95)).toBe('100,95');
      });

      it('should format whole number with 2 decimal places', () => {
        expect(formatDanishNumber(100)).toBe('100,00');
      });

      it('should format number with thousands separator', () => {
        expect(formatDanishNumber(1234.56)).toBe('1.234,56');
      });

      it('should format large numbers with multiple thousand separators', () => {
        expect(formatDanishNumber(1234567.89)).toBe('1.234.567,89');
      });
    });

    describe('decimal precision', () => {
      it('should format with 0 decimal places when specified', () => {
        expect(formatDanishNumber(100.95, 0)).toBe('101');
      });

      it('should format with 1 decimal place when specified', () => {
        expect(formatDanishNumber(100.95, 1)).toBe('101,0');
      });

      it('should format with 3 decimal places when specified', () => {
        expect(formatDanishNumber(100.956, 3)).toBe('100,956');
      });

      it('should round correctly with fewer decimals', () => {
        expect(formatDanishNumber(100.996, 2)).toBe('101,00');
      });
    });

    describe('edge cases', () => {
      it('should return "0" for non-number input', () => {
        expect(formatDanishNumber('abc')).toBe('0');
      });

      it('should return "0" for NaN', () => {
        expect(formatDanishNumber(NaN)).toBe('0');
      });

      it('should format zero', () => {
        expect(formatDanishNumber(0)).toBe('0,00');
      });

      it('should format negative numbers', () => {
        expect(formatDanishNumber(-100.95)).toBe('-100,95');
      });
    });

    describe('real-world examples', () => {
      it('should format typical monthly payment', () => {
        expect(formatDanishNumber(5700)).toBe('5.700,00');
      });

      it('should format typical expense', () => {
        expect(formatDanishNumber(249.95)).toBe('249,95');
      });

      it('should format annual total', () => {
        expect(formatDanishNumber(68400)).toBe('68.400,00');
      });
    });
  });

  describe('isValidDanishNumber', () => {
    describe('valid formats', () => {
      it('should validate whole numbers', () => {
        expect(isValidDanishNumber('100')).toBe(true);
      });

      it('should validate decimal with comma', () => {
        expect(isValidDanishNumber('100,95')).toBe(true);
      });

      it('should validate number with thousands separator and decimal', () => {
        expect(isValidDanishNumber('1.234,56')).toBe(true);
      });

      it('should validate number with thousands separator without decimal', () => {
        expect(isValidDanishNumber('1.234')).toBe(true);
      });

      it('should validate large numbers', () => {
        expect(isValidDanishNumber('1.234.567,89')).toBe(true);
      });

      it('should validate negative numbers', () => {
        expect(isValidDanishNumber('-100,95')).toBe(true);
      });

      it('should validate empty string', () => {
        expect(isValidDanishNumber('')).toBe(true);
      });

      it('should validate null', () => {
        expect(isValidDanishNumber(null)).toBe(true);
      });

      it('should validate undefined', () => {
        expect(isValidDanishNumber(undefined)).toBe(true);
      });

      it('should validate zero', () => {
        expect(isValidDanishNumber('0')).toBe(true);
      });

      it('should validate decimal with one digit', () => {
        expect(isValidDanishNumber('100,5')).toBe(true);
      });

      it('should validate decimal with two digits', () => {
        expect(isValidDanishNumber('100,95')).toBe(true);
      });
    });

    describe('invalid formats', () => {
      it('should reject non-numeric characters', () => {
        expect(isValidDanishNumber('abc')).toBe(false);
      });

      it('should reject multiple commas', () => {
        expect(isValidDanishNumber('100,9,5')).toBe(false);
      });

      it('should reject more than 2 decimal digits', () => {
        expect(isValidDanishNumber('100,955')).toBe(false);
      });

      it('should reject invalid thousand separator placement', () => {
        expect(isValidDanishNumber('12.34')).toBe(false); // Should be at least 4 digits for separator
      });

      it('should reject comma as thousands separator', () => {
        expect(isValidDanishNumber('1,234.56')).toBe(false); // Wrong separators
      });

      it('should reject letters mixed with numbers', () => {
        expect(isValidDanishNumber('100abc')).toBe(false);
      });

      it('should reject special characters', () => {
        expect(isValidDanishNumber('100@95')).toBe(false);
      });
    });

    describe('real-world validation', () => {
      it('should validate typical user input', () => {
        expect(isValidDanishNumber('5700')).toBe(true);
        expect(isValidDanishNumber('5.700')).toBe(true);
        expect(isValidDanishNumber('5.700,00')).toBe(true);
      });

      it('should validate expense amounts', () => {
        expect(isValidDanishNumber('249,95')).toBe(true);
        expect(isValidDanishNumber('9,99')).toBe(true);
        expect(isValidDanishNumber('1.499,50')).toBe(true);
      });
    });
  });

  describe('round-trip conversion', () => {
    it('should parse and format consistently', () => {
      const original = '1.234,56';
      const parsed = parseDanishNumber(original);
      const formatted = formatDanishNumber(parsed);
      expect(formatted).toBe(original);
    });

    it('should handle whole numbers round-trip', () => {
      const original = 100;
      const formatted = formatDanishNumber(original);
      const parsed = parseDanishNumber(formatted);
      expect(parsed).toBe(original);
    });

    it('should handle decimal numbers round-trip', () => {
      const original = 100.95;
      const formatted = formatDanishNumber(original);
      const parsed = parseDanishNumber(formatted);
      expect(parsed).toBe(original);
    });
  });

  describe('integration scenarios', () => {
    it('should handle user typing gradually', () => {
      // User types "100,95" character by character
      expect(parseDanishNumber('1')).toBe(1);
      expect(parseDanishNumber('10')).toBe(10);
      expect(parseDanishNumber('100')).toBe(100);
      expect(parseDanishNumber('100,')).toBe(100); // Incomplete decimal
      expect(parseDanishNumber('100,9')).toBe(100.9);
      expect(parseDanishNumber('100,95')).toBe(100.95);
    });

    it('should handle copy-paste with different formats', () => {
      // Different input formats should all work
      expect(parseDanishNumber('100,95')).toBe(100.95);
      expect(parseDanishNumber('100.95')).toBe(100.95);
      expect(parseDanishNumber('100,9500')).toBe(100.95);
    });

    it('should handle edge case: leading zeros', () => {
      expect(parseDanishNumber('0100')).toBe(100);
      expect(parseDanishNumber('0100,95')).toBe(100.95);
    });
  });
});
