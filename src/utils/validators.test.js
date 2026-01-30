/**
 * Tests for validator utilities
 */

import { describe, it, expect } from 'vitest';
import {
  validateAmount,
  validateMonthRange,
  validateExpense,
  sanitizeExpense,
  validateMonthlyAmounts,
  validateCloudData,
  validateDownloadedData,
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

  it('handles null monthlyAmounts', () => {
    const expense = {
      name: 'Test',
      amount: 100,
      frequency: 'monthly',
      startMonth: 1,
      endMonth: 12,
      monthlyAmounts: null,
    };

    const result = sanitizeExpense(expense);
    expect(result.monthlyAmounts).toBeNull();
  });

  it('sanitizes valid monthlyAmounts array', () => {
    const monthlyAmounts = Array(12).fill(100);
    const expense = {
      name: 'Test',
      amount: 100,
      frequency: 'monthly',
      startMonth: 1,
      endMonth: 12,
      monthlyAmounts,
    };

    const result = sanitizeExpense(expense);
    expect(result.monthlyAmounts).toEqual(monthlyAmounts);
  });

  it('sanitizes invalid monthlyAmounts values', () => {
    const expense = {
      name: 'Test',
      amount: 100,
      frequency: 'monthly',
      startMonth: 1,
      endMonth: 12,
      monthlyAmounts: [
        -50,
        'invalid',
        100,
        null,
        undefined,
        200,
        0,
        0,
        0,
        0,
        0,
        0,
      ],
    };

    const result = sanitizeExpense(expense);
    expect(result.monthlyAmounts).toEqual([
      0, 0, 100, 0, 0, 200, 0, 0, 0, 0, 0, 0,
    ]);
  });

  it('converts invalid monthlyAmounts to null', () => {
    const expense = {
      name: 'Test',
      amount: 100,
      frequency: 'monthly',
      startMonth: 1,
      endMonth: 12,
      monthlyAmounts: 'invalid',
    };

    const result = sanitizeExpense(expense);
    expect(result.monthlyAmounts).toBeNull();
  });
});

describe('validateMonthlyAmounts', () => {
  it('validates null as valid (fixed amount)', () => {
    const result = validateMonthlyAmounts(null);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validates array with 12 valid amounts', () => {
    const amounts = [
      100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
    ];
    const result = validateMonthlyAmounts(amounts);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects non-array values', () => {
    const result = validateMonthlyAmounts('invalid');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Månedlige beløb skal være en array');
  });

  it('rejects array with wrong length', () => {
    const result = validateMonthlyAmounts([100, 200, 300]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Månedlige beløb skal have præcis 12 værdier'
    );
  });

  it('rejects array with non-numeric values', () => {
    const amounts = [
      100,
      'invalid',
      300,
      400,
      500,
      600,
      700,
      800,
      900,
      1000,
      1100,
      1200,
    ];
    const result = validateMonthlyAmounts(amounts);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Måned 2: Beløb skal være et tal');
  });

  it('rejects array with negative values', () => {
    const amounts = [
      100, 200, -300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
    ];
    const result = validateMonthlyAmounts(amounts);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Måned 3: Beløb skal være mindst 0 kr.');
  });

  it('accepts array with zero values', () => {
    const amounts = Array(12).fill(0);
    const result = validateMonthlyAmounts(amounts);
    expect(result.valid).toBe(true);
  });

  it('collects multiple errors', () => {
    const amounts = [
      100,
      -200,
      'invalid',
      null,
      500,
      600,
      700,
      800,
      900,
      1000,
      1100,
      1200,
    ];
    const result = validateMonthlyAmounts(amounts);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(2);
  });
});

