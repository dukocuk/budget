/**
 * Mock Provider Wrapper for Integration Tests
 *
 * Provides a reusable test wrapper that includes all 6 context providers
 * with customizable mock values for testing complete workflows.
 *
 * NOTE: Helper functions moved to testUtils.js to enable React Fast Refresh.
 * This file now only exports React components.
 */

import React from 'react';
import { ExpenseContext } from '../../../contexts/ExpenseContext';
import { BudgetPeriodContext } from '../../../contexts/BudgetPeriodContext';
import { ModalContext } from '../../../contexts/ModalContext';
import { SyncContext } from '../../../contexts/SyncContext';
import { AlertContext } from '../../../contexts/AlertContext';
import { LoadingContext } from '../../../contexts/LoadingContext';
import { createDefaultMockValues } from './testUtils';

/**
 * Test Provider Wrapper Component
 *
 * Wraps children with all 6 context providers using mock values.
 * Allows customization of mock values via initialState parameter.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Components to wrap
 * @param {Object} props.initialState - Custom mock values to override defaults
 * @param {Object} props.initialState.auth - Auth context overrides
 * @param {Object} props.initialState.expense - Expense context overrides
 * @param {Object} props.initialState.budgetPeriod - Budget period context overrides
 * @param {Object} props.initialState.modal - Modal context overrides
 * @param {Object} props.initialState.sync - Sync context overrides
 * @param {Object} props.initialState.alert - Alert context overrides
 * @param {Object} props.initialState.loading - Loading context overrides
 */
export const TestProviderWrapper = ({ children, initialState = {} }) => {
  const mockValues = createDefaultMockValues(initialState);

  return (
    <LoadingContext.Provider value={mockValues.loading}>
      <SyncContext.Provider value={mockValues.sync}>
        <BudgetPeriodContext.Provider value={mockValues.budgetPeriod}>
          <AlertContext.Provider value={mockValues.alert}>
            <ModalContext.Provider value={mockValues.modal}>
              <ExpenseContext.Provider value={mockValues.expense}>
                {children}
              </ExpenseContext.Provider>
            </ModalContext.Provider>
          </AlertContext.Provider>
        </BudgetPeriodContext.Provider>
      </SyncContext.Provider>
    </LoadingContext.Provider>
  );
};

/**
 * Minimal wrapper for testing components that only need specific contexts
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {Array<string>} props.contexts - Array of context names to include
 * @param {Object} props.initialState - Custom mock values
 */
export const MinimalTestWrapper = ({
  children,
  contexts = [],
  initialState = {},
}) => {
  const mockValues = createDefaultMockValues(initialState);

  let wrappedChildren = children;

  // Wrap only requested contexts
  if (contexts.includes('expense')) {
    wrappedChildren = (
      <ExpenseContext.Provider value={mockValues.expense}>
        {wrappedChildren}
      </ExpenseContext.Provider>
    );
  }

  if (contexts.includes('budgetPeriod')) {
    wrappedChildren = (
      <BudgetPeriodContext.Provider value={mockValues.budgetPeriod}>
        {wrappedChildren}
      </BudgetPeriodContext.Provider>
    );
  }

  if (contexts.includes('modal')) {
    wrappedChildren = (
      <ModalContext.Provider value={mockValues.modal}>
        {wrappedChildren}
      </ModalContext.Provider>
    );
  }

  if (contexts.includes('sync')) {
    wrappedChildren = (
      <SyncContext.Provider value={mockValues.sync}>
        {wrappedChildren}
      </SyncContext.Provider>
    );
  }

  if (contexts.includes('alert')) {
    wrappedChildren = (
      <AlertContext.Provider value={mockValues.alert}>
        {wrappedChildren}
      </AlertContext.Provider>
    );
  }

  if (contexts.includes('loading')) {
    wrappedChildren = (
      <LoadingContext.Provider value={mockValues.loading}>
        {wrappedChildren}
      </LoadingContext.Provider>
    );
  }

  return wrappedChildren;
};
