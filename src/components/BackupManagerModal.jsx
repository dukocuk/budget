/**
 * BackupManagerModal - List, preview, and restore backups
 *
 * Features:
 * - List all available backups (newest first)
 * - Preview backup contents before restore
 * - Confirmation dialog with backup details
 * - Loading states for all async operations
 * - Error handling with user-friendly messages
 */
import { useState, useEffect } from 'react';
import { useViewportSize } from '../hooks/useViewportSize';
import './BackupManagerModal.css';

export const BackupManagerModal = ({
  isOpen,
  onClose,
  listBackups,
  getPreview,
  restoreBackup,
}) => {
  const { isMobile } = useViewportSize();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [preview, setPreview] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Load backups on mount
  useEffect(() => {
    if (isOpen) {
      loadBackupsList();
    }
  }, [isOpen]);

  const loadBackupsList = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listBackups();
      setBackups(data);
    } catch (err) {
      setError('Kunne ikke hente backups: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreClick = async backup => {
    setSelectedBackup(backup);
    setPreview(null);
    setError(null);

    try {
      const previewData = await getPreview(backup.fileId);
      setPreview(previewData);
      setShowConfirmation(true);
    } catch (err) {
      setError('Kunne ikke hente backup preview: ' + err.message);
    }
  };

  const handleConfirmRestore = async () => {
    setRestoring(true);
    setShowConfirmation(false);

    try {
      const result = await restoreBackup(selectedBackup.fileId);
      if (result.success) {
        // Success - close modal and trigger app reload
        onClose();
        window.location.reload(); // Force full app refresh
      } else {
        setError('Gendannelse fejlede: ' + result.error);
        setRestoring(false);
      }
    } catch (err) {
      setError('Gendannelse fejlede: ' + err.message);
      setRestoring(false);
    } finally {
      setSelectedBackup(null);
      setPreview(null);
    }
  };

  const handleCancelRestore = () => {
    setShowConfirmation(false);
    setSelectedBackup(null);
    setPreview(null);
  };

  // Format date for display
  const formatDate = date => {
    return new Date(date).toLocaleString('da-DK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Main Modal */}
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal backup-manager-modal">
        <div className="backup-manager-content">
          <div className="backup-manager-header">
            <h2>📋 Administrer backups</h2>
            <button className="modal-close" onClick={onClose} aria-label="Luk">
              ✕
            </button>
          </div>

          {loading && (
            <div className="backup-loading">⏳ Henter backups...</div>
          )}

          {error && (
            <div className="backup-error">
              <p>⚠️ {error}</p>
              <button className="btn btn-secondary" onClick={loadBackupsList}>
                Prøv igen
              </button>
            </div>
          )}

          {!loading && !error && backups.length === 0 && (
            <div className="backup-empty">
              <p>📦 Ingen backups fundet</p>
              <p>Opret din første backup fra indstillinger</p>
            </div>
          )}

          {!loading && !error && backups.length > 0 && (
            <div className="backup-list">
              <table className="backup-table">
                <thead>
                  <tr>
                    <th>Dato og tid</th>
                    <th>Filnavn</th>
                    <th>Størrelse</th>
                    <th>Handling</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map(backup => (
                    <tr key={backup.fileId}>
                      <td>{formatDate(backup.date)}</td>
                      <td className="backup-filename">{backup.filename}</td>
                      <td>{backup.sizeKB} KB</td>
                      <td>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleRestoreClick(backup)}
                          disabled={restoring}
                        >
                          Gendan
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="backup-note">
                💡 Gendannelse erstatter alle nuværende data med backup-data
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && preview && (
        <>
          <div
            className="modal-backdrop"
            onClick={handleCancelRestore}
            style={{ zIndex: 1102 }}
          />
          <div
            className="modal backup-confirmation-modal"
            style={{ zIndex: 1103 }}
          >
            <div className="backup-confirmation-content">
              <div className="backup-confirmation-icon">⚠️</div>
              <h3>Bekræft gendannelse</h3>
              <div className="backup-preview">
                <p>
                  <strong>Backup fra:</strong> {formatDate(selectedBackup.date)}
                </p>
                <p>
                  <strong>År:</strong> {preview.years.join(', ')}
                </p>
                <p>
                  <strong>Udgifter:</strong> {preview.expenseCount} stk
                </p>
                <p>
                  <strong>Perioder:</strong> {preview.periodCount} stk
                </p>
              </div>
              <p className="backup-warning">
                ⚠️ Dette vil erstatte alle dine nuværende data med backup-data
              </p>
              <div className="backup-confirmation-actions">
                <button
                  className="btn btn-cancel"
                  onClick={handleCancelRestore}
                >
                  Annuller
                </button>
                <button
                  className="btn btn-confirm"
                  onClick={handleConfirmRestore}
                >
                  Gendan backup
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Restoring Overlay */}
      {restoring && (
        <div className="backup-restoring-overlay">
          <div className="backup-restoring-message">
            <div className="spinner"></div>
            <p>🔄 Gendanner backup...</p>
            <p>Vent venligst, dette kan tage et øjeblik</p>
          </div>
        </div>
      )}
    </>
  );
};
