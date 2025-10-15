/**
 * Modal wrapper for Settings component
 * Provides modal overlay and accessibility features
 */

import Modal from 'react-modal'
import { Settings } from './Settings'
import './SettingsModal.css'

// Set app element for accessibility
Modal.setAppElement('#root')

/**
 * SettingsModal component
 * @param {boolean} isOpen - Modal visibility state
 * @param {function} onClose - Close modal callback
 * @param {object} props - All Settings component props
 */
export const SettingsModal = ({
  isOpen,
  onClose,
  monthlyPayment,
  previousBalance,
  monthlyPayments,
  useVariablePayments,
  onMonthlyPaymentChange,
  onPreviousBalanceChange,
  onMonthlyPaymentsChange,
  onTogglePaymentMode,
  onExport,
  onImport
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="settings-modal"
      overlayClassName="settings-modal-overlay"
      closeTimeoutMS={200}
      shouldCloseOnOverlayClick={true}
      shouldCloseOnEsc={true}
    >
      <div className="modal-header">
        <h2>⚙️ Indstillinger</h2>
        <button
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Luk indstillinger"
        >
          ✕
        </button>
      </div>

      <div className="modal-body">
        <Settings
          monthlyPayment={monthlyPayment}
          previousBalance={previousBalance}
          monthlyPayments={monthlyPayments}
          useVariablePayments={useVariablePayments}
          onMonthlyPaymentChange={onMonthlyPaymentChange}
          onPreviousBalanceChange={onPreviousBalanceChange}
          onMonthlyPaymentsChange={onMonthlyPaymentsChange}
          onTogglePaymentMode={onTogglePaymentMode}
          onExport={onExport}
          onImport={onImport}
        />
      </div>
    </Modal>
  )
}
