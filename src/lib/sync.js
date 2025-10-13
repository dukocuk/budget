import { supabase } from './supabase'
import { localDB } from './pglite'

/**
 * Sync local changes to Supabase cloud
 */
export async function syncToCloud(userId) {
  try {
    // Get all local expenses
    const localExpenses = await localDB.query(
      'SELECT * FROM expenses WHERE user_id = $1',
      [userId]
    )

    // Upsert each expense to Supabase
    for (const expense of localExpenses.rows) {
      const { error } = await supabase
        .from('expenses')
        .upsert({
          id: expense.id.toString(), // Convert BigInt to string
          user_id: userId,
          name: expense.name,
          amount: expense.amount,
          frequency: expense.frequency,
          start_month: expense.start_month,
          end_month: expense.end_month,
          created_at: expense.created_at,
          updated_at: expense.updated_at
        }, {
          onConflict: 'id'
        })

      if (error) {
        console.error('Error syncing expense to cloud:', error)
        throw error
      }
    }

    // Sync settings
    const localSettings = await localDB.query(
      'SELECT * FROM settings WHERE user_id = $1',
      [userId]
    )

    if (localSettings.rows.length > 0) {
      const settings = localSettings.rows[0]
      const { error } = await supabase
        .from('settings')
        .upsert({
          user_id: userId,
          monthly_payment: settings.monthly_payment,
          previous_balance: settings.previous_balance,
          updated_at: settings.updated_at
        }, {
          onConflict: 'user_id'
        })

      if (error) {
        console.error('Error syncing settings to cloud:', error)
        throw error
      }
    }

    // Update last sync metadata
    await localDB.query(
      `INSERT INTO sync_metadata (key, value, updated_at)
       VALUES ('last_sync', $1, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP`,
      [new Date().toISOString()]
    )

    console.log('✅ Synced to cloud successfully')
    return true
  } catch (error) {
    console.error('❌ Error syncing to cloud:', error)
    throw error
  }
}

/**
 * Sync cloud changes to local database
 */
export async function syncFromCloud(userId) {
  try {
    // Fetch all expenses from Supabase
    const { data: cloudExpenses, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)

    if (expensesError) throw expensesError

    // Upsert each expense to local DB
    for (const expense of cloudExpenses || []) {
      await localDB.query(
        `INSERT INTO expenses (id, user_id, name, amount, frequency, start_month, end_month, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           amount = EXCLUDED.amount,
           frequency = EXCLUDED.frequency,
           start_month = EXCLUDED.start_month,
           end_month = EXCLUDED.end_month,
           updated_at = EXCLUDED.updated_at`,
        [
          expense.id,
          expense.user_id,
          expense.name,
          expense.amount,
          expense.frequency,
          expense.start_month,
          expense.end_month,
          expense.created_at,
          expense.updated_at
        ]
      )
    }

    // Fetch settings from Supabase
    const { data: cloudSettings, error: settingsError } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (settingsError && settingsError.code !== 'PGRST116') { // Ignore "not found" error
      throw settingsError
    }

    if (cloudSettings) {
      await localDB.query(
        `INSERT INTO settings (user_id, monthly_payment, previous_balance, updated_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE SET
           monthly_payment = EXCLUDED.monthly_payment,
           previous_balance = EXCLUDED.previous_balance,
           updated_at = EXCLUDED.updated_at`,
        [
          cloudSettings.user_id,
          cloudSettings.monthly_payment,
          cloudSettings.previous_balance,
          cloudSettings.updated_at
        ]
      )
    }

    // Update last sync metadata
    await localDB.query(
      `INSERT INTO sync_metadata (key, value, updated_at)
       VALUES ('last_sync', $1, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP`,
      [new Date().toISOString()]
    )

    console.log('✅ Synced from cloud successfully')
    return true
  } catch (error) {
    console.error('❌ Error syncing from cloud:', error)
    throw error
  }
}

/**
 * Setup real-time subscription for automatic sync
 */
export function setupRealtimeSync(userId, onUpdate) {
  const channel = supabase
    .channel('budget-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'expenses',
        filter: `user_id=eq.${userId}`
      },
      async (payload) => {
        console.log('📡 Real-time change detected:', payload.eventType)

        try {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const expense = payload.new
            await localDB.query(
              `INSERT INTO expenses (id, user_id, name, amount, frequency, start_month, end_month, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
               ON CONFLICT (id) DO UPDATE SET
                 name = EXCLUDED.name,
                 amount = EXCLUDED.amount,
                 frequency = EXCLUDED.frequency,
                 start_month = EXCLUDED.start_month,
                 end_month = EXCLUDED.end_month,
                 updated_at = EXCLUDED.updated_at`,
              [
                expense.id,
                expense.user_id,
                expense.name,
                expense.amount,
                expense.frequency,
                expense.start_month,
                expense.end_month,
                expense.created_at,
                expense.updated_at
              ]
            )
            onUpdate()
          } else if (payload.eventType === 'DELETE') {
            await localDB.query('DELETE FROM expenses WHERE id = $1', [payload.old.id])
            onUpdate()
          }
        } catch (error) {
          console.error('Error processing real-time update:', error)
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'settings',
        filter: `user_id=eq.${userId}`
      },
      async (payload) => {
        console.log('📡 Settings change detected:', payload.eventType)

        try {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const settings = payload.new
            await localDB.query(
              `INSERT INTO settings (user_id, monthly_payment, previous_balance, updated_at)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (user_id) DO UPDATE SET
                 monthly_payment = EXCLUDED.monthly_payment,
                 previous_balance = EXCLUDED.previous_balance,
                 updated_at = EXCLUDED.updated_at`,
              [
                settings.user_id,
                settings.monthly_payment,
                settings.previous_balance,
                settings.updated_at
              ]
            )
            onUpdate()
          }
        } catch (error) {
          console.error('Error processing settings update:', error)
        }
      }
    )
    .subscribe()

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel)
    console.log('🔌 Real-time sync unsubscribed')
  }
}

/**
 * Get last sync timestamp
 */
export async function getLastSyncTime() {
  try {
    const result = await localDB.query(
      "SELECT value FROM sync_metadata WHERE key = 'last_sync'"
    )

    if (result.rows.length > 0) {
      return new Date(result.rows[0].value)
    }
    return null
  } catch (error) {
    console.error('Error getting last sync time:', error)
    return null
  }
}
