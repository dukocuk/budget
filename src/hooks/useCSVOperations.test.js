/**
 * Tests for useCSVOperations Hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCSVOperations } from './useCSVOperations';
import * as exportHelpers from '../utils/exportHelpers';
import * as importHelpers from '../utils/importHelpers';

// Mock the utility modules
vi.mock('../utils/exportHelpers');
vi.mock('../utils/importHelpers');
vi.mock('../utils/logger');

describe('useCSVOperations', () => {
  let mockParams;

  beforeEach(() => {
    mockParams = {
      expenses: [
        { id: '1', name: 'Test Expense', amount: 100, frequency: 'monthly' },
      ],
      activePeriod: {
        id: 'period-1',
        year: 2024,
        monthlyPayment: 1000,
        previousBalance: 5000,
      },
      addExpense: vi.fn(),
      showAlert: vi.fn(),
    };

    vi.clearAllMocks();
  });

  describe('handleExport', () => {
    it('should generate and download CSV successfully', () => {
      const mockCSVContent = 'Name,Amount\nTest,100';
      vi.mocked(exportHelpers.generateCSV).mockReturnValue(mockCSVContent);
      vi.mocked(exportHelpers.downloadCSV).mockImplementation(() => {});

      const { result } = renderHook(() => useCSVOperations(mockParams));
      result.current.handleExport();

      expect(exportHelpers.generateCSV).toHaveBeenCalledWith(
        mockParams.expenses,
        mockParams.activePeriod.monthlyPayment,
        mockParams.activePeriod.previousBalance
      );
      expect(exportHelpers.downloadCSV).toHaveBeenCalledWith(
        mockCSVContent,
        expect.stringMatching(/^budget_2024_\d{4}-\d{2}-\d{2}\.csv$/)
      );
      expect(mockParams.showAlert).toHaveBeenCalledWith(
        'CSV fil downloadet!',
        'success'
      );
    });

    it('should use monthlyPayments array if available', () => {
      const monthlyPayments = Array(12).fill(1000);
      mockParams.activePeriod.monthlyPayments = monthlyPayments;

      const { result } = renderHook(() => useCSVOperations(mockParams));
      result.current.handleExport();

      expect(exportHelpers.generateCSV).toHaveBeenCalledWith(
        mockParams.expenses,
        monthlyPayments,
        mockParams.activePeriod.previousBalance
      );
    });

    it('should handle export errors gracefully', () => {
      const error = new Error('Export failed');
      vi.mocked(exportHelpers.generateCSV).mockImplementation(() => {
        throw error;
      });

      const { result } = renderHook(() => useCSVOperations(mockParams));
      result.current.handleExport();

      expect(mockParams.showAlert).toHaveBeenCalledWith(
        'Kunne ikke eksportere CSV',
        'error'
      );
    });

    it('should do nothing if activePeriod is null', () => {
      mockParams.activePeriod = null;

      const { result } = renderHook(() => useCSVOperations(mockParams));
      result.current.handleExport();

      expect(exportHelpers.generateCSV).not.toHaveBeenCalled();
      expect(mockParams.showAlert).not.toHaveBeenCalled();
    });
  });

  describe('handleImport', () => {
    it('should import expenses successfully', async () => {
      const fileContent = 'test,100';
      const mockFile = {
        text: vi.fn().mockResolvedValue(fileContent),
      };
      const mockParsedExpenses = [
        { name: 'Imported Expense', amount: 200, frequency: 'monthly' },
        { name: 'Another Expense', amount: 300, frequency: 'yearly' },
      ];

      vi.mocked(importHelpers.parseCSV).mockReturnValue({
        success: true,
        expenses: mockParsedExpenses,
        errors: [],
      });

      const { result } = renderHook(() => useCSVOperations(mockParams));
      await result.current.handleImport(mockFile);

      expect(mockFile.text).toHaveBeenCalled();
      expect(importHelpers.parseCSV).toHaveBeenCalledWith(fileContent);
      expect(mockParams.addExpense).toHaveBeenCalledTimes(2);
      expect(mockParams.addExpense).toHaveBeenCalledWith(mockParsedExpenses[0]);
      expect(mockParams.addExpense).toHaveBeenCalledWith(mockParsedExpenses[1]);
      expect(mockParams.showAlert).toHaveBeenCalledWith(
        '2 udgift(er) importeret!',
        'success'
      );
    });

    it('should show error alert on import failure', async () => {
      const fileContent = 'invalid';
      const mockFile = {
        text: vi.fn().mockResolvedValue(fileContent),
      };
      vi.mocked(importHelpers.parseCSV).mockReturnValue({
        success: false,
        expenses: [],
        errors: ['Invalid format', 'Missing column'],
      });

      const { result } = renderHook(() => useCSVOperations(mockParams));
      await result.current.handleImport(mockFile);

      expect(mockFile.text).toHaveBeenCalled();
      expect(importHelpers.parseCSV).toHaveBeenCalledWith(fileContent);
      expect(mockParams.addExpense).not.toHaveBeenCalled();
      expect(mockParams.showAlert).toHaveBeenCalledWith(
        'Import fejl: Invalid format, Missing column',
        'error'
      );
    });

    it('should show info alert when no expenses found', async () => {
      const fileContent = 'empty';
      const mockFile = {
        text: vi.fn().mockResolvedValue(fileContent),
      };
      vi.mocked(importHelpers.parseCSV).mockReturnValue({
        success: true,
        expenses: [],
        errors: [],
      });

      const { result } = renderHook(() => useCSVOperations(mockParams));
      await result.current.handleImport(mockFile);

      expect(mockFile.text).toHaveBeenCalled();
      expect(importHelpers.parseCSV).toHaveBeenCalledWith(fileContent);
      expect(mockParams.addExpense).not.toHaveBeenCalled();
      expect(mockParams.showAlert).toHaveBeenCalledWith(
        'Ingen gyldige udgifter fundet i CSV filen',
        'info'
      );
    });

    it('should handle file reading errors', async () => {
      const mockFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      mockFile.text = vi.fn().mockRejectedValue(new Error('File read error'));

      const { result } = renderHook(() => useCSVOperations(mockParams));
      await result.current.handleImport(mockFile);

      expect(mockParams.showAlert).toHaveBeenCalledWith(
        'Kunne ikke importere CSV fil',
        'error'
      );
    });
  });
});
