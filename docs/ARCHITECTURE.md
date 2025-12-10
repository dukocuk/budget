# Architecture Documentation

## Purpose
This document contains detailed architectural information that was extracted from CLAUDE.md for performance optimization.

## State Management

### Custom Hooks (10 total)

#### useExpenses(userId, periodId)
Complete expense CRUD operations with undo/redo history.

**Returns**:
- `expenses`: Array of expense objects `{id, name, amount, frequency, startMonth, endMonth}`
- `selectedExpenses`: Array of expense IDs for bulk operations
- `addExpense(expenseData)`: Adds new expense, inserts at top
- `updateExpense(id, data)`: Update existing expense
- `deleteExpense(id)`: Delete single expense
- `deleteSelected()`: Bulk delete selected expenses
- `undo()`, `redo()`: Full history tracking (Ctrl+Z, Ctrl+Shift+Z)

**Implementation**: `src/hooks/useExpenses.js`
**Cloud Sync**: Optional callback for automatic synchronization

#### useAuth()
Google OAuth authentication management.

**Returns**:
- `user`: Current authenticated user object
- `loading`: Loading state during auth operations
- `error`: Authentication error messages
- `signInWithGoogle()`: Google OAuth login
- `signOut()`: User logout with cleanup

**Implementation**: `src/hooks/useAuth.js`

#### useBudgetPeriods(userId)
Multi-year budget period management.

**Returns**:
- `periods`: Array of all budget periods, sorted desc by year
- `activePeriod`: Currently selected budget period
- `loading`: Loading state
- `error`: Error messages
- `createPeriod(periodData)`: Create new budget year
- `updatePeriod(id, data)`: Update period settings
- `deletePeriod(id)`: Delete period (use with caution)
- `archivePeriod(id)`: Mark as archived (read-only)
- `calculateEndingBalance(periodId)`: Calculate year-end balance

**Implementation**: `src/hooks/useBudgetPeriods.js`

#### useSyncContext()
Access to centralized sync state via SyncContext.

**Returns**:
- `syncStatus`: Current state (idle, syncing, synced, error, offline)
- `lastSyncTime`: Timestamp of last successful sync
- `syncError`: Error message if sync failed
- `isOnline`: Online/offline detection
- `syncExpenses()`: Debounced expense sync (1s delay)
- `syncSettings()`: Debounced settings sync
- `loadExpenses()`, `loadSettings()`: Load from Google Drive
- `syncBudgetPeriods()`: Sync budget periods

**Implementation**: `src/contexts/SyncContext.jsx`, `src/hooks/useSyncContext.js`
**Polling**: 30 seconds for multi-device sync

#### useExpenseFilters(expenses)
Search and filtering functionality.

**Returns**:
- `filteredExpenses`: Filtered expense array
- `searchText`, `setSearchText()`: Text search
- `frequencyFilter`, `setFrequencyFilter()`: Filter by frequency
- `monthFilter`, `setMonthFilter()`: Filter by active month
- `clearFilters()`: Reset all filters
- `hasActiveFilters`: Boolean indicator

**Implementation**: `src/hooks/useExpenseFilters.js`

#### useSettings(userId, periodId)
Settings management with dual persistence (PGlite + Google Drive).

**Returns**:
- `settings`: `{monthlyPayment, previousBalance, monthlyPayments}`
- `loading`: Loading state
- `error`: Error messages
- `updateSettings(newSettings)`: Update with dual sync

**Implementation**: `src/hooks/useSettings.js`
**Persistence**: PGlite (local) + Google Drive (cloud), automatic upsert

#### useAlert()
Centralized notification system.

**Returns**:
- `alert`: Current notification `{message, type}`
- `showAlert(message, type)`: Display with auto-dismiss

**Implementation**: `src/hooks/useAlert.js`

#### useDebounce(value, delay)
Debounce utility hook.

**Parameters**: value to debounce, delay in ms
**Returns**: debouncedValue
**Usage**: Search inputs, sync operations

**Implementation**: `src/hooks/useDebounce.js`

#### useOnlineStatus()
Online/offline network detection.

**Returns**: `isOnline` (boolean)
**Usage**: Sync status indicators

**Implementation**: `src/hooks/useOnlineStatus.js`

#### useViewportSize()
Responsive layout viewport detection.

**Returns**: `{width, height}` of viewport
**Usage**: Responsive component rendering

**Implementation**: `src/hooks/useViewportSize.js`

## Data Persistence

