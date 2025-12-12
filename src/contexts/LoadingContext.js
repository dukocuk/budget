/**
 * Loading Context - Context definition for loading state management
 * Separated from LoadingProvider to support React Fast Refresh
 */

import { createContext } from 'react';

export const LoadingContext = createContext(null);
