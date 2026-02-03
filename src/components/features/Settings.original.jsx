/**
 * Settings section component with cloud sync status
 */

import { useRef, useState, useEffect } from 'react';
import { useSyncContext } from '../../hooks/useSyncContext';
import { useAlertContext } from '../../hooks/useAlertContext';
import { parseDanishNumber } from '../../utils/localeHelpers';
import { PaymentModeConfirmation } from '../modals/PaymentModeConfirmation';
import { BackupManagerModal } from '../modals/BackupManagerModal';
import './Settings.css';

export const Settings = ({
  monthlyPayment,
  previousBalance,
  monthlyPayments, // NEW: Array of 12 values or null
  useVariablePayments, // NEW: Boolean toggle
  onMonthlyPaymentChange,
  onPreviousBalanceChange,
  onMonthlyPaymentsChange, // NEW: Handler for array updates
  onTogglePaymentMode, // NEW: Toggle fixed/variable
  onExport,
  onImport,
  // Year management props (optional for backwards compatibility)
  activePeriod,
  onArchivePeriod,
  onUnarchivePeriod, // NEW: Unarchive functionality
  // Template management
  onOpenTemplateManager,
}) => {
  // Get sync status and backup methods from isolated context
  const {
    syncStatus,
    lastSyncTime,
    syncError,
    isOnline,
    createManualBackup,
    listAvailableBackups,
    getBackupPreview,
    restoreFromBackup,
  } = useSyncContext();
  const { showAlert } = useAlertContext();
  const fileInputRef = useRef(null);

  // Backup modal state
  const [showBackupManager, setShowBackupManager] = useState(false);

  // Local state for input fields to prevent sync spam
  const [localMonthlyPayment, setLocalMonthlyPayment] =
    useState(monthlyPayment);
  const [localPreviousBalance, setLocalPreviousBalance] =
    useState(previousBalance);
  const [localMonthlyPayments, setLocalMonthlyPayments] = useState(
    monthlyPayments || Array(12).fill(monthlyPayment)
  );
  const [localPaymentMode, setLocalPaymentMode] = useState(
    useVariablePayments ? 'variable' : 'fixed'
  );
  const [showModeConfirmation, setShowModeConfirmation] = useState(false);
  const [pendingMode, setPendingMode] = useState(null);

  // Refs to check actual DOM focus state (prevents polling overwrites)
  const monthlyPaymentRef = useRef(null);
  const previousBalanceRef = useRef(null);
  const monthlyPaymentsRefs = useRef([]);

  // Sync local state when props change (e.g., loaded from cloud)
  useEffect(() => {
    // Don't overwrite if this input is currently focused
    if (document.activeElement === monthlyPaymentRef.current) {
      return;
    }
    setLocalMonthlyPayment(monthlyPayment);
  }, [monthlyPayment]);

  useEffect(() => {
    // Don't overwrite if this input is currently focused
    if (document.activeElement === previousBalanceRef.current) {
      return;
    }
    setLocalPreviousBalance(previousBalance);
  }, [previousBalance]);

  useEffect(() => {
    if (monthlyPayments) {
      // Don't overwrite if ANY month input is currently focused
      const isEditingAnyMonth = monthlyPaymentsRefs.current.some(
        ref => document.activeElement === ref
      );
      if (isEditingAnyMonth) {
        return;
      }

      // Variable mode: use the monthly payments array
      // Only update if values actually changed (prevent race condition from database reload)
      const valuesChanged =
        JSON.stringify(monthlyPayments) !==
        JSON.stringify(localMonthlyPayments);
      if (valuesChanged) {
        setLocalMonthlyPayments(monthlyPayments);
      }
    } else if (localPaymentMode === 'fixed' && !monthlyPayments) {
      // Fixed mode: initialize with fixed amount
      setLocalMonthlyPayments(Array(12).fill(monthlyPayment));
    }
    // Note: valuesChanged check prevents infinite loop when localMonthlyPayments is included
  }, [monthlyPayments, monthlyPayment, localPaymentMode, localMonthlyPayments]);

  useEffect(() => {
    setLocalPaymentMode(useVariablePayments ? 'variable' : 'fixed');
  }, [useVariablePayments]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = event => {
    const file = event.target.files?.[0];
    if (file && onImport) {
      onImport(file);
      // Reset input so same file can be selected again
      event.target.value = '';
    }
  };

  // Handler for creating manual backup
  const handleCreateBackup = async () => {
    try {
      const result = await createManualBackup();
      if (result.success) {
        showAlert('Backup oprettet!', 'success');
      } else {
        showAlert(`Backup fejl: ${result.error}`, 'error');
      }
    } catch (error) {
      showAlert(`Backup fejl: ${error.message}`, 'error');
    }
  };

  // Handler for opening backup manager modal
  const handleOpenBackupManager = () => {
    setShowBackupManager(true);
  };

  // Handler for payment mode toggle
  const handlePaymentModeChange = mode => {
    // Skip confirmation if already in the selected mode
    if (
      (mode === 'fixed' && localPaymentMode === 'fixed') ||
      (mode === 'variable' && localPaymentMode === 'variable')
    ) {
      return;
    }

    // Show confirmation modal
    setPendingMode(mode);
    setShowModeConfirmation(true);
  };

  // Handler for confirming mode change
  const handleConfirmModeChange = () => {
    setShowModeConfirmation(false);
    const mode = pendingMode;

    setLocalPaymentMode(mode);
    if (mode === 'fixed') {
      // Switch to fixed: clear variable payments
      if (onMonthlyPaymentsChange) {
        onMonthlyPaymentsChange(null);
      }
      if (onTogglePaymentMode) {
        onTogglePaymentMode(false);
      }
    } else {
      // Switch to variable: initialize array with current fixed amount
      const initialArray = Array(12).fill(localMonthlyPayment);
      setLocalMonthlyPayments(initialArray);
      if (onMonthlyPaymentsChange) {
        onMonthlyPaymentsChange(initialArray);
      }
      if (onTogglePaymentMode) {
        onTogglePaymentMode(true);
      }
    }
    setPendingMode(null);
  };

  // Handler for cancelling mode change
  const handleCancelModeChange = () => {
    setShowModeConfirmation(false);
    setPendingMode(null);
  };

  // Handler for updating specific month (supports Danish locale)
  const handleMonthPaymentChange = (monthIndex, value) => {
    const newPayments = [...localMonthlyPayments];
    newPayments[monthIndex] = value === '' ? 0 : parseDanishNumber(value);
    setLocalMonthlyPayments(newPayments);
  };

  // Handler for blur (save to database)
  const handleMonthPaymentBlur = () => {
    if (onMonthlyPaymentsChange) {
      onMonthlyPaymentsChange(localMonthlyPayments);
    }
  };

  // Helper function to get sync status display
  const getSyncStatusDisplay = () => {
    if (!isOnline) {
      return { icon: '📴', text: 'Offline', className: 'sync-offline' };
    }

    switch (syncStatus) {
      case 'syncing':
        return {
          icon: '🔄',
          text: 'Synkroniserer...',
          className: 'sync-syncing',
        };
      case 'synced':
        return { icon: '✅', text: 'Synkroniseret', className: 'sync-synced' };
      case 'error':
        return {
          icon: '❌',
          text: 'Synkroniseringsfejl',
          className: 'sync-error',
        };
      default:
        return { icon: '⏸️', text: 'Klar', className: 'sync-idle' };
    }
  };

  const statusDisplay = getSyncStatusDisplay();

  return (
    <>
      <PaymentModeConfirmation
        isOpen={showModeConfirmation}
        mode={pendingMode}
        onConfirm={handleConfirmModeChange}
        onCancel={handleCancelModeChange}
      />
      <BackupManagerModal
        isOpen={showBackupManager}
        onClose={() => setShowBackupManager(false)}
        listBackups={listAvailableBackups}
        getPreview={getBackupPreview}
        restoreBackup={restoreFromBackup}
      />
      <div className="settings-container">
        {/* Budget Settings Section - Per Year */}
        <section className="settings-section budget-settings-section">
          <h3 className="settings-section-header">
            📊 Budgetindstillinger
            {activePeriod && (
              <span className="year-badge">{activePeriod.year}</span>
            )}
          </h3>

          {/* Year Management */}
          {activePeriod && (
            <div className="year-management-container">
              <div className="year-info">
                <div className="year-info-item">
                  <span className="year-info-label">Status:</span>
                  <span className={`year-status-badge ${activePeriod.status}`}>
                    {activePeriod.status === 'active'
                      ? '✅ Aktiv'
                      : '📦 Arkiveret'}
                  </span>
                </div>
              </div>
              {activePeriod.status === 'active' && onArchivePeriod && (
                <div className="year-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => onArchivePeriod(activePeriod.id)}
                    title="Arkiver dette budgetår"
                  >
                    <span className="btn-icon">📦</span>
                    <span>Arkiver år {activePeriod.year}</span>
                  </button>
                  <p className="year-note">
                    💡 Arkivering markerer året som historisk data. Du kan
                    stadig se det, men ikke redigere.
                  </p>
                </div>
              )}
              {activePeriod.status === 'archived' && onUnarchivePeriod && (
                <div className="year-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => onUnarchivePeriod(activePeriod.id)}
                    title="Genaktiver dette budgetår for redigering"
                  >
                    <span className="btn-icon">🔓</span>
                    <span>Genaktiver år {activePeriod.year}</span>
                  </button>
                  <p className="year-note">
                    💡 Genaktivering gør året redigerbart igen. Du kan arkivere
                    det senere hvis nødvendigt.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="settings-grid">
            <div className="settings-item settings-payment-mode">
              <h3>💰 Månedlige indbetalinger</h3>

              <div className="payment-mode-selector">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="paymentMode"
                    value="fixed"
                    checked={localPaymentMode === 'fixed'}
                    onChange={() => handlePaymentModeChange('fixed')}
                  />
                  <span className="radio-label">Fast beløb for hele året</span>
                </label>

                {localPaymentMode === 'fixed' && (
                  <div className="fixed-payment-input">
                    <input
                      ref={monthlyPaymentRef}
                      type="text"
                      id="monthlyPayment"
                      value={localMonthlyPayment}
                      onChange={e => {
                        const value = e.target.value;
                        if (value === '') {
                          setLocalMonthlyPayment(0);
                        } else {
                          const parsed = parseDanishNumber(value);
                          setLocalMonthlyPayment(parsed);
                        }
                      }}
                      onBlur={() => {
                        if (localMonthlyPayment !== monthlyPayment) {
                          onMonthlyPaymentChange(localMonthlyPayment);
                        }
                      }}
                      placeholder="f.eks. 5.700,00"
                      inputMode="decimal"
                      pattern="[0-9.,]+"
                    />
                    <span className="input-suffix">kr./måned</span>
                  </div>
                )}

                <label className="radio-option">
                  <input
                    type="radio"
                    name="paymentMode"
                    value="variable"
                    checked={localPaymentMode === 'variable'}
                    onChange={() => handlePaymentModeChange('variable')}
                  />
                  <span className="radio-label">Variabel beløb per måned</span>
                </label>

                {localPaymentMode === 'variable' && (
                  <div className="monthly-payments-grid">
                    {[
                      'Jan',
                      'Feb',
                      'Mar',
                      'Apr',
                      'Maj',
                      'Jun',
                      'Jul',
                      'Aug',
                      'Sep',
                      'Okt',
                      'Nov',
                      'Dec',
                    ].map((month, index) => (
                      <div key={month} className="month-payment-item">
                        <label htmlFor={`month-${index}`}>{month}</label>
                        <input
                          ref={el => (monthlyPaymentsRefs.current[index] = el)}
                          type="text"
                          id={`month-${index}`}
                          value={localMonthlyPayments[index]}
                          onChange={e =>
                            handleMonthPaymentChange(index, e.target.value)
                          }
                          onBlur={handleMonthPaymentBlur}
                          placeholder="0,00"
                          inputMode="decimal"
                          pattern="[0-9.,]+"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="settings-item">
              <label htmlFor="previousBalance">Overført fra sidste år:</label>
              <input
                ref={previousBalanceRef}
                type="text"
                id="previousBalance"
                value={localPreviousBalance}
                onChange={e => {
                  const value = e.target.value;
                  // Update local state immediately for responsive UI (supports Danish locale)
                  if (value === '') {
                    setLocalPreviousBalance(0);
                  } else {
                    const parsed = parseDanishNumber(value);
                    setLocalPreviousBalance(parsed);
                  }
                }}
                placeholder="f.eks. 4.831,00"
                inputMode="decimal"
                pattern="[0-9.,]+"
                onBlur={() => {
                  // Only trigger parent update (and sync) on blur
                  if (localPreviousBalance !== previousBalance) {
                    onPreviousBalanceChange(localPreviousBalance);
                  }
                }}
              />
            </div>
          </div>
        </section>

        {/* App Settings Section - Global */}
        <section className="settings-section app-settings-section">
          <h3 className="settings-section-header">⚙️ App-indstillinger</h3>

          {/* Sync Status */}
          <div className="sync-status-container">
            <h4>☁️ Sky-synkronisering</h4>
            <div className={`sync-status ${statusDisplay.className}`}>
              <span className="sync-icon">{statusDisplay.icon}</span>
              <span className="sync-text">{statusDisplay.text}</span>
            </div>
            {lastSyncTime && (
              <p className="sync-time">
                Sidst synkroniseret: {lastSyncTime.toLocaleString('da-DK')}
              </p>
            )}
            {syncError && (
              <div className="sync-error-message">
                <p>⚠️ {syncError}</p>
              </div>
            )}
            <p className="sync-info">
              💡 Alle ændringer gemmes automatisk til skyen og synkroniseres på
              tværs af dine enheder.
            </p>
          </div>

          {/* Template Management Section */}
          <div className="template-management-container">
            <h4>📋 Skabeloner</h4>
            <p className="template-description">
              Gem dit nuværende budget som en genbrugelig skabelon for hurtigere
              oprettelse af fremtidige år.
            </p>
            <div className="template-actions">
              <button
                className="btn btn-info"
                onClick={onOpenTemplateManager}
                title="Åbn skabelonstyring"
              >
                <span className="btn-icon">📋</span>
                <span>Administrer skabeloner</span>
              </button>
              <p className="template-note">
                💡 Skabeloner lader dig hurtigt oprette nye budgetår med
                forudkonfigurerede udgifter.
              </p>
            </div>
          </div>

          <div className="settings-actions">
            <h4>📁 Data håndtering</h4>
            <div className="settings-buttons">
              <button
                className="btn btn-success"
                onClick={onExport}
                title="Eksporter dine udgifter til CSV-fil til brug i Excel eller andre programmer"
              >
                <span className="btn-icon">📊</span>
                <span>Eksporter CSV</span>
              </button>
              <button
                className="btn btn-info"
                onClick={handleImportClick}
                title="Importer udgifter fra en CSV-fil til den aktuelle budgetperiode"
              >
                <span className="btn-icon">📥</span>
                <span>Importer CSV</span>
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateBackup}
                disabled={!isOnline}
                title={
                  !isOnline
                    ? 'Kræver internetforbindelse'
                    : 'Opret et komplet backup af alle dine data med versionering'
                }
              >
                <span className="btn-icon">📦</span>
                <span>Opret backup</span>
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleOpenBackupManager}
                disabled={!isOnline}
                title={
                  !isOnline
                    ? 'Kræver internetforbindelse'
                    : 'Gendan alle dine data fra et tidligere backup med versionsoversigt'
                }
              >
                <span className="btn-icon">📋</span>
                <span>Gendan fra backup</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                aria-label="Vælg CSV fil til import"
              />
            </div>
            <p className="settings-note">
              💡 <strong>Automatisk:</strong> Dine data gemmes automatisk til
              skyen.
              <br />
              📊 <strong>CSV:</strong> Eksporter/importer til Excel og andre
              programmer.
              <br />
              📦 <strong>Backup:</strong> Versionerede snapshots med komplet
              gendannelse.
            </p>
          </div>
        </section>
      </div>
    </>
  );
};
