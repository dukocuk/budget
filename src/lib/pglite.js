import { PGlite } from '@electric-sql/pglite';
import { logger } from '../utils/logger.js';

// Create local PostgreSQL database in browser with IndexedDB persistence
// Using IndexedDB ensures data persists and avoids filesystem bundle issues
export const localDB = new PGlite('idb://budget-db');

// Initialize local database schema (mirrors Supabase schema)
export async function initLocalDB() {
  try {
    // Budget Periods table - Manages multi-year budget configuration
    await localDB.exec(`
      CREATE TABLE IF NOT EXISTS budget_periods (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
        monthly_payment INTEGER NOT NULL DEFAULT 5700 CHECK (monthly_payment >= 0),
        previous_balance INTEGER NOT NULL DEFAULT 0,
        monthly_payments TEXT DEFAULT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
        is_template INTEGER DEFAULT 0 CHECK (is_template IN (0, 1)),
        template_name TEXT DEFAULT NULL,
        template_description TEXT DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, year)
      )
    `);

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

    // Migration: Add budget_period_id column if it doesn't exist (migration 003 compatibility)
    await localDB.exec(`
      DO $$
      BEGIN
        -- Add budget_period_id column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'expenses' AND column_name = 'budget_period_id'
        ) THEN
          ALTER TABLE expenses
          ADD COLUMN budget_period_id TEXT REFERENCES budget_periods(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // Settings table (DEPRECATED - kept for backward compatibility during migration)
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

    // Migration: Add template columns if they don't exist (migration 004 compatibility)
    await localDB.exec(`
      DO $$
      BEGIN
        -- Add is_template column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'budget_periods' AND column_name = 'is_template'
        ) THEN
          ALTER TABLE budget_periods
          ADD COLUMN is_template INTEGER DEFAULT 0 CHECK (is_template IN (0, 1));
        END IF;

        -- Add template_name column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'budget_periods' AND column_name = 'template_name'
        ) THEN
          ALTER TABLE budget_periods
          ADD COLUMN template_name TEXT DEFAULT NULL;
        END IF;

        -- Add template_description column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'budget_periods' AND column_name = 'template_description'
        ) THEN
          ALTER TABLE budget_periods
          ADD COLUMN template_description TEXT DEFAULT NULL;
        END IF;
      END $$;
    `);

    // Migration: Add variable monthly amounts support (migration 005)
    await localDB.exec(`
      DO $$
      BEGIN
        -- Add monthly_amounts column to expenses table if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'expenses' AND column_name = 'monthly_amounts'
        ) THEN
          ALTER TABLE expenses
          ADD COLUMN monthly_amounts TEXT DEFAULT NULL;

          RAISE NOTICE 'Migration 005: Added monthly_amounts column to expenses';
        END IF;
      END $$;
    `);

    // Create indexes for performance
    await localDB.exec(`
      CREATE INDEX IF NOT EXISTS idx_budget_periods_user_year ON budget_periods(user_id, year);
      CREATE INDEX IF NOT EXISTS idx_budget_periods_status ON budget_periods(user_id, status);
      CREATE INDEX IF NOT EXISTS idx_budget_periods_templates ON budget_periods(user_id, is_template);
      CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_budget_period ON expenses(budget_period_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_frequency ON expenses(frequency);
    `);

    logger.log('✅ Local PGlite database initialized successfully');
    logger.log(
      '  📦 Schema migrations applied: budget_period_id (003), templates (004), monthly_amounts (005)'
    );
    return true;
  } catch (error) {
    logger.error('❌ Error initializing local database:', error);
    throw error;
  }
}

// Helper function to clear local database (for testing/reset)
export async function clearLocalDB() {
  try {
    await localDB.exec('DROP TABLE IF EXISTS expenses CASCADE');
    await localDB.exec('DROP TABLE IF EXISTS budget_periods CASCADE');
    await localDB.exec('DROP TABLE IF EXISTS settings CASCADE');
    await localDB.exec('DROP TABLE IF EXISTS sync_metadata CASCADE');
    await initLocalDB();
    logger.log('✅ Local database cleared and reinitialized');
  } catch (error) {
    logger.error('❌ Error clearing local database:', error);
    throw error;
  }
}

/**
 * Migrate existing local data to use budget periods (one-time migration)
 * Creates a 2025 budget period and links all existing expenses to it
 */
export async function migrateToBudgetPeriods(userId) {
  try {
    logger.log('🔄 Starting local database migration to budget periods...');

    // Check if migration is needed (check if there are expenses without budget_period_id)
    const needsMigration = await localDB.query(
      'SELECT COUNT(*) as count FROM expenses WHERE user_id = $1 AND budget_period_id IS NULL',
      [userId]
    );

    if (needsMigration.rows[0].count === 0) {
      logger.log(
        '✅ Migration not needed - all expenses already linked to periods'
      );
      return true;
    }

    // Get existing settings
    const settingsResult = await localDB.query(
      'SELECT * FROM settings WHERE user_id = $1',
      [userId]
    );

    const settings = settingsResult.rows[0] || {
      monthly_payment: 5700,
      previous_balance: 0,
      monthly_payments: null,
    };

    // Generate UUID for 2025 budget period
    const periodId = crypto.randomUUID();

    // Create 2025 budget period
    await localDB.query(
      `INSERT INTO budget_periods (id, user_id, year, monthly_payment, previous_balance, monthly_payments, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, year) DO NOTHING`,
      [
        periodId,
        userId,
        2025,
        settings.monthly_payment || 5700,
        settings.previous_balance || 0,
        settings.monthly_payments,
        'active',
      ]
    );

    // Get the created period ID (in case of conflict)
    const periodResult = await localDB.query(
      'SELECT id FROM budget_periods WHERE user_id = $1 AND year = $2',
      [userId, 2025]
    );

    const actualPeriodId = periodResult.rows[0].id;

    // Link all existing expenses to 2025 period
    await localDB.query(
      'UPDATE expenses SET budget_period_id = $1 WHERE user_id = $2 AND budget_period_id IS NULL',
      [actualPeriodId, userId]
    );

    logger.log(
      '✅ Local database migrated successfully to budget periods (2025)'
    );
    return true;
  } catch (error) {
    logger.error('❌ Error migrating local database:', error);
    throw error;
  }
}
