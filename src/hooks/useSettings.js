import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { localDB } from '../lib/pglite'

export function useSettings(userId) {
  const [settings, setSettings] = useState({
    monthlyPayment: 0,
    previousBalance: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load settings from local database
  const loadSettings = useCallback(async () => {
    if (!userId) return

    try {
      const result = await localDB.query(
        'SELECT * FROM settings WHERE user_id = $1',
        [userId]
      )

      if (result.rows.length > 0) {
        const dbSettings = result.rows[0]
        setSettings({
          monthlyPayment: dbSettings.monthly_payment || 0,
          previousBalance: dbSettings.previous_balance || 0
        })
      }

      setLoading(false)
    } catch (err) {
      console.error('Error loading settings:', err)
      setError(err.message)
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Update settings
  const updateSettings = async (newSettings) => {
    try {
      setError(null)

      const dbSettings = {
        user_id: userId,
        monthly_payment: newSettings.monthlyPayment ?? settings.monthlyPayment,
        previous_balance: newSettings.previousBalance ?? settings.previousBalance,
        updated_at: new Date().toISOString()
      }

      // Update local DB
      await localDB.exec(
        `INSERT INTO settings (user_id, monthly_payment, previous_balance, updated_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE SET
           monthly_payment = EXCLUDED.monthly_payment,
           previous_balance = EXCLUDED.previous_balance,
           updated_at = EXCLUDED.updated_at`,
        [
          dbSettings.user_id,
          dbSettings.monthly_payment,
          dbSettings.previous_balance,
          dbSettings.updated_at
        ]
      )

      // Sync to cloud
      const { error: cloudError } = await supabase
        .from('settings')
        .upsert(dbSettings, { onConflict: 'user_id' })

      if (cloudError) throw cloudError

      // Update local state
      setSettings({
        monthlyPayment: dbSettings.monthly_payment,
        previousBalance: dbSettings.previous_balance
      })
    } catch (err) {
      console.error('Error updating settings:', err)
      setError(err.message)
      throw err
    }
  }

  return {
    settings,
    loading,
    error,
    updateSettings
  }
}
