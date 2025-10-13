# Variable Monthly Payments Feature

## Overview

This feature allows users to set different monthly payment amounts for each month of the year, rather than using a single fixed amount for all 12 months. This is useful when income varies by month for the budget account.

## Implementation Summary

### Database Changes

#### Supabase Migration
**File**: `supabase/migrations/002_monthly_payments.sql`
- Added `monthly_payments` JSONB column to `settings` table
- Created GIN index for efficient JSONB queries
- Added helper function `get_monthly_payment()` for SQL-level access
- Backward compatible: NULL `monthly_payments` falls back to `monthly_payment`

#### PGlite Schema
**File**: `src/lib/pglite.js`
- Added `monthly_payments` TEXT column to local settings table
- Added `migrateSettingsTable()` function for automatic migration
- Integrated migration into app initialization flow

### Core Functionality

#### Utility Functions
**File**: `src/utils/calculations.js`

**New Function**: `getMonthlyPayment(defaultPayment, monthlyPayments, month)`
- Retrieves payment for specific month (1-12)
- Handles both fixed (single value) and variable (array) modes
- Returns fallback value if array is invalid

**Updated Functions**:
- `calculateSummary()` - Now accepts array or single value
- `calculateBalanceProjection()` - Uses variable payments for accurate projections

#### Settings Hook
**File**: `src/hooks/useSettings.js`

**New State**:
- `monthlyPayments`: Array of 12 numbers or null
- `useVariablePayments`: Boolean flag for mode selection

**Updated Logic**:
- Load: Parses JSON from database
- Save: Serializes array to JSON for PGlite, sends as JSONB to Supabase
- Dual persistence: Local (PGlite) + Cloud (Supabase)

### User Interface

#### Settings Component
**File**: `src/components/Settings.jsx`

**New UI Elements**:
1. **Payment Mode Radio Selector**:
   - "Fast beløb for hele året" (Fixed amount for whole year)
   - "Variabel beløb per måned" (Variable amount per month)

2. **Fixed Mode Input**:
   - Single number input with "kr./måned" suffix
   - Appears when fixed mode selected

3. **Variable Mode Grid**:
   - 12 month inputs (Jan-Dec) in responsive grid
   - 4 columns on desktop, 3 on tablet, 2 on mobile
   - Local state prevents sync spam during editing
   - Syncs to database on blur

**Handler Functions**:
- `handlePaymentModeChange()` - Switches between fixed/variable
- `handleMonthPaymentChange()` - Updates specific month value
- `handleMonthPaymentBlur()` - Triggers database sync

#### Styling
**File**: `src/components/Settings.css`

**New Styles**:
- `.settings-payment-mode` - Full-width container
- `.payment-mode-selector` - Radio options with conditional displays
- `.monthly-payments-grid` - Responsive 12-month grid
- `.month-payment-item` - Individual month input styling
- Dark mode support for all new elements
- Responsive breakpoints (768px, 480px)

### State Management

#### App.jsx Updates
**File**: `src/App.jsx`

**Settings Reducer**:
```javascript
case 'SET_MONTHLY_PAYMENTS':
  return { ...state, monthlyPayments: action.payload, useVariablePayments: action.payload !== null }

case 'SET_PAYMENT_MODE':
  return { ...state, useVariablePayments: action.payload, monthlyPayments: action.payload ? state.monthlyPayments : null }

case 'SET_ALL':
  return {
    monthlyPayment: action.payload.monthlyPayment,
    previousBalance: action.payload.previousBalance,
    monthlyPayments: action.payload.monthlyPayments || null,
    useVariablePayments: action.payload.monthlyPayments !== null
  }
```

**New Handlers**:
- `onMonthlyPaymentsChange` - Updates array
- `onTogglePaymentMode` - Switches mode

**Updated Logic**:
- Summary calculation uses array when available
- Settings sync includes `monthlyPayments` parameter
- Load settings populates array from cloud

### Cloud Synchronization

#### Sync Context
**File**: `src/contexts/SyncContext.jsx`

**Updated Functions**:
- `syncSettings(monthlyPayment, previousBalance, monthlyPayments)` - Now accepts array
- `loadSettings()` - Returns `monthlyPayments` from Supabase JSONB

**Sync Behavior**:
- Debounced sync after blur (1 second delay)
- JSON comparison to detect array changes
- Automatic sync to all connected devices
- Offline-first: Works without internet, syncs when reconnected

## Usage

### For Users

1. **Access Settings**:
   - Go to "Indstillinger" tab (⚙️)
   - Scroll to "💰 Månedlige indbetalinger" section

2. **Fixed Mode** (Default):
   - Select "Fast beløb for hele året"
   - Enter single amount (e.g., 5700)
   - Applied to all 12 months

3. **Variable Mode**:
   - Select "Variabel beløb per måned"
   - Grid appears with 12 month inputs
   - Edit individual months as needed
   - Changes sync automatically on blur

4. **Switch Modes**:
   - Fixed → Variable: Initializes all months with current fixed value
   - Variable → Fixed: Clears array, uses single value

### For Developers

#### Adding New Calculation Features

When calculations need monthly payment values:

```javascript
import { getMonthlyPayment } from './utils/calculations'

// In your calculation function
for (let month = 1; month <= 12; month++) {
  const payment = getMonthlyPayment(
    defaultPayment,      // Single value fallback
    monthlyPayments,     // Array of 12 or null
    month                // 1-12
  )
  // Use payment for calculations
}
```