describe('validateCloudData', () => {
  it('validates valid cloud data', () => {
    const data = {
      expenses: [],
      budgetPeriods: [],
    };
    const result = validateCloudData(data);
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('rejects null data', () => {
    const result = validateCloudData(null);
    expect(result.valid).toBe(false);
    expect(result.warnings).toContain('Data objekt mangler');
  });

  it('warns when expenses is not an array', () => {
    const data = {
      expenses: 'invalid',
      budgetPeriods: [],
    };
    const result = validateCloudData(data);
    expect(result.warnings).toContain('Udgifter er ikke et array');
  });

  it('warns when budgetPeriods is not an array', () => {
    const data = {
      expenses: [],
      budgetPeriods: 'invalid',
    };
    const result = validateCloudData(data);
    expect(result.warnings).toContain('Budgetperioder er ikke et array');
  });

  it('warns critically when syncing expenses without periods', () => {
    const data = {
      expenses: [{ id: 1, name: 'Test' }],
      budgetPeriods: [],
    };
    const result = validateCloudData(data);
    expect(result.valid).toBe(false);
    expect(result.warnings.some(w => w.includes('KRITISK'))).toBe(true);
  });

  it('validates foreign key integrity', () => {
    const data = {
      expenses: [
        { id: 1, budgetPeriodId: 1 },
        { id: 2, budgetPeriodId: 2 },
        { id: 3, budgetPeriodId: 999 }, // orphaned
      ],
      budgetPeriods: [
        { id: 1, year: 2024 },
        { id: 2, year: 2025 },
      ],
    };
    const result = validateCloudData(data);
    expect(result.valid).toBe(false);
    expect(
      result.warnings.some(w => w.includes('ugyldige budgetperioder'))
    ).toBe(true);
  });

  it('accepts data with valid foreign keys', () => {
    const data = {
      expenses: [
        { id: 1, budgetPeriodId: 1 },
        { id: 2, budgetPeriodId: 2 },
      ],
      budgetPeriods: [
        { id: 1, year: 2024 },
        { id: 2, year: 2025 },
      ],
    };
    const result = validateCloudData(data);
    expect(result.valid).toBe(true);
  });
});

describe('validateDownloadedData', () => {
  it('validates valid downloaded data', () => {
    const data = {
      expenses: [],
      budgetPeriods: [],
    };
    const result = validateDownloadedData(data);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('rejects null data', () => {
    const result = validateDownloadedData(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Ingen data modtaget fra skyen');
  });

  it('rejects missing expenses array', () => {
    const data = {
      budgetPeriods: [],
    };
    const result = validateDownloadedData(data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Udgifter mangler eller er ikke et array');
  });

  it('rejects missing budgetPeriods array', () => {
    const data = {
      expenses: [],
    };
    const result = validateDownloadedData(data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Budgetperioder mangler eller er ikke et array'
    );
  });

  it('cleans orphaned expenses and warns', () => {
    const data = {
      expenses: [
        { id: 1, budgetPeriodId: 1 },
        { id: 2, budgetPeriodId: 999 }, // orphaned
        { id: 3, budgetPeriodId: 1 },
      ],
      budgetPeriods: [{ id: 1, year: 2024 }],
    };
    const result = validateDownloadedData(data);
    expect(result.valid).toBe(true);
    expect(data.expenses).toHaveLength(2);
    expect(result.warnings.some(w => w.includes('cleaned'))).toBe(true);
  });

  it('preserves expenses without budgetPeriodId', () => {
    const data = {
      expenses: [
        { id: 1, budgetPeriodId: 1 },
        { id: 2 }, // no budgetPeriodId
      ],
      budgetPeriods: [{ id: 1, year: 2024 }],
    };
    const result = validateDownloadedData(data);
    expect(result.valid).toBe(true);
    expect(data.expenses).toHaveLength(2);
  });

  it('handles data with valid foreign keys', () => {
    const data = {
      expenses: [
        { id: 1, budgetPeriodId: 1 },
        { id: 2, budgetPeriodId: 2 },
      ],
      budgetPeriods: [
        { id: 1, year: 2024 },
        { id: 2, year: 2025 },
      ],
    };
    const result = validateDownloadedData(data);
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });
});

describe('validateExpense with monthlyAmounts', () => {
  const validExpense = {
    name: 'Test',
    amount: 100,
    frequency: 'monthly',
    startMonth: 1,
    endMonth: 12,
  };

  it('validates expense with null monthlyAmounts', () => {
    const expense = { ...validExpense, monthlyAmounts: null };
    const result = validateExpense(expense);
    expect(result.valid).toBe(true);
  });

  it('validates expense with valid monthlyAmounts', () => {
    const expense = {
      ...validExpense,
      monthlyAmounts: Array(12).fill(100),
    };
    const result = validateExpense(expense);
    expect(result.valid).toBe(true);
  });

  it('rejects expense with invalid monthlyAmounts', () => {
    const expense = {
      ...validExpense,
      monthlyAmounts: [100, 200, 300], // wrong length
    };
    const result = validateExpense(expense);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('12 værdier'))).toBe(true);
  });

  it('handles expense without monthlyAmounts field', () => {
    const expense = { ...validExpense };
    const result = validateExpense(expense);
    expect(result.valid).toBe(true);
  });
});
