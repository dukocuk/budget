import { PGlite } from "@electric-sql/pglite";

// Create local PostgreSQL database in browser with IndexedDB persistence
// Using IndexedDB ensures data persists and avoids filesystem bundle issues
export const localDB = new PGlite("idb://budget-db");

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
    `);

    // Settings table
    await localDB.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        user_id TEXT PRIMARY KEY,
        monthly_payment INTEGER NOT NULL DEFAULT 0,
        previous_balance INTEGER NOT NULL DEFAULT 0,
        monthly_payments TEXT DEFAULT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sync metadata table (track last sync time, etc.)
    await localDB.exec(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance
    await localDB.exec(`
      CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_frequency ON expenses(frequency);
    `);

    console.log("✅ Local PGlite database initialized successfully");
    return true;
  } catch (error) {
    console.error("❌ Error initializing local database:", error);
    throw error;
  }
}

// Helper function to clear local database (for testing/reset)
export async function clearLocalDB() {
  try {
    await localDB.exec("DROP TABLE IF EXISTS expenses CASCADE");
    await localDB.exec("DROP TABLE IF EXISTS settings CASCADE");
    await localDB.exec("DROP TABLE IF EXISTS sync_metadata CASCADE");
    await initLocalDB();
    console.log("✅ Local database cleared and reinitialized");
  } catch (error) {
    console.error("❌ Error clearing local database:", error);
    throw error;
  }
}
