# Multi-Year Budget Periods

## Overview
The application supports multiple budget years with complete data isolation, historical retention, and intelligent balance carryover.

## Database Schema

### budget_periods table
```sql
CREATE TABLE budget_periods (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  monthly_payment NUMERIC NOT NULL,
  previous_balance NUMERIC DEFAULT 0,
  monthly_payments JSONB,
  status TEXT CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### expenses table relationship
```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY,
  budget_period_id UUID REFERENCES budget_periods(id) ON DELETE CASCADE,
  -- other fields...
);
```

## User Workflows

### Creating a New Budget Year
1. Click "Opret nyt år" in YearSelector dropdown
2. Modal opens with suggested year (e.g., 2026 if 2025 exists)
3. System auto-calculates starting balance from previous year's ending balance
4. Optional: Check "Kopier udgifter fra tidligere år" to copy expenses
5. Click "Opret budget" → New year created
6. Automatically switched to new year
7. Alert confirms creation

### Switching Between Years
1. Click YearSelector dropdown
2. Select different year from list (shows status badges: ✅ Active / 📦 Archived)
3. App reloads with selected year's data
4. All calculations, charts, tables update automatically

### Archiving a Year
1. Go to Settings tab (⚙️ Indstillinger)
2. Find "📅 Budgetår" section
3. Click "📦 Arkiver år [YEAR]"
4. Confirm in prompt
5. Year status → 'archived', entire app becomes read-only
6. Alert confirms archiving

**Read-Only Mode**:
- Banner: "📦 Dette er et arkiveret budgetår (YEAR) - kun visning"
- All inputs disabled (expense table, settings)
- Delete/edit buttons disabled
- Clear visual feedback

### Balance Carryover
1. End of year → Click "Opret nyt år"
2. System calculates ending balance:
   ```
   ending_balance = previous_balance + (monthly_payment × 12) - total_expenses
   ```
3. Modal pre-fills "Tidligere saldo" with calculated amount
4. Create new year → Starts with carried forward balance
5. Perfect continuity between years

## Best Practices

### When to Archive
- End of calendar year (December 31st)
- After finalizing year-end reports
- When creating next year's budget
- To prevent accidental modifications

### When to Create New Year
- Beginning of new calendar year (January 1st)
- When planning ahead (e.g., create 2026 in Q4 2025)
- After calculating ending balance from previous year

### Data Safety
- Always archive before creating new year
- Verify ending balance calculation before carryover
- Export CSV backup before archiving
- Never delete budget periods (archive instead)

## CSV Export with Year Support
Export filename format: `budget_{YEAR}_{ISO_DATE}.csv`
- Example: `budget_2025_2025-10-17.csv`
- Contains period-specific data only
- Year from active budget period

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Can't edit expenses** | Check if year is archived (look for banner) |
| **Balance incorrect after carryover** | Verify calculateEndingBalance() includes monthlyPayments JSONB |
| **Year not showing** | Check user_id matches and year in valid range (2000-2100) |
| **Sync not working for periods** | Verify syncBudgetPeriods() called after changes |
