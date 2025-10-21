/**
 * Vitest test setup file
 * Runs before all test files
 */

import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import Modal from 'react-modal';

// Setup DOM for react-modal (must be before imports)
if (typeof document !== 'undefined' && !document.getElementById('root')) {
  const root = document.createElement('div');
  root.setAttribute('id', 'root');
  document.body.appendChild(root);
}

// Set up react-modal for all tests
Modal.setAppElement(document.body);

// Cleanup after each test case (e.g., clearing jsdom and react-modal state)
afterEach(() => {
  cleanup();

  // Clean up all ReactModalPortal elements that might have been left behind
  const portals = document.querySelectorAll('.ReactModalPortal');
  portals.forEach(portal => portal.remove());

  // Remove modal body classes
  document.body.classList.remove('ReactModal__Body--open');

  // Remove any aria-hidden attributes from root
  const roots = document.querySelectorAll('#root');
  roots.forEach(root => root.removeAttribute('aria-hidden'));
});

// Mock matchMedia for theme tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock PGlite to prevent IndexedDB sync errors in tests
vi.mock('@electric-sql/pglite', () => ({
  PGlite: vi.fn().mockImplementation(() => ({
    exec: vi.fn().mockResolvedValue({ rows: [] }),
    query: vi.fn().mockResolvedValue({ rows: [] }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock local PGlite database
vi.mock('../lib/pglite.js', () => ({
  localDB: {
    exec: vi.fn().mockResolvedValue({ rows: [] }),
    query: vi.fn().mockResolvedValue({ rows: [] }),
    close: vi.fn().mockResolvedValue(undefined),
  },
  initLocalDB: vi.fn().mockResolvedValue(true),
  clearLocalDB: vi.fn().mockResolvedValue(undefined),
  migrateSettingsTable: vi.fn().mockResolvedValue(undefined),
  migrateExpensesToUUID: vi.fn().mockResolvedValue(undefined),
}));

// Suppress React 19 act() warnings and React-Modal warnings in test output
// Tests are properly structured with act() but React 19 is more strict about warnings
// React-Modal has known issues with test environments that don't affect functionality
const originalError = console.error;
const originalWarn = console.warn;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('An update to') ||
      args[0].includes('not wrapped in act') ||
      args[0].includes(
        'testing environment is not configured to support act'
      ) ||
      args[0].includes('React-Modal'))
  ) {
    return;
  }
  originalError(...args);
};

console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('React-Modal') ||
      args[0].includes('parentSelector') ||
      args[0].includes('already open'))
  ) {
    return;
  }
  originalWarn(...args);
};
