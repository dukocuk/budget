/**
 * Test Helper Utilities for Integration Tests
 *
 * Common utilities for:
 * - Waiting for async operations
 * - Form interactions
 * - Database assertions
 * - Element queries
 */

import { waitFor } from '@testing-library/react';
import { vi } from 'vitest';

/**
 * Wait for database query to be called with specific parameters
 */
export const waitForDatabaseQuery = async (
  mockQuery,
  expectedSql,
  timeout = 1000
) => {
  await waitFor(
    () => {
      const calls = mockQuery.mock.calls;
      const matchingCall = calls.find(([sql]) => sql.includes(expectedSql));
      expect(matchingCall).toBeDefined();
    },
    { timeout }
  );
};

/**
 * Wait for sync function to be called
 */
export const waitForSync = async (mockSyncFn, timeout = 2000) => {
  await waitFor(
    () => {
      expect(mockSyncFn).toHaveBeenCalled();
    },
    { timeout }
  );
};

/**
 * Wait for alert to be shown
 */
export const waitForAlert = async (
  mockShowAlert,
  expectedMessage,
  timeout = 1000
) => {
  await waitFor(
    () => {
      const calls = mockShowAlert.mock.calls;
      const matchingCall = calls.find(([message]) =>
        message.includes(expectedMessage)
      );
      expect(matchingCall).toBeDefined();
    },
    { timeout }
  );
};

/**
 * Fill in a form field by label
 */
export const fillFormField = async (user, label, value) => {
  const input = await waitFor(() => {
    const element =
      document.querySelector(`[aria-label="${label}"]`) ||
      document.querySelector(`label:has-text("${label}") + input`) ||
      document.querySelector(`label:has-text("${label}") + select`);
    expect(element).toBeDefined();
    return element;
  });

  if (input.tagName === 'SELECT') {
    await user.selectOptions(input, value);
  } else {
    await user.clear(input);
    await user.type(input, value);
  }
};

/**
 * Submit a form
 */
export const submitForm = async (user, buttonText = 'Gem') => {
  const button = await waitFor(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b =>
      b.textContent.includes(buttonText)
    );
    expect(btn).toBeDefined();
    expect(btn).not.toBeDisabled();
    return btn;
  });

  await user.click(button);
};

/**
 * Click a button by text
 */
export const clickButton = async (user, buttonText) => {
  const button = await waitFor(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b =>
      b.textContent.includes(buttonText)
    );
    expect(btn).toBeDefined();
    return btn;
  });

  await user.click(button);
};

/**
 * Wait for modal to open
 */
export const waitForModal = async (modalTitle, timeout = 1000) => {
  await waitFor(
    () => {
      const dialog = document.querySelector('[role="dialog"]');
      expect(dialog).toBeInTheDocument();
      if (modalTitle) {
        expect(dialog).toHaveTextContent(modalTitle);
      }
    },
    { timeout }
  );
};

/**
 * Wait for modal to close
 */
export const waitForModalClose = async (timeout = 1000) => {
  await waitFor(
    () => {
      const dialog = document.querySelector('[role="dialog"]');
      expect(dialog).not.toBeInTheDocument();
    },
    { timeout }
  );
};

/**
 * Get table rows
 */
export const getTableRows = container => {
  const table = container.querySelector('table');
  if (!table) return [];

  return Array.from(table.querySelectorAll('tbody tr'));
};

/**
 * Find table row by cell content
 */
export const findTableRowByContent = (container, cellContent) => {
  const rows = getTableRows(container);
  return rows.find(row => row.textContent.includes(cellContent));
};

/**
 * Get table cell value
 */
export const getTableCellValue = (row, columnIndex) => {
  const cells = row.querySelectorAll('td');
  return cells[columnIndex]?.textContent || '';
};

/**
 * Mock PGlite database
 */