#### Accessing Settings

From components with SyncContext:

```javascript
const { loadSettings } = useSyncContext()

const settingsResult = await loadSettings()
if (settingsResult.success) {
  const { monthlyPayment, previousBalance, monthlyPayments } = settingsResult.data
  // monthlyPayments will be array or null
}
```

## Data Format

### PGlite (Local Storage)
```sql
CREATE TABLE settings (
  user_id TEXT PRIMARY KEY,
  monthly_payment INTEGER NOT NULL DEFAULT 0,
  previous_balance INTEGER NOT NULL DEFAULT 0,
  monthly_payments TEXT DEFAULT NULL,  -- JSON string
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
)
```

**Example JSON**:
```json
"[5700, 5700, 5700, 6000, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700]"
```

### Supabase (Cloud Storage)
```sql
CREATE TABLE settings (
  user_id UUID PRIMARY KEY,
  monthly_payment NUMERIC(10, 2) NOT NULL DEFAULT 5700,
  previous_balance NUMERIC(10, 2) NOT NULL DEFAULT 4831,
  monthly_payments JSONB DEFAULT NULL,  -- Native JSONB
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

**Example JSONB**:
```json
[5700, 5700, 5700, 6000, 5700, 5700, 5700, 5700, 5700, 5700, 5700, 5700]
```

## Backward Compatibility

### Existing Users
- No data migration required
- `monthly_payments` defaults to NULL
- NULL triggers fallback to `monthly_payment` (single value)
- Existing functionality unchanged

### New Users
- Default to fixed mode
- Can switch to variable mode anytime
- Array initializes with current fixed value

## Testing Checklist

- [x] Database migrations (Supabase + PGlite)
- [x] Utility functions (getMonthlyPayment, calculateSummary, calculateBalanceProjection)
- [x] Settings hook (load, save, sync)
- [x] Settings component (UI, handlers, local state)
- [x] CSS styling (light mode, dark mode, responsive)
- [x] App state management (reducer, handlers, sync)
- [x] Cloud sync (syncSettings, loadSettings)
- [x] Build verification (no errors, no lint issues)

### Manual Testing Required

- [ ] Switch between fixed and variable modes
- [ ] Edit individual months in variable mode
- [ ] Verify sync to cloud (check Supabase dashboard)
- [ ] Test multi-device sync (open on 2 devices)
- [ ] Verify offline functionality
- [ ] Test dark mode appearance
- [ ] Test mobile responsive design
- [ ] Verify calculations use variable payments correctly
- [ ] Test balance chart with variable payments
- [ ] Export/Import CSV with variable payments

## Migration Steps

### For Existing Deployments

1. **Run Supabase Migration**:
   ```bash
   # In Supabase SQL editor
   # Run: supabase/migrations/002_monthly_payments.sql
   ```

2. **Deploy Updated Code**:
   ```bash
   npm run build
   # Deploy dist/ to hosting
   ```

3. **PGlite Auto-Migration**:
   - Runs automatically on app load
   - Checks for `monthly_payments` column
   - Adds column if missing
   - No user action required

## Performance Impact

**Token Usage**: Minimal
- Single JSONB column (12 numbers ≈ 100 bytes)
- GIN index for fast queries
- No additional network requests

**Rendering**: Optimized
- Local state prevents sync spam
- Debounced blur handlers
- Memoized calculations

**Database**: Efficient
- JSONB native operators in PostgreSQL
- Indexed for fast lookups
- TEXT storage in PGlite (parsed in JS)

## Future Enhancements

### Potential Features
- **Copy Previous Month**: Quick fill with previous month's value
- **Bulk Edit**: Apply value to multiple months at once
- **Payment Templates**: Save common patterns (e.g., "Summer Budget")
- **Visual Calendar**: Calendar-style month selector
- **Payment History**: Track changes over time
- **Statistical Analysis**: Average, min, max monthly payments

### Technical Improvements
- **Validation**: Min/max constraints per month
- **Currency Formatting**: Better number input with formatting
- **Undo/Redo**: History support for payment changes
- **Keyboard Navigation**: Tab through months efficiently

## Support

### Common Issues

**Q: Variable payments not syncing?**
A: Check internet connection and Supabase status. Data saves locally first, syncs when online.

**Q: Fixed value not applying to all months?**
A: Switch to fixed mode explicitly - variable mode must be disabled.

**Q: Lost data after switching modes?**
A: Fixed → Variable preserves values. Variable → Fixed clears array (by design).

**Q: Can't see monthly payment grid?**
A: Ensure "Variabel beløb per måned" radio button is selected.

### Debug Commands

**Check Local Database**:
```javascript
// Browser console
import { localDB } from './lib/pglite'
const result = await localDB.query('SELECT * FROM settings')
console.log(result.rows)
```

**Check Cloud Database**:
```sql
-- Supabase SQL editor
SELECT * FROM settings WHERE user_id = '<your-user-id>';
```

## Credits

**Feature Request**: Variable monthly payments for budget accounts
**Implementation Date**: 2025-01-13
**Version**: 1.0.0
**Architecture**: Offline-first with cloud sync
**Framework**: React + PGlite + Supabase
