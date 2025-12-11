/**
 * Tests for useYearManagement Hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useYearManagement } from './useYearManagement';

vi.mock('../utils/logger');

describe('useYearManagement', () => {
  let mockParams;

  beforeEach(() => {
    mockParams = {
      createPeriod: vi.fn().mockResolvedValue({}),
      createFromTemplate: vi.fn().mockResolvedValue({}),
      closeCreateYearModal: vi.fn(),
      showAlert: vi.fn(),
    };

    vi.clearAllMocks();
  });

  describe('handleCreateYear', () => {
    it('should create period from template when templateId is provided', async () => {
      const yearData = {
        year: 2025,
        previousBalance: 10000,
        templateId: 'template-123',
      };

      const { result } = renderHook(() => useYearManagement(mockParams));
      await result.current.handleCreateYear(yearData);

      expect(mockParams.createFromTemplate).toHaveBeenCalledWith({
        templateId: 'template-123',
        year: 2025,
        previousBalance: 10000,
      });
      expect(mockParams.createPeriod).not.toHaveBeenCalled();
      expect(mockParams.showAlert).toHaveBeenCalledWith(
        '✅ Budget for år 2025 oprettet fra skabelon!',
        'success'
      );
      expect(mockParams.closeCreateYearModal).toHaveBeenCalled();
    });

    it('should create regular period when templateId is not provided', async () => {
      const yearData = {
        year: 2025,
        previousBalance: 10000,
        copyExpensesFrom: 'period-2024',
      };

      const { result } = renderHook(() => useYearManagement(mockParams));
      await result.current.handleCreateYear(yearData);

      expect(mockParams.createPeriod).toHaveBeenCalledWith(yearData);
      expect(mockParams.createFromTemplate).not.toHaveBeenCalled();
      expect(mockParams.showAlert).toHaveBeenCalledWith(
        '✅ Budget for år 2025 oprettet!',
        'success'
      );
      expect(mockParams.closeCreateYearModal).toHaveBeenCalled();
    });

    it('should handle creation errors gracefully', async () => {
      const error = new Error('Creation failed');
      mockParams.createPeriod.mockRejectedValue(error);

      const yearData = { year: 2025, previousBalance: 10000 };

      const { result } = renderHook(() => useYearManagement(mockParams));
      await result.current.handleCreateYear(yearData);

      expect(mockParams.showAlert).toHaveBeenCalledWith(
        '❌ Kunne ikke oprette år: Creation failed',
        'error'
      );
      expect(mockParams.closeCreateYearModal).not.toHaveBeenCalled();
    });

    it('should handle template creation errors', async () => {
      const error = new Error('Template not found');
      mockParams.createFromTemplate.mockRejectedValue(error);

      const yearData = {
        year: 2025,
        previousBalance: 10000,
        templateId: 'invalid-template',
      };

      const { result } = renderHook(() => useYearManagement(mockParams));
      await result.current.handleCreateYear(yearData);

      expect(mockParams.showAlert).toHaveBeenCalledWith(
        '❌ Kunne ikke oprette år: Template not found',
        'error'
      );
      expect(mockParams.closeCreateYearModal).not.toHaveBeenCalled();
    });
  });

  describe('handleSelectPeriod', () => {
    it('should show info alert for active period', () => {
      const period = { id: 'period-1', year: 2024, status: 'active' };

      const { result } = renderHook(() => useYearManagement(mockParams));
      result.current.handleSelectPeriod(period);

      expect(mockParams.showAlert).toHaveBeenCalledWith(
        'Skiftet til budget 2024 ',
        'info'
      );
    });

    it('should show archived status in alert for archived period', () => {
      const period = { id: 'period-1', year: 2023, status: 'archived' };

      const { result } = renderHook(() => useYearManagement(mockParams));
      result.current.handleSelectPeriod(period);

      expect(mockParams.showAlert).toHaveBeenCalledWith(
        'Skiftet til budget 2023 📦 Arkiveret',
        'info'
      );
    });
  });
});
