/**
 * Tests for validator utilities
 */

import { describe, it, expect } from 'vitest';
import {
  validateAmount,
  validateMonthRange,
  validateExpense,
  sanitizeExpense,
} from './validators';

describe('validateAmount', () => {
  it('parses valid numeric strings', () => {
    expect(validateAmount('100')).toBe(100);
    expect(validateAmount('1234.56')).toBe(1234.56);
  });

  it('handles numeric values', () => {
    expect(validateAmount(100)).toBe(100);
    expect(validateAmount(99.99)).toBe(99.99);
  });

  it('returns 0 for invalid values', () => {
    expect(validateAmount('')).toBe(0);
    expect(validateAmount('invalid')).toBe(0);
    expect(validateAmount(null)).toBe(0);
    expect(validateAmount(undefined)).toBe(0);
  });

  it('enforces minimum value of 0', () => {
    expect(validateAmount(-100)).toBe(0);
    expect(validateAmount('-50')).toBe(0);
  });

  it('handles zero correctly', () => {
    expect(validateAmount(0)).toBe(0);
    expect(validateAmount('0')).toBe(0);
  });
});

describe('validateMonthRange', () => {
  it('validates correct month range', () => {
    const result = validateMonthRange(3, 8);
    expect(result).toEqual({ startMonth: 3, endMonth: 8 });
  });

  it('enforces month boundaries (1-12)', () => {
    const result1 = validateMonthRange(0, 15);
    expect(result1).toEqual({ startMonth: 1, endMonth: 12 });

    const result2 = validateMonthRange(-5, 20);
    expect(result2).toEqual({ startMonth: 1, endMonth: 12 });
  });

  it('ensures end month is not before start month', () => {
    const result = validateMonthRange(8, 3);
    expect(result.endMonth).toBeGreaterThanOrEqual(result.startMonth);
  });

  it('handles string inputs', () => {
    const result = validateMonthRange('5', '10');
    expect(result).toEqual({ startMonth: 5, endMonth: 10 });
  });

  it('handles invalid inputs with defaults', () => {
    const result = validateMonthRange(null, undefined);
    expect(result.startMonth).toBe(1);
    expect(result.endMonth).toBe(12);
  });

  it('handles same start and end month', () => {
    const result = validateMonthRange(6, 6);
    expect(result).toEqual({ startMonth: 6, endMonth: 6 });
  });
});

