-- Verification script for 002_monthly_payments.sql migration
-- Run this in Supabase SQL editor to confirm migration success

-- 1. Check if monthly_payments column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'settings'
  AND column_name = 'monthly_payments';

-- Expected result: One row showing the column details

-- 2. Check if GIN index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'settings'
  AND indexname = 'idx_settings_monthly_payments';

-- Expected result: One row showing the index definition

-- 3. Check if helper function exists
SELECT routine_name, routine_type, data_type
FROM information_schema.routines
WHERE routine_name = 'get_monthly_payment';

-- Expected result: One row showing the function details

-- 4. Test the helper function with sample data
SELECT get_monthly_payment(
  1000.00,  -- monthly_payment (fallback)
  '[1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200, 1200]'::jsonb,  -- monthly_payments array
  3  -- month (March)
);

-- Expected result: 1200.00 (from the array)

-- 5. Test fallback behavior (when monthly_payments is NULL)
SELECT get_monthly_payment(
  1000.00,  -- monthly_payment (fallback)
  NULL,     -- monthly_payments array
  6         -- month (June)
);

-- Expected result: 1000.00 (fallback to monthly_payment)

-- 6. Check column comment
SELECT col_description('settings'::regclass, (
  SELECT ordinal_position
  FROM information_schema.columns
  WHERE table_name = 'settings'
    AND column_name = 'monthly_payments'
));

-- Expected result: The comment text describing the column
