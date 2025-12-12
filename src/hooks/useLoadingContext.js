import { useContext } from 'react';
import { LoadingContext } from '../contexts/LoadingContext';

/**
 * useLoadingContext - Consumer hook for LoadingProvider
 *
 * Returns:
 * {
 *   isLoading: boolean,
 *   stage: 'auth' | 'budget' | 'data' | 'complete',
 *   message: string,
 *   progress: number (0-100),
 *   setLoadingStage: (stage) => void
 * }
 *
 * Usage:
 * const { isLoading, setLoadingStage } = useLoadingContext();
 * setLoadingStage('auth'); // Update loading screen from any component
 */
export function useLoadingContext() {
  const context = useContext(LoadingContext);

  if (!context) {
    throw new Error('useLoadingContext must be used within LoadingProvider');
  }

  return context;
}
