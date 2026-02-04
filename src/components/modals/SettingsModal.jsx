/**
 * Modal wrapper for Settings component
 * Provides modal overlay and accessibility features
 *
 * Updated for tab-based Settings design:
 * - Simpler header (tabs provide section navigation)
 * - Adjusted padding for tab layout
 */

import Modal from 'react-modal';
import BottomSheet from '../common/BottomSheet';
import { useViewportSize } from '../../hooks/useViewportSize';
import { Settings } from '../features/Settings';
import './SettingsModal.css';

// Set app element for accessibility
Modal.setAppElement('#root');

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
  onImport,
  activePeriod,
  onArchivePeriod,
  onUnarchivePeriod,
  onOpenTemplateManager,
}) => {
  const { isMobile } = useViewportSize();

  // Shared settings content for both modal types
  const settingsContent = (
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
      activePeriod={activePeriod}
      onArchivePeriod={onArchivePeriod}
      onUnarchivePeriod={onUnarchivePeriod}
      onOpenTemplateManager={onOpenTemplateManager}
    />
  );

  // Mobile: Use BottomSheet
  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="⚙️ Indstillinger"
        size="lg"
      >
        {settingsContent}
      </BottomSheet>
    );
  }

  // Desktop: Use traditional Modal
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
      <div className="settings-modal-header">
        <h2>⚙️ Indstillinger</h2>
        <button
          className="settings-modal-close"
          onClick={onClose}
          aria-label="Luk indstillinger"
        >
          ✕
        </button>
      </div>

      <div className="settings-modal-body">{settingsContent}</div>
    </Modal>
  );
};
