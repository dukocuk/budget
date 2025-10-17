/**
 * Settings section component with cloud sync status
 */

import { useRef, useState, useEffect } from 'react'
import { useSyncContext } from '../hooks/useSyncContext'
import { PaymentModeConfirmation } from './PaymentModeConfirmation'
import './Settings.css'

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
  onImport
}) => {
  // Get sync status from isolated context (won't trigger parent re-renders)
  const { syncStatus, lastSyncTime, syncError, isOnline } = useSyncContext()
  const fileInputRef = useRef(null)

  // Local state for input fields to prevent sync spam
  const [localMonthlyPayment, setLocalMonthlyPayment] = useState(monthlyPayment)
  const [localPreviousBalance, setLocalPreviousBalance] = useState(previousBalance)
  const [localMonthlyPayments, setLocalMonthlyPayments] = useState(
    monthlyPayments || Array(12).fill(monthlyPayment)
  )
  const [localPaymentMode, setLocalPaymentMode] = useState(
    useVariablePayments ? 'variable' : 'fixed'
  )
  const [showModeConfirmation, setShowModeConfirmation] = useState(false)
  const [pendingMode, setPendingMode] = useState(null)

  // Sync local state when props change (e.g., loaded from cloud)
  useEffect(() => {
    setLocalMonthlyPayment(monthlyPayment)
  }, [monthlyPayment])

  useEffect(() => {
    setLocalPreviousBalance(previousBalance)
  }, [previousBalance])

  useEffect(() => {
    setLocalMonthlyPayments(monthlyPayments || Array(12).fill(monthlyPayment))
  }, [monthlyPayments, monthlyPayment])

  useEffect(() => {
    setLocalPaymentMode(useVariablePayments ? 'variable' : 'fixed')
  }, [useVariablePayments])

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (file && onImport) {
      onImport(file)
      // Reset input so same file can be selected again
      event.target.value = ''
    }
  }

  // Handler for payment mode toggle
  const handlePaymentModeChange = (mode) => {
    // Skip confirmation if already in the selected mode
    if ((mode === 'fixed' && localPaymentMode === 'fixed') ||
        (mode === 'variable' && localPaymentMode === 'variable')) {
      return
    }

    // Show confirmation modal
    setPendingMode(mode)
    setShowModeConfirmation(true)
  }

  // Handler for confirming mode change
  const handleConfirmModeChange = () => {
    setShowModeConfirmation(false)
    const mode = pendingMode

    setLocalPaymentMode(mode)
    if (mode === 'fixed') {
      // Switch to fixed: clear variable payments
      if (onMonthlyPaymentsChange) {
        onMonthlyPaymentsChange(null)
      }
      if (onTogglePaymentMode) {
        onTogglePaymentMode(false)
      }
    } else {
      // Switch to variable: initialize array with current fixed amount
      const initialArray = Array(12).fill(localMonthlyPayment)
      setLocalMonthlyPayments(initialArray)
      if (onMonthlyPaymentsChange) {
        onMonthlyPaymentsChange(initialArray)
      }
      if (onTogglePaymentMode) {
        onTogglePaymentMode(true)
      }
    }
    setPendingMode(null)
  }

  // Handler for cancelling mode change
  const handleCancelModeChange = () => {
    setShowModeConfirmation(false)
    setPendingMode(null)
  }

  // Handler for updating specific month
  const handleMonthPaymentChange = (monthIndex, value) => {
    const newPayments = [...localMonthlyPayments]
    newPayments[monthIndex] = value === '' ? 0 : parseFloat(value) || 0
    setLocalMonthlyPayments(newPayments)
  }

  // Handler for blur (save to database)
  const handleMonthPaymentBlur = () => {
    if (onMonthlyPaymentsChange) {
      onMonthlyPaymentsChange(localMonthlyPayments)
    }
  }

  // Helper function to get sync status display
  const getSyncStatusDisplay = () => {
    if (!isOnline) {
      return { icon: '📴', text: 'Offline', className: 'sync-offline' }
    }

    switch (syncStatus) {
      case 'syncing':
        return { icon: '🔄', text: 'Synkroniserer...', className: 'sync-syncing' }
      case 'synced':
        return { icon: '✅', text: 'Synkroniseret', className: 'sync-synced' }
      case 'error':
        return { icon: '❌', text: 'Synkroniseringsfejl', className: 'sync-error' }
      default:
        return { icon: '⏸️', text: 'Klar', className: 'sync-idle' }
    }
  }

  const statusDisplay = getSyncStatusDisplay()

  return (
    <>
      <PaymentModeConfirmation
        isOpen={showModeConfirmation}
        mode={pendingMode}
        onConfirm={handleConfirmModeChange}
        onCancel={handleCancelModeChange}
      />
      <section className="settings-section">
        <h2>⚙️ Indstillinger</h2>

      {/* Sync Status */}
      <div className="sync-status-container">
        <h3>☁️ Sky-synkronisering</h3>
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
          💡 Alle ændringer gemmes automatisk til skyen og synkroniseres på tværs af dine enheder.
        </p>
      </div>

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
                  type="number"
                  id="monthlyPayment"
                  value={localMonthlyPayment}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === '') {
                      setLocalMonthlyPayment(0)
                    } else {
                      const parsed = parseFloat(value)
                      if (!isNaN(parsed)) {
                        setLocalMonthlyPayment(parsed)
                      }
                    }
                  }}
                  onBlur={() => {
                    if (localMonthlyPayment !== monthlyPayment) {
                      onMonthlyPaymentChange(localMonthlyPayment)
                    }
                  }}
                  placeholder="5700"
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
                {['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'].map((month, index) => (
                  <div key={month} className="month-payment-item">
                    <label htmlFor={`month-${index}`}>{month}</label>
                    <input
                      type="number"
                      id={`month-${index}`}
                      value={localMonthlyPayments[index]}
                      onChange={(e) => handleMonthPaymentChange(index, e.target.value)}
                      onBlur={handleMonthPaymentBlur}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="settings-item">
          <label htmlFor="previousBalance">
            Overført fra sidste år:
          </label>
          <input
            type="number"
            id="previousBalance"
            value={localPreviousBalance}
            onChange={(e) => {
              const value = e.target.value
              // Update local state immediately for responsive UI
              if (value === '') {
                setLocalPreviousBalance(0)
              } else {
                const parsed = parseFloat(value)
                if (!isNaN(parsed)) {
                  setLocalPreviousBalance(parsed)
                }
              }
            }}
            onBlur={() => {
              // Only trigger parent update (and sync) on blur
              if (localPreviousBalance !== previousBalance) {
                onPreviousBalanceChange(localPreviousBalance)
              }
            }}
          />
        </div>
      </div>

      <div className="settings-actions">
        <h3>Data håndtering</h3>
        <div className="settings-buttons">
          <button className="btn btn-success" onClick={onExport}>
            <span className="btn-icon">📊</span>
            <span>Eksporter CSV</span>
          </button>
          <button className="btn btn-info" onClick={handleImportClick}>
            <span className="btn-icon">📥</span>
            <span>Importer CSV</span>
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
          💡 Dine data gemmes automatisk til skyen. CSV-eksport er kun til backup.
        </p>
      </div>
    </section>
    </>
  )
}
