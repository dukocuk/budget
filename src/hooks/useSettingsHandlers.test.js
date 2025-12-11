/**
 * Tests for useSettingsHandlers Hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSettingsHandlers } from './useSettingsHandlers';

vi.mock('../utils/logger');

describe('useSettingsHandlers', () => {
  let mockParams;

  beforeEach(() => {
    mockParams = {
      activePeriod: {
        id: 'period-1',
        year: 2024,
        monthlyPayment: 1000,
        previousBalance: 5000,
        monthlyPayments: null,
      },
      updatePeriod: vi.fn(),
      archivePeriod: vi.fn().mockResolvedValue({}),
      unarchivePeriod: vi.fn().mockResolvedValue({}),
      showAlert: vi.fn(),
    };

    vi.clearAllMocks();
  });

  describe('handleMonthlyPaymentChange', () => {
    it('should update monthly payment when activePeriod exists', () => {
      const { result } = renderHook(() => useSettingsHandlers(mockParams));
      result.current.handleMonthlyPaymentChange(1500);

      expect(mockParams.updatePeriod).toHaveBeenCalledWith('period-1', {
        monthlyPayment: 1500,
      });
    });

    it('should not update when activePeriod is null', () => {
      mockParams.activePeriod = null;
      const { result } = renderHook(() => useSettingsHandlers(mockParams));
      result.current.handleMonthlyPaymentChange(1500);

      expect(mockParams.updatePeriod).not.toHaveBeenCalled();
    });
  });

  describe('handlePreviousBalanceChange', () => {
    it('should update previous balance when activePeriod exists', () => {
      const { result } = renderHook(() => useSettingsHandlers(mockParams));
      result.current.handlePreviousBalanceChange(6000);

      expect(mockParams.updatePeriod).toHaveBeenCalledWith('period-1', {
        previousBalance: 6000,
      });
    });

    it('should not update when activePeriod is null', () => {
      mockParams.activePeriod = null;
      const { result } = renderHook(() => useSettingsHandlers(mockParams));
      result.current.handlePreviousBalanceChange(6000);

      expect(mockParams.updatePeriod).not.toHaveBeenCalled();
    });
  });

  describe('handleMonthlyPaymentsChange', () => {
    it('should update monthly payments array', () => {
      const paymentsArray = Array(12).fill(1200);
      const { result } = renderHook(() => useSettingsHandlers(mockParams));
      result.current.handleMonthlyPaymentsChange(paymentsArray);

      expect(mockParams.updatePeriod).toHaveBeenCalledWith('period-1', {
        monthlyPayments: paymentsArray,
      });
    });

    it('should not update when activePeriod is null', () => {
      mockParams.activePeriod = null;
      const paymentsArray = Array(12).fill(1200);
      const { result } = renderHook(() => useSettingsHandlers(mockParams));
      result.current.handleMonthlyPaymentsChange(paymentsArray);

      expect(mockParams.updatePeriod).not.toHaveBeenCalled();
    });
  });

  describe('handleTogglePaymentMode', () => {
    it('should enable variable payments mode with existing array', () => {
      const existingArray = Array(12).fill(1000);
      mockParams.activePeriod.monthlyPayments = existingArray;

      const { result } = renderHook(() => useSettingsHandlers(mockParams));
      result.current.handleTogglePaymentMode(true);

      expect(mockParams.updatePeriod).toHaveBeenCalledWith('period-1', {
        monthlyPayments: existingArray,
      });
    });

    it('should enable variable payments mode with new array from monthlyPayment', () => {
      const { result } = renderHook(() => useSettingsHandlers(mockParams));
      result.current.handleTogglePaymentMode(true);

      expect(mockParams.updatePeriod).toHaveBeenCalledWith('period-1', {
        monthlyPayments: Array(12).fill(1000),
      });
    });

    it('should disable variable payments mode', () => {
      mockParams.activePeriod.monthlyPayments = Array(12).fill(1000);

      const { result } = renderHook(() => useSettingsHandlers(mockParams));
      result.current.handleTogglePaymentMode(false);

      expect(mockParams.updatePeriod).toHaveBeenCalledWith('period-1', {
        monthlyPayments: null,
      });
    });

    it('should not toggle when activePeriod is null', () => {
      mockParams.activePeriod = null;
      const { result } = renderHook(() => useSettingsHandlers(mockParams));
      result.current.handleTogglePaymentMode(true);

      expect(mockParams.updatePeriod).not.toHaveBeenCalled();
    });
  });

  describe('handleArchivePeriod', () => {
    it('should archive period and show success alert', async () => {
      const { result } = renderHook(() => useSettingsHandlers(mockParams));
      await result.current.handleArchivePeriod('period-1');

      expect(mockParams.archivePeriod).toHaveBeenCalledWith('period-1');
      expect(mockParams.showAlert).toHaveBeenCalledWith(
        '✅ År 2024 er nu arkiveret',
        'success'
      );
    });

    it('should handle archive errors gracefully', async () => {
      const error = new Error('Archive failed');
      mockParams.archivePeriod.mockRejectedValue(error);

      const { result } = renderHook(() => useSettingsHandlers(mockParams));
      await result.current.handleArchivePeriod('period-1');

      expect(mockParams.showAlert).toHaveBeenCalledWith(
        '❌ Kunne ikke arkivere år: Archive failed',
        'error'
      );
    });
  });

  describe('handleUnarchivePeriod', () => {
    it('should unarchive period and show success alert', async () => {
      const { result } = renderHook(() => useSettingsHandlers(mockParams));
      await result.current.handleUnarchivePeriod('period-1');

      expect(mockParams.unarchivePeriod).toHaveBeenCalledWith('period-1');
      expect(mockParams.showAlert).toHaveBeenCalledWith(
        '✅ År 2024 er nu genaktiveret og kan redigeres',
        'success'
      );
    });

    it('should handle unarchive errors gracefully', async () => {
      const error = new Error('Unarchive failed');
      mockParams.unarchivePeriod.mockRejectedValue(error);

      const { result } = renderHook(() => useSettingsHandlers(mockParams));
      await result.current.handleUnarchivePeriod('period-1');

      expect(mockParams.showAlert).toHaveBeenCalledWith(
        '❌ Kunne ikke genaktivere år: Unarchive failed',
        'error'
      );
    });
  });

  describe('All handlers together', () => {
    it('should provide all six handler functions', () => {
      const { result } = renderHook(() => useSettingsHandlers(mockParams));

      expect(result.current).toHaveProperty('handleMonthlyPaymentChange');
      expect(result.current).toHaveProperty('handlePreviousBalanceChange');
      expect(result.current).toHaveProperty('handleMonthlyPaymentsChange');
      expect(result.current).toHaveProperty('handleTogglePaymentMode');
      expect(result.current).toHaveProperty('handleArchivePeriod');
      expect(result.current).toHaveProperty('handleUnarchivePeriod');
    });
  });
});
