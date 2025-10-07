import { useState } from 'react'
import { useSettings } from '../hooks/useSettings'
import { getMigrationStatus } from '../utils/migration'
import './Settings.css'

export default function Settings({ userId }) {
  const { settings, loading, updateSettings } = useSettings(userId)
  const [monthlyPayment, setMonthlyPayment] = useState(settings.monthlyPayment)
  const [previousBalance, setPreviousBalance] = useState(settings.previousBalance)
  const [saveStatus, setSaveStatus] = useState(null)

  const migrationStatus = getMigrationStatus()

  const handleSave = async () => {
    try {
      await updateSettings({
        monthlyPayment: parseInt(monthlyPayment) || 0,
        previousBalance: parseInt(previousBalance) || 0
      })
      setSaveStatus('success')
      setTimeout(() => setSaveStatus(null), 3000)
    } catch (error) {
      setSaveStatus('error')
      console.error('Error saving settings:', error)
    }
  }

  if (loading) {
    return <div className="loading">Indlæser indstillinger...</div>
  }

  return (
    <div className="settings">
      <h2>⚙️ Indstillinger</h2>

      <div className="settings-section">
        <h3>Budget konfiguration</h3>
        <div className="settings-grid">
          <div className="settings-item">
            <label htmlFor="monthlyPayment">
              Månedlig indbetaling til budgetkonto:
            </label>
            <input
              type="number"
              id="monthlyPayment"
              value={monthlyPayment}
              onChange={(e) => setMonthlyPayment(e.target.value)}
              className="settings-input"
            />
            <small>Beløb der overføres til budgetkontoen hver måned</small>
          </div>

          <div className="settings-item">
            <label htmlFor="previousBalance">
              Overført fra sidste år:
            </label>
            <input
              type="number"
              id="previousBalance"
              value={previousBalance}
              onChange={(e) => setPreviousBalance(e.target.value)}
              className="settings-input"
            />
            <small>Startbalance fra forrige år</small>
          </div>
        </div>

        <button onClick={handleSave} className="btn btn-primary">
          💾 Gem indstillinger
        </button>

        {saveStatus === 'success' && (
          <div className="save-message success">
            ✅ Indstillinger gemt succesfuldt!
          </div>
        )}

        {saveStatus === 'error' && (
          <div className="save-message error">
            ❌ Fejl ved gemning af indstillinger
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3>Datasynkronisering</h3>
        <div className="sync-info">
          <p>
            <strong>Status:</strong> Aktiv
          </p>
          <p>
            <strong>Synkronisering:</strong> Real-time med Supabase
          </p>
          <p>
            <strong>Lokal database:</strong> PGlite (PostgreSQL i browseren)
          </p>
        </div>

        {migrationStatus.hasBackup && (
          <div className="migration-info">
            <p>
              ✅ Migration gennemført {migrationStatus.migratedAt?.toLocaleDateString('da-DK')}
            </p>
            <small>Backup gemt i localStorage</small>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3>Om Budget Tracker</h3>
        <div className="about-info">
          <p><strong>Version:</strong> 2.0.0</p>
          <p><strong>Database:</strong> Supabase + PGlite</p>
          <p><strong>Features:</strong></p>
          <ul>
            <li>✅ Cross-device synkronisering</li>
            <li>✅ Offline support</li>
            <li>✅ Real-time opdateringer</li>
            <li>✅ Sikker datadeling (kun dig)</li>
          </ul>
        </div>
      </div>

      <div className="settings-section danger-zone">
        <h3>⚠️ Danger Zone</h3>
        <p>Disse handlinger kan ikke fortrydes</p>
        <button
          onClick={() => {
            if (window.confirm('Er du sikker? Dette sletter ALLE dine lokale data (cloud data bevares).')) {
              localStorage.clear()
              window.location.reload()
            }
          }}
          className="btn btn-danger"
        >
          🗑️ Ryd lokal cache
        </button>
      </div>
    </div>
  )
}
