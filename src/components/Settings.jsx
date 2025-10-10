/**
 * Settings section component
 */

import './Settings.css'

export const Settings = ({
  monthlyPayment,
  previousBalance,
  onMonthlyPaymentChange,
  onPreviousBalanceChange,
  onSave,
  onLoad,
  onExport
}) => {
  return (
    <section className="settings-section">
      <h2>⚙️ Indstillinger</h2>
      <div className="settings-grid">
        <div className="settings-item">
          <label htmlFor="monthlyPayment">
            Månedlig indbetaling til budgetkonto:
          </label>
          <input
            type="number"
            id="monthlyPayment"
            value={monthlyPayment}
            onChange={(e) => onMonthlyPaymentChange(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="settings-item">
          <label htmlFor="previousBalance">
            Overført fra sidste år:
          </label>
          <input
            type="number"
            id="previousBalance"
            value={previousBalance}
            onChange={(e) => onPreviousBalanceChange(parseFloat(e.target.value) || 0)}
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
          <button className="btn btn-secondary" onClick={onSave}>
            <span className="btn-icon">💾</span>
            <span>Gem lokalt</span>
          </button>
          <button className="btn btn-secondary" onClick={onLoad}>
            <span className="btn-icon">📁</span>
            <span>Hent data</span>
          </button>
        </div>
      </div>
    </section>
  )
}