### Local Database (PGlite)
- **Technology**: PostgreSQL running in browser via PGlite
- **Primary Storage**: All data stored locally first
- **Performance**: Zero network latency for operations
- **Offline**: Complete functionality without internet
- **Persistence**: Data survives browser restarts

**Tables**:
```sql
budget_periods (
  id UUID PRIMARY KEY,
  user_id TEXT,
  year INTEGER,
  monthly_payment NUMERIC,
  previous_balance NUMERIC,
  monthly_payments JSONB,
  status TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

expenses (
  id UUID PRIMARY KEY,
  budget_period_id UUID REFERENCES budget_periods(id),
  name TEXT,
  amount NUMERIC,
  frequency TEXT,
  start_month INTEGER,
  end_month INTEGER
)
```

**Implementation**: `src/lib/pglite.js`

### Cloud Storage (Google Drive)
- **Location**: `/BudgetTracker/budget-data.json` in user's Google Drive
- **Format**: JSON with `budget_periods` and `expenses` arrays
- **Sync Strategy**: Local-first writes, debounced cloud sync (1s delay)
- **Multi-Device**: 30-second polling for cross-device updates
- **Conflict Resolution**: Last-write-wins with timestamp comparison
- **User Isolation**: Each user's data in their own Google Drive

**Implementation**: `src/lib/googleDrive.js`, `src/contexts/SyncContext.jsx`

## Business Logic

### Core Calculations (`src/utils/calculations.js`)

1. **calculateAnnualAmount(expense)**: Convert any frequency to annual total
2. **getMonthlyAmount(expense, month)**: Get amount for specific month (1-12)
3. **calculateSummary(expenses, monthlyPayment, previousBalance)**: Budget overview metrics
4. **calculateMonthlyTotals(expenses)**: 12-month expense breakdown
5. **calculateBalanceProjection(expenses, monthlyPayment, previousBalance)**: Running balance projection
6. **groupExpensesByFrequency(expenses)**: Aggregate by frequency for pie chart
7. **calculateMonthlyBreakdownByFrequency(expenses)**: Monthly totals by frequency
8. **validateExpense(expense)**: Comprehensive validation

### Frequency Logic
- **monthly**: Charged every month within start-end range
- **quarterly**: Charged on months 1, 4, 7, 10 within start-end range
- **yearly**: Single charge on startMonth

### Validation (`src/utils/validators.js`)
- `validateAmount()`: Sanitize amount inputs (min 0)
- `validateMonthRange()`: Valid month ranges (1-12, start ≤ end)
- `validateExpense()`: Complete expense validation
- `sanitizeExpense()`: Clean and normalize data

### CSV Operations
**Import** (`src/utils/importHelpers.js`):
- Parse CSV files with validation
- Duplicate detection
- Error reporting

**Export** (`src/utils/exportHelpers.js`):
- Generate CSV with UTF-8 BOM (Excel compatibility)
- Format: Expense summary + monthly breakdown + settings

## System Architecture

### Authentication Flow
1. User opens app → Login screen if not authenticated
2. Google OAuth via Google Identity Services
3. Store user token and info
4. Load user-specific data from PGlite and Google Drive

### Sync Flow
1. User makes change → Update PGlite immediately (optimistic UI)
2. Debounced sync (1s delay) → Upload to Google Drive
3. Background polling (30s) → Check for remote updates
4. If remote newer → Download and update PGlite
5. Offline operation → Queue changes, sync when online

### Multi-Device Sync
- Each device polls Google Drive every 30 seconds
- Timestamp comparison for conflict resolution
- Last-write-wins strategy
- Optimistic UI updates (local first, then cloud)

## Performance Optimization

### Metrics
- Expense CRUD operations: <50ms
- Graph rendering: <30ms per chart
- Settings changes: Single re-render with batched updates
- MonthlyOverview: Memoized calculations (240+ cached)

### Strategies
- React.useMemo for expensive calculations
- Batched state updates with useReducer
- Debounced sync operations
- Strategic console logging (22 logs for critical paths)
- Ref-based dependency management

## Error Handling

### ErrorBoundary
- Wraps entire app
- Catches React errors
- Displays user-friendly error message
- Logs to console for debugging

**Implementation**: `src/components/ErrorBoundary.jsx`

### Common Error Patterns
- Google Drive API failures → Offline mode graceful degradation
- Token expiration → Automatic re-authentication prompt
- PGlite errors → Fallback to memory-only mode
- Validation errors → User-friendly alert messages
