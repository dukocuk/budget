/**
 * Payment mode confirmation modal component
 */

import './PaymentModeConfirmation.css'

export const PaymentModeConfirmation = ({ isOpen, mode, onConfirm, onCancel }) => {
  if (!isOpen) return null

  const isFixedMode = mode === 'fixed'

  const title = isFixedMode
    ? 'Skift til fast beløb?'
    : 'Skift til variabel beløb?'

  const warningText = isFixedMode
    ? 'Dine nuværende variable beløb vil blive nulstillet'
    : 'Alle måneder initialiseres med det faste beløb'

  const questionText = isFixedMode
    ? 'Vil du skifte til fast beløb for hele året?'
    : 'Vil du skifte til variabel beløb per måned?'

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content payment-mode-confirmation" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>💰 {title}</h3>
        </div>
        <div className="modal-body">
          <div className="warning-box">
            <span className="icon">⚠️</span>
            <span>{warningText}</span>
          </div>
          <p>
            <strong>{questionText}</strong>
          </p>
        </div>
        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            autoFocus
          >
            Annuller
          </button>
          <button
            className="btn btn-primary"
            onClick={onConfirm}
          >
            Bekræft
          </button>
        </div>
      </div>
    </div>
  )
}
