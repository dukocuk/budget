-- Migration 004: Budget Templates Support
-- Adds template functionality to budget_periods table for reusable budget configurations

-- Add template fields to budget_periods table
ALTER TABLE budget_periods
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS template_name TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS template_description TEXT DEFAULT NULL;

-- Create index for faster template queries
CREATE INDEX IF NOT EXISTS idx_budget_periods_templates ON budget_periods(user_id, is_template) WHERE is_template = true;

-- Update RLS policies to include templates
-- Templates should be accessible by their owner
CREATE POLICY "Users can view their own templates"
ON budget_periods FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create templates"
ON budget_periods FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
ON budget_periods FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
ON budget_periods FOR DELETE
USING (auth.uid() = user_id);

-- Add check constraint to ensure templates have names
ALTER TABLE budget_periods
ADD CONSTRAINT template_name_required
CHECK (
  (is_template = false) OR
  (is_template = true AND template_name IS NOT NULL AND trim(template_name) != '')
);

-- Function to create a budget period from a template
-- Copies all settings and optionally expenses from template to new period
CREATE OR REPLACE FUNCTION create_period_from_template(
  p_user_id UUID,
  p_template_id UUID,
  p_year INTEGER,
  p_previous_balance NUMERIC DEFAULT 0,
  p_copy_expenses BOOLEAN DEFAULT true
) RETURNS UUID AS $$
DECLARE
  v_new_period_id UUID;
  v_template RECORD;
BEGIN
  -- Get template
  SELECT * INTO v_template
  FROM budget_periods
  WHERE id = p_template_id
    AND user_id = p_user_id
    AND is_template = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  -- Check if year already exists
  IF EXISTS (
    SELECT 1 FROM budget_periods
    WHERE user_id = p_user_id AND year = p_year AND is_template = false
  ) THEN
    RAISE EXCEPTION 'Budget for year % already exists', p_year;
  END IF;

  -- Create new period from template
  INSERT INTO budget_periods (
    user_id,
    year,
    monthly_payment,
    previous_balance,
    monthly_payments,
    status,
    is_template,
    template_name,
    template_description
  ) VALUES (
    p_user_id,
    p_year,
    v_template.monthly_payment,
    p_previous_balance,
    v_template.monthly_payments,
    'active',
    false,
    NULL,
    NULL
  )
  RETURNING id INTO v_new_period_id;

  -- Copy expenses if requested
  IF p_copy_expenses THEN
    INSERT INTO expenses (
      user_id,
      budget_period_id,
      name,
      amount,
      frequency,
      start_month,
      end_month
    )
    SELECT
      p_user_id,
      v_new_period_id,
      name,
      amount,
      frequency,
      start_month,
      end_month
    FROM expenses
    WHERE budget_period_id = p_template_id
      AND user_id = p_user_id;
  END IF;

  RETURN v_new_period_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_period_from_template TO authenticated;

-- Add comment for documentation
COMMENT ON COLUMN budget_periods.is_template IS 'Whether this is a reusable template (true) or an actual budget period (false)';
COMMENT ON COLUMN budget_periods.template_name IS 'User-friendly name for the template (required if is_template = true)';
COMMENT ON COLUMN budget_periods.template_description IS 'Optional description of what the template is for';
COMMENT ON FUNCTION create_period_from_template IS 'Creates a new budget period from a template, optionally copying expenses';
