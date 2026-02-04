/**
 * Settings Component (Tab-Based Design)
 *
 * Redesigned with clean 2-tab navigation:
 * - Budget: Year badge, monthly payments, variable mode, previous balance, year status, sync status
 * - Data: Export/Import, Backup/Restore, Templates
 *
 * Key Improvements:
 * - Tab-based navigation instead of card-heavy scrolling
 * - Prominent year context badge at top of Budget tab
 * - Sync information integrated into Budget tab (no separate Sync tab)
 * - Toggle switch for variable payments (replaces radio buttons)
 * - Clean form groups with subtle styling
 * - Mobile-friendly horizontal tabs
 * - Improved accessibility
 */

import { useRef, useState, useEffect } from 'react';
import { useSyncContext } from '../../hooks/useSyncContext';
import { useAlertContext } from '../../hooks/useAlertContext';
import { parseDanishNumber } from '../../utils/localeHelpers';
import { PaymentModeConfirmation } from '../modals/PaymentModeConfirmation';
import { BackupManagerModal } from '../modals/BackupManagerModal';
import { StatusBadge } from '../common/StatusBadge';
import './Settings.css';

// Tab configuration
const TABS = [
  { id: 'budget', label: 'Budget', icon: '💰' },
  { id: 'data', label: 'Data', icon: '📁' },
];

