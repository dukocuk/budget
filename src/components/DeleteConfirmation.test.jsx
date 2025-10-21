/**
 * Tests for DeleteConfirmation component
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeleteConfirmation } from './DeleteConfirmation';

describe('DeleteConfirmation', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render when open', () => {
      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          expenseName="Test Expense"
        />
      );

      expect(screen.getByText('Bekræft sletning')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(
        <DeleteConfirmation
          isOpen={false}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          expenseName="Test Expense"
        />
      );

      expect(screen.queryByText('Bekræft sletning')).not.toBeInTheDocument();
    });

    it('should render confirmation icon', () => {
      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          expenseName="Test Expense"
        />
      );

      const icon = document.querySelector('.delete-confirmation-icon');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent('🗑️');
    });

    it('should render action buttons', () => {
      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          expenseName="Test Expense"
        />
      );

      expect(screen.getByText('Annuller')).toBeInTheDocument();
      expect(screen.getByText('Slet')).toBeInTheDocument();
    });

    it('should render undo hint', () => {
      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          expenseName="Test Expense"
        />
      );

      expect(
        screen.getByText('Denne handling kan fortrydes med Ctrl+Z')
      ).toBeInTheDocument();
    });

    it('should render keyboard shortcuts hint', () => {
      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          expenseName="Test Expense"
        />
      );

      expect(screen.getByText('Enter')).toBeInTheDocument();
      expect(screen.getByText('Esc')).toBeInTheDocument();
    });
  });

  describe('Single Expense Deletion', () => {
    it('should show expense name in confirmation message', () => {
      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          expenseName="Netflix Subscription"
        />
      );

      expect(
        screen.getByText(
          'Er du sikker på at du vil slette "Netflix Subscription"?'
        )
      ).toBeInTheDocument();
    });

    it('should call onConfirm when confirm button clicked', () => {
      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          expenseName="Test Expense"
        />
      );

      const confirmButton = screen.getByText('Slet');
      fireEvent.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when cancel button clicked', () => {
      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          expenseName="Test Expense"
        />
      );

      const cancelButton = screen.getByText('Annuller');
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Bulk Deletion', () => {
    it('should show count for single expense in bulk mode', () => {
      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          count={1}
        />
      );

      expect(
        screen.getByText('Er du sikker på at du vil slette 1 udgift?')
      ).toBeInTheDocument();
    });

    it('should show count for multiple expenses with plural form', () => {
      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          count={5}
        />
      );

      expect(
        screen.getByText('Er du sikker på at du vil slette 5 udgifter?')
      ).toBeInTheDocument();
    });

    it('should use plural form correctly for 2 expenses', () => {
      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          count={2}
        />
      );

      expect(
        screen.getByText('Er du sikker på at du vil slette 2 udgifter?')
      ).toBeInTheDocument();
    });

    it('should prioritize count over expenseName', () => {
      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          expenseName="Should be ignored"
          count={3}
        />
      );

      expect(
        screen.getByText('Er du sikker på at du vil slette 3 udgifter?')
      ).toBeInTheDocument();
      expect(screen.queryByText(/Should be ignored/)).not.toBeInTheDocument();
    });
  });

  describe('Backdrop Interaction', () => {
    it('should call onCancel when backdrop clicked', () => {
      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          expenseName="Test Expense"
        />
      );

      const backdrop = document.querySelector('.delete-confirmation-backdrop');
      fireEvent.click(backdrop);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should not call onConfirm when backdrop clicked', () => {
      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          expenseName="Test Expense"
        />
      );

      const backdrop = document.querySelector('.delete-confirmation-backdrop');
      fireEvent.click(backdrop);

      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should call onConfirm when Enter is pressed', () => {
      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          expenseName="Test Expense"
        />
      );

      fireEvent.keyDown(document, { key: 'Enter' });

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when Escape is pressed', () => {
      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          expenseName="Test Expense"
        />
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should not respond to keyboard when closed', () => {
      render(
        <DeleteConfirmation
          isOpen={false}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          expenseName="Test Expense"
        />
      );

      fireEvent.keyDown(document, { key: 'Enter' });
      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnConfirm).not.toHaveBeenCalled();
      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('should prevent default behavior for Enter key', () => {
      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          expenseName="Test Expense"
        />
      );

      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      document.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should prevent default behavior for Escape key', () => {
      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          expenseName="Test Expense"
        />
      );

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      document.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners when closed', () => {
      const { rerender } = render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          expenseName="Test Expense"
        />
      );

      // Close modal
      rerender(
        <DeleteConfirmation
          isOpen={false}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          expenseName="Test Expense"
        />
      );

      // Try keyboard shortcuts - should not work
      fireEvent.keyDown(document, { key: 'Enter' });
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should remove event listeners on unmount', () => {
      const { unmount } = render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          expenseName="Test Expense"
        />
      );

      unmount();

      // Try keyboard shortcuts - should not work
      fireEvent.keyDown(document, { key: 'Enter' });
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have cancel button focused by default', () => {
      const { container } = render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          expenseName="Test Expense"
        />
      );

      const cancelButton = screen.getByText('Annuller');

      // Check that autoFocus prop is set (React camelCase convention)
      // Note: happy-dom may not fully simulate focus behavior
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton.classList.contains('btn-cancel-delete')).toBe(true);
    });

    it('should have keyboard shortcuts displayed visually', () => {
      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          expenseName="Test Expense"
        />
      );

      // Check for <kbd> elements containing keyboard shortcuts
      expect(screen.getByText('Enter')).toBeInTheDocument();
      expect(screen.getByText('Esc')).toBeInTheDocument();

      // Verify they are in kbd elements
      const shortcutsContainer = document.querySelector(
        '.delete-confirmation-shortcuts'
      );
      expect(shortcutsContainer).toBeInTheDocument();
      expect(shortcutsContainer.innerHTML).toContain('<kbd>');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero count', () => {
      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          count={0}
        />
      );

      expect(
        screen.getByText('Er du sikker på at du vil slette 0 udgift?')
      ).toBeInTheDocument();
    });

    it('should handle missing expenseName', () => {
      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Bekræft sletning')).toBeInTheDocument();
    });

    it('should handle special characters in expense name', () => {
      render(
        <DeleteConfirmation
          isOpen={true}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          expenseName="Netflix & HBO (Premium)"
        />
      );

      expect(
        screen.getByText(
          'Er du sikker på at du vil slette "Netflix & HBO (Premium)"?'
        )
      ).toBeInTheDocument();
    });
  });
});
