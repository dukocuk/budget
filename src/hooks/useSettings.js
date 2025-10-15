import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { localDB } from '../lib/pglite'
import { logger } from '../utils/logger'

export function useSettings(userId) {
  const [settings, setSettings] = useState({
    monthlyPayment: 0,
    previousBalance: 0,
    monthlyPayments: null, // Array of 12 values or null
    useVariablePayments: false // Toggle between fixed/variable
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

        // Parse monthly_payments if exists
        let monthlyPayments = null
        if (dbSettings.monthly_payments) {
          try {
            monthlyPayments = JSON.parse(dbSettings.monthly_payments)
          } catch (e) {
            logger.error('Error parsing monthly_payments:', e)
          }
        }

        setSettings({
          monthlyPayment: dbSettings.monthly_payment || 0,
          previousBalance: dbSettings.previous_balance || 0,
          monthlyPayments: monthlyPayments,
          useVariablePayments: monthlyPayments !== null
        })
      }

      setLoading(false)
    } catch (err) {
      logger.error('Error loading settings:', err)
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
        monthly_payments: newSettings.monthlyPayments !== undefined
          ? JSON.stringify(newSettings.monthlyPayments)
          : (settings.monthlyPayments ? JSON.stringify(settings.monthlyPayments) : null),
        updated_at: new Date().toISOString()
      }

      // Update local DB
      await localDB.query(
        `INSERT INTO settings (user_id, monthly_payment, previous_balance, monthly_payments, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO UPDATE SET
           monthly_payment = EXCLUDED.monthly_payment,
           previous_balance = EXCLUDED.previous_balance,
           monthly_payments = EXCLUDED.monthly_payments,
           updated_at = EXCLUDED.updated_at`,
        [
          dbSettings.user_id,
          dbSettings.monthly_payment,
          dbSettings.previous_balance,
          dbSettings.monthly_payments,
          dbSettings.updated_at
        ]
      )

      // Sync to cloud (Supabase handles JSONB automatically)
      const cloudSettings = {
        user_id: dbSettings.user_id,
        monthly_payment: dbSettings.monthly_payment,
        previous_balance: dbSettings.previous_balance,
        monthly_payments: newSettings.monthlyPayments || null, // Send as array or null
        updated_at: dbSettings.updated_at
      }

      const { error: cloudError } = await supabase
        .from('settings')
        .upsert(cloudSettings, { onConflict: 'user_id' })

      if (cloudError) throw cloudError

      // Update local state
      setSettings({
        monthlyPayment: dbSettings.monthly_payment,
        previousBalance: dbSettings.previous_balance,
        monthlyPayments: newSettings.monthlyPayments !== undefined ? newSettings.monthlyPayments : settings.monthlyPayments,
        useVariablePayments: (newSettings.monthlyPayments !== undefined ? newSettings.monthlyPayments : settings.monthlyPayments) !== null
      })
    } catch (err) {
      logger.error('Error updating settings:', err)
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
