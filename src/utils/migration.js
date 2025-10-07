import { supabase } from '../lib/supabase'
import { localDB } from '../lib/pglite'

/**
 * Migrate data from localStorage to Supabase and local PGlite
 */
export async function migrateFromLocalStorage(userId) {
  try {
    const saved = localStorage.getItem('budgetData2025')
    if (!saved) {
      console.log('No localStorage data found to migrate')
      return { migrated: false, reason: 'no_data' }
    }

    const data = JSON.parse(saved)
    console.log('Found localStorage data:', data)

    // Migrate expenses to Supabase
    const expensesToMigrate = []
    for (const expense of data.expenses || []) {
      const expenseData = {
        id: expense.id.toString(),
        user_id: userId,
        name: expense.name,
        amount: expense.amount,
        frequency: expense.frequency,
        start_month: expense.startMonth,
        end_month: expense.endMonth,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      expensesToMigrate.push(expenseData)

      // Also insert to local DB
      await localDB.exec(
        `INSERT INTO expenses (id, user_id, name, amount, frequency, start_month, end_month, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [
          expense.id,
          userId,
          expense.name,
          expense.amount,
          expense.frequency,
          expense.startMonth,
          expense.endMonth,
          new Date().toISOString(),
          new Date().toISOString()
        ]
      )
    }

    // Batch insert to Supabase
    if (expensesToMigrate.length > 0) {
      const { error: expensesError } = await supabase
        .from('expenses')
        .upsert(expensesToMigrate, { onConflict: 'id' })

      if (expensesError) {
        console.error('Error migrating expenses:', expensesError)
        throw expensesError
      }
    }

    // Migrate settings
    const settingsData = {
      user_id: userId,
      monthly_payment: data.monthlyPayment || 0,
      previous_balance: data.previousBalance || 0,
      updated_at: new Date().toISOString()
    }

    const { error: settingsError } = await supabase
      .from('settings')
      .upsert(settingsData, { onConflict: 'user_id' })

    if (settingsError) {
      console.error('Error migrating settings:', settingsError)
      throw settingsError
    }

    // Also insert settings to local DB
    await localDB.exec(
      `INSERT INTO settings (user_id, monthly_payment, previous_balance, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         monthly_payment = EXCLUDED.monthly_payment,
         previous_balance = EXCLUDED.previous_balance,
         updated_at = EXCLUDED.updated_at`,
      [userId, settingsData.monthly_payment, settingsData.previous_balance, settingsData.updated_at]
    )

    // Backup old data before clearing
    localStorage.setItem('budgetData2025_backup', saved)
    localStorage.setItem('budgetData2025_migrated_at', new Date().toISOString())

    // Remove original localStorage data
    localStorage.removeItem('budgetData2025')

    console.log(`✅ Successfully migrated ${expensesToMigrate.length} expenses and settings`)

    return {
      migrated: true,
      expensesCount: expensesToMigrate.length,
      savedDate: data.savedDate
    }
  } catch (error) {
    console.error('❌ Error during migration:', error)
    throw error
  }
}

/**
 * Check if migration is needed
 */
export function needsMigration() {
  const hasLocalStorageData = !!localStorage.getItem('budgetData2025')
  const alreadyMigrated = !!localStorage.getItem('budgetData2025_migrated_at')

  return hasLocalStorageData && !alreadyMigrated
}

/**
 * Get migration status
 */
export function getMigrationStatus() {
  const hasBackup = !!localStorage.getItem('budgetData2025_backup')
  const migratedAt = localStorage.getItem('budgetData2025_migrated_at')

  return {
    hasBackup,
    migratedAt: migratedAt ? new Date(migratedAt) : null,
    needsMigration: needsMigration()
  }
}

/**
 * Restore from backup (in case migration went wrong)
 */
export function restoreFromBackup() {
  const backup = localStorage.getItem('budgetData2025_backup')
  if (backup) {
    localStorage.setItem('budgetData2025', backup)
    localStorage.removeItem('budgetData2025_migrated_at')
    return true
  }
  return false
}
