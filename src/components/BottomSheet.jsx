import React, { useEffect, useRef } from 'react';
import { useViewportSize } from '../hooks/useViewportSize';
import './BottomSheet.css';

/**
 * Bottom-sheet modal component for mobile-optimized interactions
 *
 * On mobile (< 768px): Displays as a bottom sheet that slides up from the bottom
 * On desktop (>= 768px): Displays as a centered modal dialog
 *
 * Features:
 * - Touch-friendly swipe-to-dismiss gesture (mobile)
 * - Backdrop click to close
 * - Escape key to close
 * - Focus trap for accessibility
 * - Smooth animations
 * - Safe area support for notched devices
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback when modal should close
 * @param {string} props.title - Modal title
 * @param {React.ReactNode} props.children - Modal content
 * @param {string} props.size - Size variant ('sm', 'md', 'lg') - only affects desktop
 * @param {boolean} props.showCloseButton - Whether to show close button (default: true)
 */
const BottomSheet = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
}) => {
  const { isMobile } = useViewportSize();
  const sheetRef = useRef(null);
  const dragStartY = useRef(0);
  const dragCurrentY = useRef(0);
  const isDragging = useRef(false);

  // Focus trap on mount
  useEffect(() => {
    if (!isOpen) return;

    const sheet = sheetRef.current;
    if (!sheet) return;

    // Focus first focusable element
    const focusable = sheet.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = e => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Touch handlers for swipe-to-dismiss (mobile only)
  const handleTouchStart = e => {
    if (!isMobile) return;
    dragStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = e => {
    if (!isMobile || !isDragging.current) return;

    dragCurrentY.current = e.touches[0].clientY;
    const deltaY = dragCurrentY.current - dragStartY.current;

    // Only allow dragging down
    if (deltaY > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile || !isDragging.current) return;

    const deltaY = dragCurrentY.current - dragStartY.current;

    // If dragged down more than 100px, close the sheet
    if (deltaY > 100) {
      onClose();
    } else if (sheetRef.current) {
      // Reset position
      sheetRef.current.style.transform = 'translateY(0)';
    }

    isDragging.current = false;
    dragStartY.current = 0;
    dragCurrentY.current = 0;
  };

  // Backdrop click handler
  const handleBackdropClick = e => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`bottom-sheet-backdrop ${isMobile ? 'mobile' : 'desktop'}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bottom-sheet-title"
    >
      <div
        ref={sheetRef}
        className={`bottom-sheet ${isMobile ? 'mobile' : 'desktop'} size-${size}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle (mobile only) */}
        {isMobile && (
          <div className="drag-handle-container">
            <div className="drag-handle" aria-hidden="true" />
          </div>
        )}

        {/* Header */}
        <div className="bottom-sheet-header">
          <h2 id="bottom-sheet-title" className="bottom-sheet-title">
            {title}
          </h2>
          {showCloseButton && (
            <button
              className="bottom-sheet-close"
              onClick={onClose}
              aria-label="Luk"
              type="button"
            >
              ✕
            </button>
          )}
        </div>

        {/* Content */}
        <div className="bottom-sheet-content">{children}</div>
      </div>
    </div>
  );
};

export default BottomSheet;
