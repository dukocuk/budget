/**
 * AuthContext - Shared authentication state
 * Used by AuthProvider to share auth state across all components
 */

import { createContext } from 'react';

export const AuthContext = createContext(null);
