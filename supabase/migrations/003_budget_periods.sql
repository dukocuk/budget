-- Budget Tracker - Budget Periods Architecture
-- Migration to support multi-year budgets with historical data retention
-- Run this in your Supabase SQL editor: https://supabase.com/dashboard/project/_/sql

-- ============================================================================
-- STEP 1: Create budget_periods table
-- ============================================================================

CREATE TABLE IF NOT EXISTS budget_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
  monthly_payment NUMERIC(10, 2) NOT NULL DEFAULT 5700 CHECK (monthly_payment >= 0),
  previous_balance NUMERIC(10, 2) NOT NULL DEFAULT 0,
  monthly_payments JSONB DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year)
);

-- Add comment explaining the table purpose
COMMENT ON TABLE budget_periods IS
'Stores budget configuration for each fiscal year. Each user can have multiple years (2025, 2026, etc.) with independent settings.';

COMMENT ON COLUMN budget_periods.year IS
'Fiscal year (e.g., 2025, 2026). One active period per user recommended.';

COMMENT ON COLUMN budget_periods.status IS
'Period status: "active" for current year, "archived" for historical/read-only years.';

COMMENT ON COLUMN budget_periods.previous_balance IS
'Starting balance for the year (carryover from previous year ending balance).';

-- ============================================================================
-- STEP 2: Modify expenses table to link to budget periods
-- ============================================================================

-- Add budget_period_id column (nullable during migration)
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS budget_period_id UUID REFERENCES budget_periods(id) ON DELETE CASCADE;

-- Add comment
COMMENT ON COLUMN expenses.budget_period_id IS
'Links expense to specific budget period (year). All expenses must belong to a period.';

-- ============================================================================
-- STEP 3: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_budget_periods_user_year
ON budget_periods(user_id, year);

CREATE INDEX IF NOT EXISTS idx_budget_periods_status
ON budget_periods(user_id, status);

CREATE INDEX IF NOT EXISTS idx_expenses_budget_period
ON expenses(budget_period_id);

-- ============================================================================
-- STEP 4: Data Migration - Migrate existing data to 2025 budget period
-- ============================================================================

-- Create 2025 budget period for all existing users with expenses
INSERT INTO budget_periods (user_id, year, monthly_payment, previous_balance, monthly_payments, status)
SELECT DISTINCT
  e.user_id,
  2025 as year,
  COALESCE(s.monthly_payment, 5700) as monthly_payment,
  COALESCE(s.previous_balance, 0) as previous_balance,
  s.monthly_payments,
  'active' as status
FROM expenses e
LEFT JOIN settings s ON s.user_id = e.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM budget_periods bp
  WHERE bp.user_id = e.user_id AND bp.year = 2025
)
ON CONFLICT (user_id, year) DO NOTHING;

-- Also create 2025 period for users who have settings but no expenses yet
INSERT INTO budget_periods (user_id, year, monthly_payment, previous_balance, monthly_payments, status)
SELECT
  s.user_id,
  2025 as year,
  s.monthly_payment,
  s.previous_balance,
  s.monthly_payments,
  'active' as status
FROM settings s
WHERE NOT EXISTS (
  SELECT 1 FROM budget_periods bp
  WHERE bp.user_id = s.user_id AND bp.year = 2025
)
ON CONFLICT (user_id, year) DO NOTHING;

-- Link all existing expenses to their user's 2025 budget period
UPDATE expenses e
SET budget_period_id = bp.id
FROM budget_periods bp
WHERE e.user_id = bp.user_id
  AND bp.year = 2025
  AND e.budget_period_id IS NULL;

-- Make budget_period_id NOT NULL after migration
ALTER TABLE expenses
ALTER COLUMN budget_period_id SET NOT NULL;

-- ============================================================================
-- STEP 5: Row Level Security (RLS) Policies for budget_periods
-- ============================================================================

ALTER TABLE budget_periods ENABLE ROW LEVEL SECURITY;

-- Users can view their own budget periods
CREATE POLICY "Users can view own budget periods"
  ON budget_periods FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own budget periods
CREATE POLICY "Users can insert own budget periods"
  ON budget_periods FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own budget periods
