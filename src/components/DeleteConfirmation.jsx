/**
 * Delete confirmation component - replaces browser alerts with custom UI
 */

import { useEffect } from 'react'
import './DeleteConfirmation.css'

/**
 * DeleteConfirmation component
 * @param {boolean} isOpen - Confirmation visibility state
 * @param {function} onConfirm - Confirm deletion callback
 * @param {function} onCancel - Cancel deletion callback
 * @param {string} expenseName - Name of expense to delete (for single delete)
 * @param {number} count - Number of expenses to delete (for bulk delete)
 */
export const DeleteConfirmation = ({ isOpen, onConfirm, onCancel, expenseName, count }) => {
  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onConfirm()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onConfirm, onCancel])

  if (!isOpen) return null

  const isBulk = count && count > 0
  const message = isBulk
    ? `Er du sikker på at du vil slette ${count} udgift${count > 1 ? 'er' : ''}?`
    : `Er du sikker på at du vil slette "${expenseName}"?`

  return (
    <>
      <div className="delete-confirmation-backdrop" onClick={onCancel} />
      <div className="delete-confirmation">
        <div className="delete-confirmation-content">
          <div className="delete-confirmation-icon">🗑️</div>
          <h3 className="delete-confirmation-title">Bekræft sletning</h3>
          <p className="delete-confirmation-message">
            {message}
          </p>
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
            <button
              className="btn btn-confirm-delete"
              onClick={onConfirm}
            >
              <span className="btn-icon">🗑️</span>
              <span>Slet</span>
            </button>
          </div>
          <p className="delete-confirmation-shortcuts">
            <kbd>Enter</kbd> = Slet · <kbd>Esc</kbd> = Annuller
          </p>
        </div>
      </div>
    </>
  )
}