export const Settings = ({
  monthlyPayment,
  previousBalance,
  monthlyPayments,
  useVariablePayments,
  onMonthlyPaymentChange,
  onPreviousBalanceChange,
  onMonthlyPaymentsChange,
  onTogglePaymentMode,
  onExport,
  onImport,
  activePeriod,
  onArchivePeriod,
  onUnarchivePeriod,
  onOpenTemplateManager,
}) => {
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

  // Tab state
  const [activeTab, setActiveTab] = useState('budget');

  // Modal states
  const [showBackupManager, setShowBackupManager] = useState(false);
  const [showModeConfirmation, setShowModeConfirmation] = useState(false);
  const [pendingMode, setPendingMode] = useState(null);

  // Local state for input fields
  const [localMonthlyPayment, setLocalMonthlyPayment] =
    useState(monthlyPayment);
  const [localPreviousBalance, setLocalPreviousBalance] =
    useState(previousBalance);
  const [localMonthlyPayments, setLocalMonthlyPayments] = useState(
    monthlyPayments || Array(12).fill(monthlyPayment)
  );

  // Refs for focus management
  const monthlyPaymentRef = useRef(null);
  const previousBalanceRef = useRef(null);
  const monthlyPaymentsRefs = useRef([]);

  // Sync local state when props change
  useEffect(() => {
    if (document.activeElement === monthlyPaymentRef.current) return;
    setLocalMonthlyPayment(monthlyPayment);
  }, [monthlyPayment]);

  useEffect(() => {
    if (document.activeElement === previousBalanceRef.current) return;
    setLocalPreviousBalance(previousBalance);
  }, [previousBalance]);

  useEffect(() => {
    if (monthlyPayments) {
      const isEditingAnyMonth = monthlyPaymentsRefs.current.some(
        ref => document.activeElement === ref
      );
      if (isEditingAnyMonth) return;

      const valuesChanged =
        JSON.stringify(monthlyPayments) !==
        JSON.stringify(localMonthlyPayments);
      if (valuesChanged) {
        setLocalMonthlyPayments(monthlyPayments);
      }
    } else if (!useVariablePayments && !monthlyPayments) {
      setLocalMonthlyPayments(Array(12).fill(monthlyPayment));
    }
  }, [
    monthlyPayments,
    monthlyPayment,
    useVariablePayments,
    localMonthlyPayments,
  ]);

  // Handlers
  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = event => {
    const file = event.target.files?.[0];
    if (file && onImport) {
      onImport(file);
      event.target.value = '';
    }
  };

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

  const handleToggleVariablePayments = () => {
    const newMode = useVariablePayments ? 'fixed' : 'variable';
    setPendingMode(newMode);
    setShowModeConfirmation(true);
  };

  const handleConfirmModeChange = () => {
    setShowModeConfirmation(false);
    const mode = pendingMode;

    if (mode === 'fixed') {
      if (onMonthlyPaymentsChange) onMonthlyPaymentsChange(null);
      if (onTogglePaymentMode) onTogglePaymentMode(false);
    } else {
      const initialArray = Array(12).fill(localMonthlyPayment);
      setLocalMonthlyPayments(initialArray);
      if (onMonthlyPaymentsChange) onMonthlyPaymentsChange(initialArray);
      if (onTogglePaymentMode) onTogglePaymentMode(true);
    }
    setPendingMode(null);
  };

  const handleMonthPaymentChange = (monthIndex, value) => {
    const newPayments = [...localMonthlyPayments];
    newPayments[monthIndex] = value === '' ? 0 : parseDanishNumber(value);
    setLocalMonthlyPayments(newPayments);
  };

  const handleMonthPaymentBlur = () => {
    if (onMonthlyPaymentsChange) {
      onMonthlyPaymentsChange(localMonthlyPayments);
    }
  };

  // Get sync status for badge
  const getSyncStatus = () => {
    if (!isOnline) return 'offline';
    return syncStatus || 'idle';
  };

  // Tab content renderers
  const renderBudgetTab = () => (
    <div className="settings-tab-content">
      {/* Year Context Badge */}
      {activePeriod && (
        <div className="year-context-badge">
          <span className="year-badge-icon">📅</span>
          <span className="year-badge-text">
            Budget för {activePeriod.year}
          </span>
          <span className={`year-badge-status ${activePeriod.status}`}>
            {activePeriod.status === 'active' ? '✅ Aktiv' : '📦 Arkiveret'}
          </span>
        </div>
      )}

      {/* Monthly Payment */}
      <div className="settings-group">
        <label htmlFor="monthlyPayment" className="settings-label">
          Månedlig indbetaling
        </label>
        {!useVariablePayments && (
          <div className="settings-input-row">
            <input
              ref={monthlyPaymentRef}
              type="text"
              id="monthlyPayment"
              className="settings-input"
              value={localMonthlyPayment}
              onChange={e => {
                const value = e.target.value;
                setLocalMonthlyPayment(
                  value === '' ? 0 : parseDanishNumber(value)
                );
              }}
              onBlur={() => {
                if (localMonthlyPayment !== monthlyPayment) {
                  onMonthlyPaymentChange(localMonthlyPayment);
                }
              }}
              placeholder="f.eks. 5.700,00"
              inputMode="decimal"
              pattern="[0-9.,]+"
              aria-label="Fast månedligt beløb"
            />
            <span className="settings-input-suffix">kr./måned</span>
          </div>
        )}

        {/* Variable toggle */}
        <div className="settings-toggle-row">
          <span className="settings-toggle-label">
            Variabel beløb per måned
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={useVariablePayments}
            className={`settings-toggle ${useVariablePayments ? 'active' : ''}`}
            onClick={handleToggleVariablePayments}
            aria-label="Skift mellem fast og variabel indbetaling"
          >
            <span className="settings-toggle-track">
              <span className="settings-toggle-thumb" />
            </span>
          </button>
        </div>

        {/* Monthly payments grid */}
        {useVariablePayments && (
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
                  aria-label={`${month} indbetaling`}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Previous Balance */}
      <div className="settings-group">
        <label htmlFor="previousBalance" className="settings-label">
          Overført fra sidste år
        </label>
        <div className="settings-input-row">
          <input
            ref={previousBalanceRef}
            type="text"
            id="previousBalance"
            className="settings-input"
            value={localPreviousBalance}
            onChange={e => {
              const value = e.target.value;
              setLocalPreviousBalance(
                value === '' ? 0 : parseDanishNumber(value)
              );
            }}
            placeholder="f.eks. 4.831,00"
            inputMode="decimal"
            pattern="[0-9.,]+"
            onBlur={() => {
              if (localPreviousBalance !== previousBalance) {
                onPreviousBalanceChange(localPreviousBalance);
              }
            }}
            aria-label="Overført balance fra sidste år"
          />
          <span className="settings-input-suffix">kr.</span>
        </div>
      </div>

      {/* Year Status */}
      {activePeriod && (
        <div className="settings-group">
          <label className="settings-label">År-status</label>
          <div className="year-status-row">
            <span className={`year-status-badge ${activePeriod.status}`}>
              {activePeriod.status === 'active' ? '✅ Aktiv' : '📦 Arkiveret'}
            </span>
            <span className="year-label">{activePeriod.year}</span>
          </div>
          {activePeriod.status === 'active' && onArchivePeriod && (
            <button
              className="settings-btn settings-btn-secondary"
              onClick={() => onArchivePeriod(activePeriod.id)}
              title="Arkiver dette budgetår"
            >
              <span className="btn-icon">📦</span>
              Arkiver år
            </button>
          )}
          {activePeriod.status === 'archived' && onUnarchivePeriod && (
            <button
              className="settings-btn settings-btn-primary"
              onClick={() => onUnarchivePeriod(activePeriod.id)}
              title="Genaktiver dette budgetår"
            >
              <span className="btn-icon">🔓</span>
              Genaktiver år
            </button>
          )}
        </div>
      )}

      {/* Sync Status Section */}
      <div className="settings-group">
        <label className="settings-label">Synkronisering</label>
        <StatusBadge status={getSyncStatus()} animated={true} />

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
          Alle ændringer gemmes automatisk til skyen og synkroniseres på tværs
          af dine enheder.
        </p>
      </div>
    </div>
  );

  const renderDataTab = () => (
    <div className="settings-tab-content">
      {/* CSV Operations */}
      <div className="settings-group">
        <label className="settings-label">CSV</label>
        <div className="settings-btn-group">
          <button
            className="settings-btn settings-btn-success"
            onClick={onExport}
            title="Eksporter dine udgifter til CSV-fil"
          >
            <span className="btn-icon">📊</span>
            Eksporter
          </button>
          <button
            className="settings-btn settings-btn-info"
            onClick={handleImportClick}
            title="Importer udgifter fra CSV-fil"
          >
            <span className="btn-icon">📥</span>
            Importer
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          aria-label="Vælg CSV fil til import"
        />
      </div>

      {/* Backup Operations */}
      <div className="settings-group">
        <label className="settings-label">Backup</label>
        <div className="settings-btn-group">
          <button
            className="settings-btn settings-btn-primary"
            onClick={handleCreateBackup}
            disabled={!isOnline}
            title={
              !isOnline
                ? 'Kræver internetforbindelse'
                : 'Opret et komplet backup'
            }
          >
            <span className="btn-icon">📦</span>
            Opret backup
          </button>
          <button
            className="settings-btn settings-btn-secondary"
            onClick={() => setShowBackupManager(true)}
            disabled={!isOnline}
            title={
              !isOnline
                ? 'Kræver internetforbindelse'
                : 'Gendan fra tidligere backup'
            }
          >
            <span className="btn-icon">📋</span>
            Gendan
          </button>
        </div>
      </div>

      {/* Templates */}
      <div className="settings-group">
        <label className="settings-label">Skabeloner</label>
        <button
          className="settings-btn settings-btn-info"
          onClick={onOpenTemplateManager}
          title="Åbn skabelonstyring"
        >
          <span className="btn-icon">📋</span>
          Administrer skabeloner
        </button>
        <p className="settings-note">
          Gem dit nuværende budget som en genbrugelig skabelon.
        </p>
      </div>
    </div>
  );

  return (
    <>
      <PaymentModeConfirmation
        isOpen={showModeConfirmation}
        mode={pendingMode}
        onConfirm={handleConfirmModeChange}
        onCancel={() => {
          setShowModeConfirmation(false);
          setPendingMode(null);
        }}
      />
      <BackupManagerModal
        isOpen={showBackupManager}
        onClose={() => setShowBackupManager(false)}
        listBackups={listAvailableBackups}
        getPreview={getBackupPreview}
        restoreBackup={restoreFromBackup}
      />

      <div className="settings-container">
        {/* Tab Navigation */}
        <nav
          className="settings-tabs"
          role="tablist"
          aria-label="Indstillinger sektioner"
        >
          {TABS.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="settings-tab-icon">{tab.icon}</span>
              <span className="settings-tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Tab Panels */}
        <div
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          className="settings-panel"
        >
          {activeTab === 'budget' && renderBudgetTab()}
          {activeTab === 'data' && renderDataTab()}
        </div>
      </div>
    </>
  );
};
