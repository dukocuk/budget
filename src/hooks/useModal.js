/**
 * useModal - Consumer hook for Modal Context
 * Provides access to centralized modal state and controls
 */

import { useContext } from 'react';
import { ModalContext } from '../contexts/ModalContext';

export function useModal() {
  const context = useContext(ModalContext);

  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }

  return context;
}
