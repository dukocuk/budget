import { useEffect, useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { initLocalDB } from './lib/pglite'
import { syncFromCloud } from './lib/sync'
import { migrateFromLocalStorage, needsMigration } from './utils/migration'
import Auth from './components/Auth'
import Layout from './components/Layout'
import './App.css'

export default function App() {
  const { user, loading: authLoading } = useAuth()
  const [dbReady, setDbReady] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [error, setError] = useState(null)

  // Initialize local PGlite database
  useEffect(() => {
    initLocalDB()
      .then(() => {
        setDbReady(true)
        console.log('✅ Local database ready')
      })
      .catch(err => {
        console.error('❌ Failed to initialize local database:', err)
        setError('Failed to initialize local database')
      })
  }, [])

  // Handle migration and sync when user logs in
  useEffect(() => {
    if (!user || !dbReady) return

    const handleDataSetup = async () => {
      try {
        // Check if we need to migrate from localStorage
        if (needsMigration()) {
          console.log('📦 Migration needed - starting...')
          setMigrating(true)

          const result = await migrateFromLocalStorage(user.id)

          if (result.migrated) {
            console.log(`✅ Migrated ${result.expensesCount} expenses from localStorage`)
          }

          setMigrating(false)
        } else {
          // No migration needed, just sync from cloud
          console.log('☁️ Syncing from cloud...')
          await syncFromCloud(user.id)
          console.log('✅ Synced from cloud')
        }
      } catch (err) {
        console.error('❌ Error during data setup:', err)
        setError(err.message)
        setMigrating(false)
      }
    }

    handleDataSetup()
  }, [user, dbReady])

  // Loading state
  if (authLoading || !dbReady) {
    return (
      <div className="app">
        <div className="app-loading">
          <div className="spinner"></div>
          <p>Indlæser Budget Tracker...</p>
        </div>
      </div>
    )
  }

  // Migration state
  if (migrating) {
    return (
      <div className="app">
        <div className="app-loading">
          <div className="spinner"></div>
          <p>Migrerer dine data til skyen...</p>
          <small>Dette sker kun én gang</small>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="app">
        <div className="app-error">
          <h2>❌ Fejl</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Genindlæs side
          </button>
        </div>
      </div>
    )
  }

  // Not logged in
  if (!user) {
    return <Auth />
  }

  // Main app
  return <Layout />
}
