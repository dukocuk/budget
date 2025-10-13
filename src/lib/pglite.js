import { PGlite } from '@electric-sql/pglite'

// Create local PostgreSQL database in browser with IndexedDB persistence
// Using IndexedDB ensures data persists and avoids filesystem bundle issues
export const localDB = new PGlite('idb://budget-db')

// Initialize local database schema (mirrors Supabase schema)
export async function initLocalDB() {
  try {
    // Expenses table
    await localDB.exec(`
      CREATE TABLE IF NOT EXISTS expenses (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        amount INTEGER NOT NULL CHECK (amount > 0),
        frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'yearly')),
        start_month INTEGER NOT NULL CHECK (start_month BETWEEN 1 AND 12),
        end_month INTEGER NOT NULL CHECK (end_month BETWEEN 1 AND 12),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Settings table
    await localDB.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        user_id TEXT PRIMARY KEY,
        monthly_payment INTEGER NOT NULL DEFAULT 0,
        previous_balance INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Sync metadata table (track last sync time, etc.)
    await localDB.exec(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create indexes for performance
    await localDB.exec(`
      CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_frequency ON expenses(frequency);
    `)

    console.log('✅ Local PGlite database initialized successfully')
    return true
  } catch (error) {
    console.error('❌ Error initializing local database:', error)
    throw error
  }
}

// Helper function to clear local database (for testing/reset)
export async function clearLocalDB() {
  try {
    await localDB.exec('DROP TABLE IF EXISTS expenses CASCADE')
    await localDB.exec('DROP TABLE IF EXISTS settings CASCADE')
    await localDB.exec('DROP TABLE IF EXISTS sync_metadata CASCADE')
    await initLocalDB()
    console.log('✅ Local database cleared and reinitialized')
  } catch (error) {
    console.error('❌ Error clearing local database:', error)
    throw error
  }
}

// Migration: Fix expenses table to use auto-incrementing ID
export async function migrateExpensesTable() {
  try {
    // Check if migration is needed by testing if ID is auto-increment
    const testResult = await localDB.query(`
      SELECT column_default
      FROM information_schema.columns
      WHERE table_name = 'expenses'
      AND column_name = 'id'
    `)

    const hasAutoIncrement = testResult.rows[0]?.column_default?.includes('nextval')

    if (hasAutoIncrement) {
      console.log('✅ Expenses table already has auto-increment ID')
      return
    }

    console.log('🔄 Migrating expenses table to use auto-increment ID...')

    // Backup existing data
    const backup = await localDB.query('SELECT * FROM expenses')

    // Drop and recreate table with correct schema
    await localDB.exec('DROP TABLE IF EXISTS expenses CASCADE')
    await localDB.exec(`
      CREATE TABLE expenses (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        amount INTEGER NOT NULL CHECK (amount > 0),
        frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'yearly')),
        start_month INTEGER NOT NULL CHECK (start_month BETWEEN 1 AND 12),
        end_month INTEGER NOT NULL CHECK (end_month BETWEEN 1 AND 12),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Restore data (without explicit IDs - let them auto-generate)
    for (const row of backup.rows) {
      await localDB.query(
        `INSERT INTO expenses (user_id, name, amount, frequency, start_month, end_month, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          row.user_id,
          row.name,
          row.amount,
          row.frequency,
          row.start_month,
          row.end_month,
          row.created_at,
          row.updated_at
        ]
      )
    }

    // Recreate indexes
    await localDB.exec(`
      CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_frequency ON expenses(frequency);
    `)

    console.log(`✅ Migration complete: Restored ${backup.rows.length} expenses with new auto-increment IDs`)
  } catch (error) {
    console.error('❌ Error migrating expenses table:', error)
    throw error
  }
}
