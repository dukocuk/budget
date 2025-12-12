/**
 * LoadingProvider - Centralized loading state management
 *
 * Provides global loading state that can be updated from any component level.
 * Components call setLoadingStage() to update the unified loading screen.
 *
 * Loading stages:
 * - 'auth' (30%) - "Indlæser..."
 * - 'budget' (50%) - "Indlæser budget..."
 * - 'data' (80%) - "Henter dine data..."
 * - 'complete' (100%) - Loading finished
 *
 * Uses startTransition for smooth, flicker-free updates.
 */

import { useState, useCallback, startTransition } from 'react';
import { LoadingContext } from './LoadingContext';

export function LoadingProvider({ children }) {
  const [loadingState, setLoadingState] = useState({
    isLoading: false,
    stage: 'complete',
    message: '',
    progress: 100,
  });

  /**
   * Set loading stage from any component
   * @param {'auth' | 'budget' | 'data' | 'complete'} stage
   */
  const setLoadingStage = useCallback(stage => {
    startTransition(() => {
      switch (stage) {
        case 'auth':
          setLoadingState({
            isLoading: true,
            stage: 'auth',
            message: 'Indlæser...',
            progress: 30,
          });
          break;
        case 'budget':
          setLoadingState({
            isLoading: true,
            stage: 'budget',
            message: 'Indlæser budget...',
            progress: 50,
          });
          break;
        case 'data':
          setLoadingState({
            isLoading: true,
            stage: 'data',
            message: 'Henter dine data...',
            progress: 80,
          });
          break;
        case 'complete':
        default:
          setLoadingState({
            isLoading: false,
            stage: 'complete',
            message: '',
            progress: 100,
          });
          break;
      }
    });
  }, []);

  const value = {
    ...loadingState,
    setLoadingStage,
  };

  return (
    <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
  );
}
