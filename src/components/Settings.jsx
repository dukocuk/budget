/**
 * Settings section component
 */

import './Settings.css'

export const Settings = ({ monthlyPayment, previousBalance, onMonthlyPaymentChange, onPreviousBalanceChange }) => {
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
    </section>
  )
}
