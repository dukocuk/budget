/**
 * Test seed data for development and testing
 * DO NOT use in production - this is for dev/testing only
 */

import { log, warn } from './logger';

/**
 * Sample test expenses for development and testing
 * These are minimal, simple expenses to verify functionality
 */
export const SEED_EXPENSES = [
  {
    id: 'seed-1',
    name: 'Test Månedlig',
    amount: 100,
    frequency: 'monthly',
    startMonth: 1,
    endMonth: 12,
  },
  {
    id: 'seed-2',
    name: 'Test Kvartalsvis',
    amount: 400,
    frequency: 'quarterly',
    startMonth: 1,
    endMonth: 12,
  },
  {
    id: 'seed-3',
    name: 'Test Årlig',
    amount: 1200,
    frequency: 'yearly',
    startMonth: 1,
    endMonth: 1,
  },
  {
    id: 'seed-4',
    name: 'Test Delvis',
    amount: 200,
    frequency: 'monthly',
    startMonth: 3,
    endMonth: 9,
  },
  {
    id: 'seed-5',
    name: 'Test Kvartal Delvis',
    amount: 300,
    frequency: 'quarterly',
    startMonth: 4,
    endMonth: 10,
  },
];

/**
 * Load seed data for development/testing
 *
 * @returns {Array} Array of test expenses
 *
 * @example
 * // In browser console or dev tools:
 * import { loadSeedData } from './utils/seed'
 * const testExpenses = loadSeedData()
 *
 * @example
 * // In tests:
 * import { loadSeedData } from '../utils/seed'
 * const expenses = loadSeedData()
 */
export function loadSeedData() {
  // Environment check - only allow in development
  if (import.meta.env.PROD) {
    warn('Seed data is disabled in production');
    return [];
  }

  log('📦 Loading seed data (dev only):', SEED_EXPENSES.length, 'expenses');
  return [...SEED_EXPENSES];
}
