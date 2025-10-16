import { PGlite } from '@electric-sql/pglite'

// Create local PostgreSQL database in browser with IndexedDB persistence
// Using IndexedDB ensures data persists and avoids filesystem bundle issues
export const localDB = new PGlite('idb://budget-db')

// Initialize local database schema (mirrors Supabase schema)
export async function initLocalDB() {
  try {
    // Expenses table - Using UUID for consistent IDs across local and cloud
    await localDB.exec(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
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
        monthly_payments TEXT DEFAULT NULL,
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

// Migration: Add monthly_payments column to settings table
export async function migrateSettingsTable() {
  try {
    // Check if monthly_payments column exists
    const columnCheck = await localDB.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'settings'
      AND column_name = 'monthly_payments'
    `)

    if (columnCheck.rows.length > 0) {
      console.log('✅ Settings table already has monthly_payments column')
      return
    }

    console.log('🔄 Adding monthly_payments column to settings table...')

    // Add monthly_payments column
    await localDB.exec(`
      ALTER TABLE settings
      ADD COLUMN IF NOT EXISTS monthly_payments TEXT DEFAULT NULL
    `)

    console.log('✅ Migration complete: Added monthly_payments column to settings')
  } catch (error) {
    console.error('❌ Error migrating settings table:', error)
    throw error
  }
}

// Migration: Migrate expenses table from numeric IDs to UUIDs
export async function migrateExpensesToUUID() {
  try {
    // Check if migration is needed by testing ID column type
    const testResult = await localDB.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_name = 'expenses'
      AND column_name = 'id'
    `)

    const isTextId = testResult.rows[0]?.data_type === 'text'

    if (isTextId) {
      console.log('✅ Expenses table already uses UUID (TEXT) IDs')
      return
    }

    console.log('🔄 Migrating expenses table from numeric IDs to UUIDs...')

    // Import UUID generator
    const { generateUUID } = await import('../utils/uuid.js')

    // Backup existing data
    const backup = await localDB.query('SELECT * FROM expenses')

    // Drop and recreate table with UUID schema
    await localDB.exec('DROP TABLE IF EXISTS expenses CASCADE')
    await localDB.exec(`
      CREATE TABLE expenses (
        id TEXT PRIMARY KEY,
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

    // Restore data with new UUIDs
    for (const row of backup.rows) {
      const newId = generateUUID()
      await localDB.query(
        `INSERT INTO expenses (id, user_id, name, amount, frequency, start_month, end_month, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          newId,
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

    console.log(`✅ Migration complete: Converted ${backup.rows.length} expenses to UUID-based IDs`)
  } catch (error) {
    console.error('❌ Error migrating expenses table to UUID:', error)
    throw error
  }
}
