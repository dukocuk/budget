/**
 * Modal wrapper for TemplateManager component
 * Provides modal overlay and accessibility features
 */

import Modal from 'react-modal';
import TemplateManager from '../features/TemplateManager';
import './TemplateManagerModal.css';

// Set app element for accessibility
Modal.setAppElement('#root');

/**
 * TemplateManagerModal component
 * @param {boolean} isOpen - Modal visibility state
 * @param {function} onClose - Close modal callback
 */
export const TemplateManagerModal = ({ isOpen, onClose }) => {
  const handleTemplateCreated = () => {
    // Optional: Show success feedback or refresh data
    // For now, we'll just let the TemplateManager handle its own alerts
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="template-manager-modal"
      overlayClassName="template-manager-modal-overlay"
      closeTimeoutMS={200}
      shouldCloseOnOverlayClick={true}
      shouldCloseOnEsc={true}
    >
      <div className="modal-header">
        <h2>📋 Administrer skabeloner</h2>
        <button
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Luk skabelonstyring"
        >
          ✕
        </button>
      </div>

      <div className="modal-body">
        <TemplateManager onTemplateCreated={handleTemplateCreated} />
      </div>
    </Modal>
  );
};
