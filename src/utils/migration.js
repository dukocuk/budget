/**
 * Data migration utilities for localStorage → Supabase
 * Handles one-time migration of existing user data to cloud
 */

import { supabase } from '../lib/supabase'
import { STORAGE_KEY, DEFAULT_SETTINGS } from './constants'

/**
 * Check if user has data in localStorage that needs migration
 * @returns {Object} Migration status and data
 */
export function checkLocalStorageData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)

    if (!stored) {
      return {
        hasData: false,
        data: null
      }
    }

    const parsed = JSON.parse(stored)

    return {
      hasData: true,
      data: {
        expenses: parsed.expenses || [],
        monthlyPayment: parsed.monthlyPayment || DEFAULT_SETTINGS.monthlyPayment,
        previousBalance: parsed.previousBalance || DEFAULT_SETTINGS.previousBalance,
        savedDate: parsed.savedDate || null
      }
    }
  } catch (error) {
    console.error('Error checking localStorage data:', error)
    return {
      hasData: false,
      data: null,
      error: error.message
    }
  }
}

/**
 * Migrate localStorage data to Supabase for authenticated user
 * @param {Object} user - Authenticated user object
 * @param {Object} localData - Data from localStorage
 * @returns {Promise<Object>} Migration result
 */
export async function migrateToSupabase(user, localData) {
  if (!user) {
    return {
      success: false,
      error: 'No authenticated user'
    }
  }

  if (!localData || (!localData.expenses?.length && !localData.monthlyPayment && !localData.previousBalance)) {
    return {
      success: true,
      message: 'No data to migrate'
    }
  }

  try {
    console.log('🔄 Starting migration to Supabase...')

    // Migrate expenses
    if (localData.expenses && localData.expenses.length > 0) {
      const expensesData = localData.expenses.map(expense => ({
        id: expense.id.toString(),
        user_id: user.id,
        name: expense.name,
        amount: expense.amount,
        frequency: expense.frequency,
        start_month: expense.startMonth,
        end_month: expense.endMonth
      }))

      const { error: expensesError } = await supabase
        .from('expenses')
        .insert(expensesData)

      if (expensesError) {
        // If error is duplicate key, that's okay - data already exists
        if (!expensesError.message.includes('duplicate key')) {
          throw expensesError
        }
      }

      console.log(`✅ Migrated ${expensesData.length} expenses`)
    }

    // Migrate settings
    const { error: settingsError } = await supabase
      .from('settings')
      .upsert({
        user_id: user.id,
        monthly_payment: localData.monthlyPayment || DEFAULT_SETTINGS.monthlyPayment,
        previous_balance: localData.previousBalance || DEFAULT_SETTINGS.previousBalance,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (settingsError) throw settingsError

    console.log('✅ Migrated settings')

    // Mark migration as complete in localStorage
    markMigrationComplete()

    return {
      success: true,
      message: 'Migration completed successfully',
      expenseCount: localData.expenses?.length || 0
    }

  } catch (error) {
    console.error('❌ Migration error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Mark migration as complete in localStorage
 * This prevents re-migration on subsequent logins
 */
function markMigrationComplete() {
  try {
    const migrationKey = `${STORAGE_KEY}_migrated`
    localStorage.setItem(migrationKey, JSON.stringify({
      migrated: true,
      timestamp: new Date().toISOString()
    }))
  } catch (error) {
    console.error('Error marking migration complete:', error)
  }
}

/**
 * Check if migration has already been completed
 * @returns {boolean} True if migration was completed
 */
export function isMigrationComplete() {
  try {
    const migrationKey = `${STORAGE_KEY}_migrated`
    const stored = localStorage.getItem(migrationKey)

    if (!stored) return false

    const data = JSON.parse(stored)
    return data.migrated === true

  } catch (error) {
    console.error('Error checking migration status:', error)
    return false
  }
}

/**
 * Clear localStorage data after successful migration
 * Keeps only migration marker
 * @param {boolean} keepBackup - If true, keeps a backup copy
 */
export function clearLocalStorageAfterMigration(keepBackup = true) {
  try {
    if (keepBackup) {
      // Create a backup before clearing
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        localStorage.setItem(`${STORAGE_KEY}_backup`, stored)
        console.log('📦 Created backup of localStorage data')
      }
    }

    // Clear the main storage key
    localStorage.removeItem(STORAGE_KEY)
    console.log('🗑️ Cleared localStorage data after successful migration')

    return true
  } catch (error) {
    console.error('Error clearing localStorage:', error)
    return false
  }
}

/**
 * Restore from localStorage backup
 * Useful if user wants to recover old data
 */
export function restoreFromBackup() {
  try {
    const backup = localStorage.getItem(`${STORAGE_KEY}_backup`)

    if (!backup) {
      return {
        success: false,
        message: 'No backup found'
      }
    }

    localStorage.setItem(STORAGE_KEY, backup)

    return {
      success: true,
      message: 'Backup restored successfully'
    }

  } catch (error) {
    console.error('Error restoring backup:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Complete migration workflow
 * Checks, migrates, and cleans up localStorage
 * @param {Object} user - Authenticated user
 * @returns {Promise<Object>} Migration result
 */
export async function autoMigrate(user) {
  // Check if migration already completed
  if (isMigrationComplete()) {
    console.log('✅ Migration already completed')
    return {
      success: true,
      alreadyMigrated: true,
      message: 'Data already migrated'
    }
  }

  // Check for local data
  const localCheck = checkLocalStorageData()

  if (!localCheck.hasData) {
    // No local data, mark as migrated to prevent future checks
    markMigrationComplete()
    return {
      success: true,
      message: 'No local data to migrate'
    }
  }

  // Perform migration
  const migrationResult = await migrateToSupabase(user, localCheck.data)

  if (migrationResult.success) {
    // Clear localStorage but keep backup
    clearLocalStorageAfterMigration(true)

    return {
      success: true,
      message: `Successfully migrated ${migrationResult.expenseCount} expenses`,
      expenseCount: migrationResult.expenseCount
    }
  }

  return migrationResult
}
