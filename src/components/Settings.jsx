/**
 * Settings section component with cloud sync status
 */

import { useRef, useState, useEffect } from 'react'
import './Settings.css'

export const Settings = ({
  monthlyPayment,
  previousBalance,
  onMonthlyPaymentChange,
  onPreviousBalanceChange,
  onExport,
  onImport,
  theme,
  onToggleTheme,
  syncStatus,
  lastSyncTime,
  syncError,
  isOnline
}) => {
  const fileInputRef = useRef(null)

  // Local state for input fields to prevent sync spam
  const [localMonthlyPayment, setLocalMonthlyPayment] = useState(monthlyPayment)
  const [localPreviousBalance, setLocalPreviousBalance] = useState(previousBalance)

  // Sync local state when props change (e.g., loaded from cloud)
  useEffect(() => {
    setLocalMonthlyPayment(monthlyPayment)
  }, [monthlyPayment])

  useEffect(() => {
    setLocalPreviousBalance(previousBalance)
  }, [previousBalance])

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
        <div className="settings-item">
          <label htmlFor="monthlyPayment">
            Månedlig indbetaling til budgetkonto:
          </label>
          <input
            type="number"
            id="monthlyPayment"
            value={localMonthlyPayment}
            onChange={(e) => {
              const value = e.target.value
              // Update local state immediately for responsive UI
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
              // Only trigger parent update (and sync) on blur
              if (localMonthlyPayment !== monthlyPayment) {
                onMonthlyPaymentChange(localMonthlyPayment)
              }
            }}
          />
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
        <h3>Udseende</h3>
        <div className="theme-toggle-container">
          <button
            className="btn btn-theme-toggle"
            onClick={onToggleTheme}
            aria-label={`Skift til ${theme === 'light' ? 'mørk' : 'lys'} tilstand`}
            title={`Skift til ${theme === 'light' ? 'mørk' : 'lys'} tilstand`}
          >
            <span className="theme-icon">{theme === 'light' ? '🌙' : '☀️'}</span>
            <span className="theme-label">
              {theme === 'light' ? 'Mørk tilstand' : 'Lys tilstand'}
            </span>
          </button>
          <p className="theme-description">
            {theme === 'light'
              ? 'Skift til mørk tilstand for at reducere øjentræt om aftenen'
              : 'Skift til lys tilstand for bedre læsbarhed i dagslys'}
          </p>
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
  )
}
