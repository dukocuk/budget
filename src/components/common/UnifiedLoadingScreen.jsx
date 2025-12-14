import { useLoadingContext } from '../../hooks/useLoadingContext';
import { useState, useEffect } from 'react';
import './UnifiedLoadingScreen.css';

/**
 * UnifiedLoadingScreen - Single persistent loading component
 *
 * Displays all loading phases without remounting/unmounting:
 * - Auth loading (⚙️ icon, 30%)
 * - Budget loading (⚙️ icon, 50%)
 * - Data loading (☁️ icon, 80%)
 *
 * Uses CSS transitions for smooth message changes (no flickering).
 * Fades out smoothly when loading completes.
 */
export function UnifiedLoadingScreen() {
  const { isLoading, stage, message, progress } = useLoadingContext();
  const [shouldRender, setShouldRender] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (isLoading) {
      // Loading started - show immediately
      setShouldRender(true);
      setIsExiting(false);
    } else if (shouldRender) {
      // Loading finished - start fade-out
      setIsExiting(true);

      // After fade animation completes, unmount component
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsExiting(false);
      }, 400); // Match CSS transition duration

      return () => clearTimeout(timer);
    }
  }, [isLoading, shouldRender]);

  if (!shouldRender) {
    return null;
  }

  // Icon changes only for data stage (cloud icon)
  const icon = stage === 'data' ? '☁️' : '⚙️';

  // Show help text only for data stage if loading takes too long
  const showHelpText = stage === 'data';

  return (
    <div className={`loading-container ${isExiting ? 'exiting' : ''}`}>
      <div className="loading-card">
        <div className="loading-icon">{icon}</div>
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="loading-message">{message}</p>
        <div className="spinner-enhanced"></div>
        <p
          className={`loading-help-text ${showHelpText ? 'visible' : 'hidden'}`}
        >
          Hvis indlæsning tager lang tid, prøv at genindlæse siden.
        </p>
      </div>
    </div>
  );
}
