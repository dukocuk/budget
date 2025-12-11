/**
 * Delete confirmation component - replaces browser alerts with custom UI
 */

import { useEffect, memo } from 'react';
import BottomSheet from './BottomSheet';
import { useViewportSize } from '../hooks/useViewportSize';
import './DeleteConfirmation.css';

/**
 * DeleteConfirmation component
 * @param {boolean} isOpen - Confirmation visibility state
 * @param {function} onConfirm - Confirm deletion callback
 * @param {function} onCancel - Cancel deletion callback
 * @param {string} expenseName - Name of expense to delete (for single delete)
 * @param {number} count - Number of expenses to delete (for bulk delete)
 */
export const DeleteConfirmation = memo(
  ({ isOpen, onConfirm, onCancel, expenseName, count }) => {
    const { isMobile } = useViewportSize();

    // Handle keyboard shortcuts
    useEffect(() => {
      if (!isOpen) return;

      const handleKeyDown = e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onConfirm();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onConfirm, onCancel]);

    if (!isOpen) return null;

    const isBulk = typeof count === 'number' && count > 0;
    const message = isBulk
      ? `Er du sikker på at du vil slette ${count} udgift${count > 1 ? 'er' : ''}?`
      : `Er du sikker på at du vil slette "${expenseName}"?`;

    // Shared confirmation content for both modal types
    const confirmationContent = (
      <div className="delete-confirmation-content">
        <div className="delete-confirmation-icon">🗑️</div>
        <h3 className="delete-confirmation-title">Bekræft sletning</h3>
        <p className="delete-confirmation-message">{message}</p>
        <p className="delete-confirmation-hint">
          Denne handling kan fortrydes med Ctrl+Z
        </p>
        <div className="delete-confirmation-actions">
          <button
            className="btn btn-cancel-delete"
            onClick={onCancel}
            autoFocus
          >
            Annuller
          </button>
          <button className="btn btn-confirm-delete" onClick={onConfirm}>
            <span className="btn-icon">🗑️</span>
            <span>Slet</span>
          </button>
        </div>
        <p className="delete-confirmation-shortcuts">
          <kbd>Enter</kbd> = Slet · <kbd>Esc</kbd> = Annuller
        </p>
      </div>
    );

    // Mobile: Use BottomSheet
    if (isMobile) {
      return (
        <BottomSheet
          isOpen={isOpen}
          onClose={onCancel}
          title="Bekræft sletning"
          size="sm"
          showCloseButton={false}
        >
          {confirmationContent}
        </BottomSheet>
      );
    }

    // Desktop: Use traditional custom modal
    return (
      <>
        <div className="delete-confirmation-backdrop" onClick={onCancel} />
        <div className="delete-confirmation">{confirmationContent}</div>
      </>
    );
  }
);