export const setupMockDatabase = () => {
  const queryResults = new Map();
  const executionLog = [];

  const mockQuery = vi.fn(async (sql, params = []) => {
    executionLog.push({ sql, params, timestamp: Date.now() });

    // Return predefined results based on SQL pattern
    for (const [pattern, result] of queryResults.entries()) {
      if (sql.includes(pattern)) {
        return result;
      }
    }

    // Default empty result
    return { rows: [] };
  });

  const mockExec = vi.fn(async sql => {
    executionLog.push({ sql, timestamp: Date.now() });
    return { rows: [] };
  });

  const setQueryResult = (sqlPattern, result) => {
    queryResults.set(sqlPattern, result);
  };

  const getExecutionLog = () => executionLog;

  const clearExecutionLog = () => {
    executionLog.length = 0;
  };

  return {
    mockQuery,
    mockExec,
    setQueryResult,
    getExecutionLog,
    clearExecutionLog,
  };
};

/**
 * Simulate keyboard shortcut
 */
export const pressShortcut = (key, modifiers = {}) => {
  const event = new KeyboardEvent('keydown', {
    key,
    code: key,
    ctrlKey: modifiers.ctrl || false,
    metaKey: modifiers.meta || false,
    shiftKey: modifiers.shift || false,
    altKey: modifiers.alt || false,
    bubbles: true,
  });

  document.dispatchEvent(event);
};

/**
 * Wait for debounced function to be called
 */
export const waitForDebounce = async (delay = 1100) => {
  await new Promise(resolve => setTimeout(resolve, delay));
};

/**
 * Advance timers and wait for updates
 */
export const advanceTimersAndWait = async ms => {
  vi.advanceTimersByTime(ms);
  await waitFor(() => {
    // Just wait for next tick
    expect(true).toBe(true);
  });
};

/**
 * Assert element is visible
 */
export const assertVisible = element => {
  expect(element).toBeInTheDocument();
  expect(element).toBeVisible();
};

/**
 * Assert element is hidden
 */
export const assertHidden = element => {
  if (element) {
    expect(element).not.toBeVisible();
  } else {
    expect(element).not.toBeInTheDocument();
  }
};

/**
 * Assert element is disabled
 */
export const assertDisabled = element => {
  expect(element).toBeInTheDocument();
  expect(element).toBeDisabled();
};

/**
 * Assert element is enabled
 */
export const assertEnabled = element => {
  expect(element).toBeInTheDocument();
  expect(element).not.toBeDisabled();
};

/**
 * Assert validation error is shown
 */
export const assertValidationError = (container, errorMessage) => {
  const error = container.querySelector(
    '.error-message, .field-error, [role="alert"]'
  );
  expect(error).toBeInTheDocument();
  expect(error).toHaveTextContent(errorMessage);
};

/**
 * Create mock file for file upload tests
 */
export const createMockFile = (name, content, type = 'text/csv') => {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
};

/**
 * Simulate file upload
 */
export const uploadFile = async (user, inputElement, file) => {
  await user.upload(inputElement, file);
};

/**
 * Wait for download to trigger
 */
export const waitForDownload = async (mockCreateElement, expectedFilename) => {
  await waitFor(() => {
    const calls = mockCreateElement.mock.results;
    const anchorCall = calls.find(call => {
      const element = call.value;
      return element?.tagName === 'A' && element?.download === expectedFilename;
    });
    expect(anchorCall).toBeDefined();
  });
};

/**
 * Get computed style value
 */
export const getComputedStyleValue = (element, property) => {
  return window.getComputedStyle(element).getPropertyValue(property);
};

/**
 * Assert element has CSS class
 */
export const assertHasClass = (element, className) => {
  expect(element.classList.contains(className)).toBe(true);
};

/**
 * Assert element does not have CSS class
 */
export const assertDoesNotHaveClass = (element, className) => {
  expect(element.classList.contains(className)).toBe(false);
};

/**
 * Query by test ID
 */
export const getByTestId = (container, testId) => {
  return container.querySelector(`[data-testid="${testId}"]`);
};

/**
 * Query all by test ID
 */
export const getAllByTestId = (container, testId) => {
  return Array.from(container.querySelectorAll(`[data-testid="${testId}"]`));
};