describe('validateExpense', () => {
  const validExpense = {
    name: 'Netflix',
    amount: 100,
    frequency: 'monthly',
    startMonth: 1,
    endMonth: 12,
  };

  it('validates correct expense', () => {
    const result = validateExpense(validExpense);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects null expense', () => {
    const result = validateExpense(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Udgift objekt mangler');
  });

  it('rejects missing name', () => {
    const expense = { ...validExpense, name: undefined };
    const result = validateExpense(expense);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Udgiftsnavn er påkrævet');
  });

  it('rejects non-string name', () => {
    const expense = { ...validExpense, name: 123 };
    const result = validateExpense(expense);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Udgiftsnavn er påkrævet');
  });

  it('rejects negative amount', () => {
    const expense = { ...validExpense, amount: -50 };
    const result = validateExpense(expense);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Beløb skal være et positivt tal');
  });

  it('rejects non-numeric amount', () => {
    const expense = { ...validExpense, amount: 'invalid' };
    const result = validateExpense(expense);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Beløb skal være et positivt tal');
  });

  it('accepts zero amount', () => {
    const expense = { ...validExpense, amount: 0 };
    const result = validateExpense(expense);
    // Zero amount is allowed in validators.js (different from calculations.js)
    expect(result.valid).toBe(true);
  });

  it('rejects invalid frequency', () => {
    const expense = { ...validExpense, frequency: 'invalid' };
    const result = validateExpense(expense);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Ugyldig frekvens (skal være monthly, quarterly eller yearly)'
    );
  });

  it('validates all frequency types', () => {
    const frequencies = ['monthly', 'quarterly', 'yearly'];
    frequencies.forEach(freq => {
      const expense = { ...validExpense, frequency: freq };
      const result = validateExpense(expense);
      expect(result.valid).toBe(true);
    });
  });

  it('rejects invalid startMonth', () => {
    const expense1 = { ...validExpense, startMonth: 0 };
    const result1 = validateExpense(expense1);
    expect(result1.valid).toBe(false);
    expect(result1.errors).toContain('Startmåned skal være mellem 1 og 12');

    const expense2 = { ...validExpense, startMonth: 13 };
    const result2 = validateExpense(expense2);
    expect(result2.valid).toBe(false);
  });

  it('rejects invalid endMonth', () => {
    const expense1 = { ...validExpense, endMonth: 0 };
    const result1 = validateExpense(expense1);
    expect(result1.valid).toBe(false);
    expect(result1.errors).toContain('Slutmåned skal være mellem 1 og 12');

    const expense2 = { ...validExpense, endMonth: 13 };
    const result2 = validateExpense(expense2);
    expect(result2.valid).toBe(false);
  });

  it('rejects endMonth before startMonth', () => {
    const expense = { ...validExpense, startMonth: 8, endMonth: 3 };
    const result = validateExpense(expense);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Startmåned kan ikke være efter slutmåned');
  });

  it('allows same startMonth and endMonth', () => {
    const expense = { ...validExpense, startMonth: 6, endMonth: 6 };
    const result = validateExpense(expense);
    expect(result.valid).toBe(true);
  });

  it('collects multiple errors', () => {
    const expense = {
      name: '',
      amount: -100,
      frequency: 'invalid',
      startMonth: 0,
      endMonth: 13,
    };
    const result = validateExpense(expense);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(3);
  });
});

describe('sanitizeExpense', () => {
  it('sanitizes valid expense', () => {
    const expense = {
      name: 'Netflix',
      amount: '100.50',
      frequency: 'monthly',
      startMonth: 5,
      endMonth: 10,
      extraField: 'ignored',
    };

    const result = sanitizeExpense(expense);
    expect(result.name).toBe('Netflix');
    expect(result.amount).toBe(100.5);
    expect(result.startMonth).toBe(5);
    expect(result.endMonth).toBe(10);
    expect(result.extraField).toBe('ignored'); // preserved
  });

  it('sanitizes invalid amount', () => {
    const expense = {
      name: 'Test',
      amount: 'invalid',
      frequency: 'monthly',
      startMonth: 1,
      endMonth: 12,
    };

    const result = sanitizeExpense(expense);
    expect(result.amount).toBe(0);
  });

  it('sanitizes negative amount', () => {
    const expense = {
      name: 'Test',
      amount: -100,
      frequency: 'monthly',
      startMonth: 1,
      endMonth: 12,
    };

    const result = sanitizeExpense(expense);
    expect(result.amount).toBe(0);
  });

  it('corrects invalid month range', () => {
    const expense = {
      name: 'Test',
      amount: 100,
      frequency: 'monthly',
      startMonth: 0,
      endMonth: 15,
    };

    const result = sanitizeExpense(expense);
    expect(result.startMonth).toBe(1);
    expect(result.endMonth).toBe(12);
  });

  it('fixes reversed month range', () => {
    const expense = {
      name: 'Test',
      amount: 100,
      frequency: 'monthly',
      startMonth: 8,
      endMonth: 3,
    };

    const result = sanitizeExpense(expense);
    expect(result.endMonth).toBeGreaterThanOrEqual(result.startMonth);
  });

  it('preserves all original fields', () => {
    const expense = {
      name: 'Test',
      amount: 100,
      frequency: 'monthly',
      startMonth: 1,
      endMonth: 12,
      id: 123,
      userId: 'user_1',
      customField: 'value',
    };

    const result = sanitizeExpense(expense);
    expect(result.id).toBe(123);
    expect(result.userId).toBe('user_1');
    expect(result.customField).toBe('value');
  });
});