CREATE POLICY "Users can update own budget periods"
  ON budget_periods FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own budget periods
CREATE POLICY "Users can delete own budget periods"
  ON budget_periods FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 6: Update existing expenses RLS policies (no changes needed, kept for reference)
-- ============================================================================

-- Existing policies remain unchanged - expenses are still filtered by user_id
-- The budget_period_id adds an additional layer of organization

-- ============================================================================
-- STEP 7: Triggers and Functions
-- ============================================================================

-- Trigger to auto-update updated_at timestamp
CREATE TRIGGER update_budget_periods_updated_at
  BEFORE UPDATE ON budget_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Helper function to get active budget period for a user
CREATE OR REPLACE FUNCTION get_active_budget_period(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_period_id UUID;
BEGIN
  SELECT id INTO v_period_id
  FROM budget_periods
  WHERE user_id = p_user_id AND status = 'active'
  ORDER BY year DESC
  LIMIT 1;

  RETURN v_period_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to calculate ending balance for a budget period
CREATE OR REPLACE FUNCTION calculate_period_ending_balance(p_period_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total_income NUMERIC;
  v_total_expenses NUMERIC;
  v_previous_balance NUMERIC;
  v_monthly_payment NUMERIC;
  v_monthly_payments JSONB;
BEGIN
  -- Get period settings
  SELECT previous_balance, monthly_payment, monthly_payments
  INTO v_previous_balance, v_monthly_payment, v_monthly_payments
  FROM budget_periods
  WHERE id = p_period_id;

  -- Calculate total income (12 months)
  IF v_monthly_payments IS NOT NULL THEN
    -- Variable monthly payments
    SELECT SUM((value)::NUMERIC) INTO v_total_income
    FROM jsonb_array_elements(v_monthly_payments);
  ELSE
    -- Fixed monthly payment
    v_total_income := v_monthly_payment * 12;
  END IF;

  -- Calculate total expenses for the period
  SELECT COALESCE(SUM(
    CASE frequency
      WHEN 'yearly' THEN amount
      WHEN 'quarterly' THEN amount * (
        SELECT COUNT(*) FROM generate_series(1, 12) AS month
        WHERE month IN (1, 4, 7, 10)
          AND month >= start_month
          AND month <= end_month
      )
      WHEN 'monthly' THEN amount * (end_month - start_month + 1)
      ELSE 0
    END
  ), 0) INTO v_total_expenses
  FROM expenses
  WHERE budget_period_id = p_period_id;

  -- Return: previous_balance + total_income - total_expenses
  RETURN v_previous_balance + v_total_income - v_total_expenses;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- STEP 8: Enable Realtime for budget_periods table
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE budget_periods;

-- ============================================================================
-- STEP 9: Grant permissions
-- ============================================================================

GRANT ALL ON budget_periods TO authenticated;

-- ============================================================================
-- STEP 10: Deprecation notice for settings table
-- ============================================================================

-- NOTE: The settings table is now deprecated and replaced by budget_periods
-- DO NOT DROP settings table yet - keep for backward compatibility during transition
-- Consider dropping after all clients have migrated (set a future date)

COMMENT ON TABLE settings IS
'DEPRECATED: This table is replaced by budget_periods. Will be removed in a future migration. Do not use for new features.';

-- ============================================================================
-- Success message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Budget Periods migration completed successfully!';
  RAISE NOTICE '📊 Created: budget_periods table';
  RAISE NOTICE '🔗 Modified: expenses.budget_period_id column';
  RAISE NOTICE '📦 Migrated: Existing data to 2025 budget period';
  RAISE NOTICE '🔒 Configured: Row Level Security policies';
  RAISE NOTICE '⚡ Added: Helper functions for period management';
  RAISE NOTICE '📡 Enabled: Realtime for multi-device sync';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next Steps:';
  RAISE NOTICE '1. Update frontend to use budget_periods API';
  RAISE NOTICE '2. Test year creation and expense copying';
  RAISE NOTICE '3. Verify data migration (all expenses linked to 2025)';
  RAISE NOTICE '4. Schedule settings table deprecation (after full migration)';
END $$;
