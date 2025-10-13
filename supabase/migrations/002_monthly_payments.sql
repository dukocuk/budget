-- Budget Tracker - Monthly Payments Feature
-- Migration to add variable monthly payments support
-- Run this in your Supabase SQL editor: https://supabase.com/dashboard/project/_/sql

-- Add monthly_payments column to settings table
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS monthly_payments JSONB DEFAULT NULL;

-- Create index for JSONB column for faster queries
CREATE INDEX IF NOT EXISTS idx_settings_monthly_payments
ON settings USING GIN (monthly_payments);

-- Comment explaining the data structure
COMMENT ON COLUMN settings.monthly_payments IS
'Array of 12 monthly payment values [Jan, Feb, ..., Dec]. If NULL, falls back to monthly_payment for backward compatibility.';

-- Helper function to get monthly payment for specific month (1-12)
-- This function handles both fixed (single value) and variable (array) payment modes
CREATE OR REPLACE FUNCTION get_monthly_payment(
  p_monthly_payment NUMERIC,
  p_monthly_payments JSONB,
  p_month INTEGER
) RETURNS NUMERIC AS $$
BEGIN
  -- Validate month range
  IF p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'Month must be between 1 and 12, got %', p_month;
  END IF;

  -- If monthly_payments array exists, use it (month-1 because JSON array is 0-indexed)
  IF p_monthly_payments IS NOT NULL THEN
    RETURN (p_monthly_payments->(p_month - 1))::NUMERIC;
  END IF;

  -- Otherwise fallback to single monthly_payment value for backward compatibility
  RETURN p_monthly_payment;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Monthly payments migration completed successfully!';
  RAISE NOTICE '📊 Added: monthly_payments JSONB column to settings table';
  RAISE NOTICE '🔍 Created: GIN index for JSONB queries';
  RAISE NOTICE '⚡ Added: get_monthly_payment() helper function';
  RAISE NOTICE '🔄 Backward compatible: NULL monthly_payments uses monthly_payment';
END $$;
