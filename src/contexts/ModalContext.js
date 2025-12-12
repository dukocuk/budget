/**
 * Modal Context - Context definition for modal state management
 * Separated from ModalProvider to support React Fast Refresh
 */

import { createContext } from 'react';

export const ModalContext = createContext(null);
