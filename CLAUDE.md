# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal budget tracker application for managing fixed expenses in DKK (Danish Kroner). Single-page React application built with Vite, featuring automatic cloud synchronization, real-time multi-device sync, expense filtering, and CSV import/export.

**Technology Stack**:
- React 19.1.1 with Hooks
- Vite 7.1.7 (build tool with HMR)
- Vitest 3.0.4 (testing framework) ✅
- @testing-library/react 16.0.1 (component testing) ✅
- @testing-library/jest-dom 7.0.3 (DOM matchers) ✅
- happy-dom 16.14.6 (lightweight DOM implementation) ✅
- ESLint 9.36.0 (code quality)
- Recharts 3.2.1 (charting library)
- React Modal 3.16.3 (modal dialogs)
- @react-oauth/google 0.12.1 (Google OAuth authentication) ✅
- gapi-script 1.2.0 (Google Drive API integration) ✅
- PGlite 0.3.10 (local PostgreSQL with offline-first architecture) ✅
- uuid 11.0.5 (UUID generation for offline-first) ✅

## Development Commands

```bash
# Start development server with HMR
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint

# Run tests with Vitest
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests in UI mode
npm run test:ui
```

## Project Structure

```
budget/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── Alert.jsx/css    # Alert notification system
│   │   ├── Auth.jsx/css     # Google OAuth login ✅
│   │   ├── Header.jsx/css   # App header with user info & sync status ✅
│   │   ├── Settings.jsx/css # Settings with sync indicators ✅
│   │   ├── SummaryCards.jsx/css # Budget summary cards
│   │   ├── ExpensesTable.jsx/css # Main expenses table with filtering ✅
│   │   ├── MonthlyOverview.jsx/css # Monthly breakdown
│   │   ├── AddExpenseModal.jsx/css # Modal for adding expenses
│   │   ├── DeleteConfirmation.jsx/css # Delete confirmation modal
│   │   ├── TabView.jsx/css # Tabbed navigation system
│   │   ├── BalanceChart.jsx/css # Monthly balance visualization
│   │   ├── ExpenseDistribution.jsx/css # Expense breakdown charts
│   │   ├── ErrorBoundary.jsx/css # Error handling wrapper
│   │   ├── Layout.jsx/css # App layout with navigation ✅
│   │   ├── Dashboard.jsx/css # Dashboard with charts & stats ✅
│   │   ├── ExpenseManager.jsx/css # Inline expense editing ✅
│   │   └── MonthlyView.jsx/css # Monthly expense breakdown ✅
│   ├── hooks/               # Custom React hooks
│   │   ├── useExpenses.js  # Expense CRUD + undo/redo + sync ✅
│   │   ├── useAlert.js     # Alert notifications ✅
│   │   ├── useAuth.js      # Authentication ✅
│   │   ├── useBudgetPeriods.js # Multi-year budget management ✅
│   │   ├── useDebounce.js  # Debounce utility hook ✅
│   │   ├── useExpenseFilters.js # Search & filtering ✅
│   │   ├── useOnlineStatus.js # Online/offline detection ✅
│   │   └── useSettings.js  # Settings management with PGlite ✅
│   ├── lib/                # External integrations
│   │   ├── googleDrive.js # Google Drive API client ✅
│   │   └── pglite.js      # PGlite local database ✅
│   ├── contexts/           # React contexts
│   │   ├── SyncContext.jsx # Centralized sync state management ✅
│   │   └── useSyncContext.js # Context hook for sync operations ✅
│   ├── utils/              # Pure utility functions
│   │   ├── constants.js    # App constants
│   │   ├── calculations.js # Budget calculations
│   │   ├── validators.js   # Input validation
│   │   ├── exportHelpers.js # CSV export logic
│   │   ├── importHelpers.js # CSV import logic ✅
│   │   ├── logger.js       # Logging utility ✅
│   │   ├── uuid.js         # UUID helper functions ✅
│   │   ├── yearComparison.js # Year comparison utilities ✅
│   │   └── seed.js         # Test seed data (dev only) ✅
│   ├── App.jsx            # Main app orchestration with auth wrapper ✅
│   ├── App.css            # Comprehensive styling ✅
│   ├── index.css          # Global styles with CSS variables ✅
│   └── main.jsx           # React entry point
├── test/                  # Test utilities
│   └── setup.js          # Vitest test setup and configuration ✅
├── public/              # Static assets
├── .env.example         # Example environment variables ✅
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite configuration with Vitest ✅
├── eslint.config.js     # ESLint rules
├── vitest.config.js     # Vitest test configuration ✅
└── CLAUDE.md           # This file
```

## Architecture & State Management

**Modular Component Architecture**: Refactored from 530-line monolithic App.jsx into component-based architecture with separation of concerns. **Tabbed Navigation**: Major UI redesign with no-scroll tab-based interface. **Cloud Sync**: Automatic Google Drive synchronization with offline-first architecture.

**State Management** (via custom hooks):

- **`useExpenses()`**: Complete expense CRUD operations with undo/redo history
  - `expenses`: Array of expense objects `{id, name, amount, frequency, startMonth, endMonth}`
  - `selectedExpenses`: Array of expense IDs for bulk operations
  - `addExpense(expenseData)`: Adds new expense (optional data parameter), inserts at top of table
  - `updateExpense()`, `deleteExpense()`, `deleteSelected()`
  - `undo()`, `redo()`: Full history tracking with keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)
  - **Cloud sync callback**: Optional callback for automatic cloud synchronization

- **`useAuth()`**: Authentication management ✅
  - `user`: Current authenticated user object
  - `loading`: Loading state during auth operations
  - `error`: Authentication error messages
  - `signInWithGoogle()`: Google OAuth login
  - `signOut()`: User logout with cleanup

- **`useSyncContext()`**: Access to centralized sync state via SyncContext ✅
  - `syncStatus`: Current sync state (idle, syncing, synced, error, offline)
  - `lastSyncTime`: Timestamp of last successful sync
  - `syncError`: Error message if sync failed
  - `isOnline`: Online/offline detection
  - `syncExpenses()`: Debounced expense sync (1 second delay)
  - `syncSettings()`: Debounced settings sync
  - `loadExpenses()`, `loadSettings()`: Load data from Google Drive
  - `syncBudgetPeriods()`: Sync budget periods to cloud
  - Polling (30 seconds) for multi-device sync
  - See [contexts/SyncContext.jsx](src/contexts/SyncContext.jsx) for implementation

- **`useExpenseFilters()`**: Search and filtering ✅
  - `filteredExpenses`: Filtered expense array
  - `searchText`, `setSearchText()`: Text search
  - `frequencyFilter`, `setFrequencyFilter()`: Filter by frequency
  - `monthFilter`, `setMonthFilter()`: Filter by active month
  - `clearFilters()`: Reset all filters
  - `hasActiveFilters`: Boolean indicator

- **`useAlert()`**: Centralized notification system ✅
  - `alert`: Current notification `{message, type}`
  - `showAlert()`: Display notification with auto-dismiss

- **`useBudgetPeriods(userId)`**: Multi-year budget period management ✅
  - `periods`: Array of all budget periods, sorted desc by year
  - `activePeriod`: Currently selected budget period
  - `loading`: Loading state
  - `error`: Error messages
  - `createPeriod()`: Create new budget year
  - `updatePeriod()`: Update period settings
  - `deletePeriod()`: Delete period (use with caution)
  - `archivePeriod()`: Mark period as archived (read-only)
  - `calculateEndingBalance()`: Calculate year-end balance for carryover

- **`useDebounce(value, delay)`**: Debounce utility hook ✅
  - Returns debounced value after specified delay
  - Used for search inputs and sync operations

- **`useOnlineStatus()`**: Online/offline detection ✅
  - `isOnline`: Boolean online status
  - Monitors network connectivity
  - Used for sync status indicators

- **`useSettings(userId, periodId)`**: Settings management with dual persistence ✅
  - `settings`: Settings object `{monthlyPayment, previousBalance}`
  - `loading`: Loading state during settings operations
  - `error`: Error messages from settings operations
  - `updateSettings(newSettings)`: Update settings with dual sync
  - **Dual Persistence**: PGlite (local) + Google Drive (cloud)
  - Automatic upsert with conflict resolution

**Global State** (App.jsx):
- `monthlyPayment`: Fixed monthly deposit (default: 5700 kr.)
- `previousBalance`: Carryover from previous year (default: 4831 kr.)
- `activeTab`: Current selected tab (0-3 for Oversigt, Udgifter, Månedlig oversigt, Indstillinger)
- `showAddModal`: Boolean for AddExpenseModal visibility
- `deleteConfirmation`: Object managing delete confirmation modal state

**Core Business Logic** ([utils/calculations.js](src/utils/calculations.js)):

1. **`calculateAnnualAmount(expense)`**
   - Converts any frequency to annual total
   - Returns: number (annual amount in kr.)
   - Logic:
     - `yearly`: Returns amount directly
     - `quarterly`: Counts quarters (Jan, Apr, Jul, Oct) within date range
     - `monthly`: Multiplies amount by months in range

2. **`getMonthlyAmount(expense, month)`**
   - Returns expense amount for specific month (1-12)
   - Returns: number (0 if outside range)

3. **`calculateSummary(expenses, monthlyPayment, previousBalance)`**
   - Computes budget overview metrics
   - Returns: `{totalAnnual, avgMonthly, monthlyBalance, annualReserve}`

4. **`calculateMonthlyTotals(expenses)`**
   - Generates 12-month expense breakdown
   - Returns: Array of 12 monthly totals

5. **`calculateBalanceProjection(expenses, monthlyPayment, previousBalance)`** ✅
   - Projects running balance for each month
   - Returns: Array of 12 objects `{month, balance, income, expenses}`
   - Used for: Balance trend visualization and forecasting

6. **`groupExpensesByFrequency(expenses)`** ✅
   - Aggregates total annual expenses by frequency type
   - Returns: Array of objects `{name, value}` for pie chart
   - Filters out zero-value categories

7. **`calculateMonthlyBreakdownByFrequency(expenses)`** ✅
   - Monthly totals grouped by frequency type
   - Returns: Array of 12 objects `{month, monthly, quarterly, yearly, total}`
   - Used for: Stacked bar chart visualization

8. **`validateExpense(expense)`** ✅
   - Comprehensive expense validation
   - Returns: `{isValid: boolean, errors: string[]}`
   - Validates: name, amount, frequency, month ranges

**Frequency Types**:
- `monthly`: Charged every month within start/end range
- `quarterly`: Charged on months 1, 4, 7, 10 within start/end range
- `yearly`: Single charge on startMonth

**Validation & Safety** ([utils/validators.js](src/utils/validators.js)):
- `validateAmount()`: Sanitize amount inputs (min 0)
- `validateMonthRange()`: Ensure valid month ranges (1-12, start ≤ end)
- `validateExpense()`: Complete expense object validation
- `sanitizeExpense()`: Clean and normalize expense data

**Data Persistence**:
- **Local Database** ([lib/pglite.js](src/lib/pglite.js)): ✅
  - **PGlite**: Local PostgreSQL database running in browser
  - **Tables**: `expenses`, `settings` with full SQL support
  - **Primary Storage**: All data stored locally first
  - **Instant Access**: No network latency for reads/writes
  - **Full Offline**: Complete functionality without internet

- **Cloud Storage & Synchronization** ([contexts/SyncContext.jsx](src/contexts/SyncContext.jsx)): ✅
  - **Centralized Sync State**: React Context manages all sync operations
  - **Google Drive Storage**: Single JSON file (`/BudgetTracker/budget-data.json`)
  - **Automatic sync**: Debounced (1 second delay) after changes
  - **Multi-device sync**: Polling (30 seconds) for cross-device updates
  - **Offline-first**: Works without internet, syncs when reconnected
  - **Backup & Sync**: Cloud serves as backup and multi-device sync layer
  - **Context Hook**: `useSyncContext()` for accessing sync state and operations

**CSV Import/Export** ([utils/importHelpers.js](src/utils/importHelpers.js), [utils/exportHelpers.js](src/utils/exportHelpers.js)): ✅
- **Import**: Parse CSV files with validation and duplicate detection
- **Export**: Generate CSV with UTF-8 BOM for Excel compatibility
- **Format**: Expense summary + monthly breakdown + settings

## Data Architecture ✅

### Local-First Design
- **Primary Storage**: PGlite (PostgreSQL in browser)
- **Instant Performance**: Zero network latency for all operations
- **Full Offline**: Complete functionality without internet
- **Persistent**: Data survives browser restarts
- **SQL Capabilities**: Full PostgreSQL feature set locally

### Cloud Synchronization ✅
- **Automatic Sync**: Changes sync to cloud within 1 second
- **Multi-Device Sync**: Polling (30 seconds) for cross-device updates
- **Conflict Resolution**: Last-write-wins strategy with timestamp comparison
- **User Data Isolation**: Each user's data stored in their own Google Drive
- **Backup Layer**: Cloud serves as backup and cross-device sync

### Architecture
- **Authentication**: Google OAuth via Google Identity Services
- **Local Database**: PGlite with tables `expenses`, `budget_periods`
- **Cloud Storage**: Google Drive API with single JSON file
- **Multi-Device Sync**: 30-second polling interval for updates
- **Sync Strategy**: Local-first writes, debounced cloud sync, optimistic UI

### Setup
See `.env.example` for required environment variables:
- `VITE_GOOGLE_CLIENT_ID`: OAuth 2.0 Client ID from Google Cloud Console
- `VITE_GOOGLE_API_KEY`: API Key from Google Cloud Console
- Enable Google Drive API in Google Cloud Console
- Configure OAuth consent screen with `https://www.googleapis.com/auth/drive.file` scope

## Multi-Year Budget Periods Architecture ✅

### Overview
The application supports multiple budget years with complete data isolation, historical retention, and intelligent balance carryover. Each year is represented as a **budget period** with its own expenses, settings, and status.

### Core Concepts

**Budget Period**: A complete budget year with:
- **Year**: Calendar year (2025, 2026, etc.)
- **Settings**: Monthly payment and starting balance (previously balance)
- **Monthly Payments**: Optional variable payments per month (JSONB)
- **Status**: 'active' (editable) or 'archived' (read-only)
- **Expenses**: All expenses linked via foreign key

**Data Isolation**: Each budget period maintains its own:
- Complete expense list
- Independent settings
- Separate calculations and reports
- Isolated CSV exports

**Historical Retention**: Previous years remain accessible:
- View historical data anytime
- Compare year-over-year trends
- Archive old years (read-only mode)
- Never lose historical records

### Local Database Schema

**PGlite Tables** (browser-based PostgreSQL):

**budget_periods table**:
- `id`: UUID primary key (client-generated)
- `user_id`: User identifier (from Google OAuth)
- `year`: Calendar year (2000-2100)
- `monthly_payment`: Fixed monthly deposit amount
- `previous_balance`: Starting balance from previous year
- `monthly_payments`: Optional variable payments (JSONB)
- `status`: 'active' or 'archived'
- `created_at`, `updated_at`: Timestamps

**expenses table**:
- `id`: UUID primary key (client-generated)
- `budget_period_id`: Foreign key to budget_periods
- `name`: Expense description
- `amount`: Expense amount
- `frequency`: 'monthly', 'quarterly', or 'yearly'
- `start_month`, `end_month`: Date range (1-12)

**Data Relationships**: One-to-many (budget_periods → expenses)
- Each expense belongs to exactly one budget period
- All expense queries filter by budget_period_id
- Cloud sync maintains same structure in JSON format

### Data Migration

Existing installations automatically migrate to budget periods on first load. The migration creates a 2025 budget period with current settings and links all existing expenses. See [lib/pglite.js](src/lib/pglite.js) - `migrateToBudgetPeriods()` for implementation details. Migration is idempotent and safe to run multiple times.

### Budget Period Management

**useBudgetPeriods Hook** ([hooks/useBudgetPeriods.js](src/hooks/useBudgetPeriods.js)):
```javascript
const {
  periods,              // Array of all budget periods, sorted desc by year
  activePeriod,         // Currently selected budget period
  loading,              // Loading state
  error,                // Error messages
  createPeriod,         // Create new budget year
  updatePeriod,         // Update period settings
  deletePeriod,         // Delete period (use with caution)
  archivePeriod,        // Mark period as archived (read-only)
  calculateEndingBalance // Calculate year-end balance for carryover
} = useBudgetPeriods(userId);
```

**Key Functions**:

1. **createPeriod(periodData)**
   - Creates new budget year with validation
   - Auto-generates UUID for offline-first support
   - Optional expense copying from previous year
   - Syncs to cloud automatically
   ```javascript
   await createPeriod({
     year: 2026,
     monthlyPayment: 5700,
     previousBalance: 0,
     monthlyPayments: null,
     copyExpensesFrom: '2025-period-uuid' // Optional
   });
   ```

2. **calculateEndingBalance(periodId)**
   - Formula: `previous_balance + total_income - total_expenses`
   - Handles variable monthly payments (JSONB)
   - Returns ending balance for next year's starting balance
   - Used for intelligent balance carryover

3. **archivePeriod(periodId)**
   - Marks period as 'archived' (read-only)
   - Prevents accidental modifications
   - Period remains viewable and accessible

### Period-Scoped Data Operations

**useExpenses Hook** (modified):
```javascript
// OLD: export const useExpenses = (userId) => {
// NEW: export const useExpenses = (userId, periodId) => {

const { expenses, ... } = useExpenses(user?.id, activePeriod?.id);
```

**All expense operations now filter by budget_period_id**:
- `loadExpenses()`: WHERE budget_period_id = $2
- `addExpense()`: INSERT ... budget_period_id
- `updateExpense()`: UPDATE ... WHERE budget_period_id = $2
- `deleteExpense()`: DELETE ... WHERE budget_period_id = $2

**useSettings Hook** (refactored):
```javascript
// OLD: Reads from deprecated settings table
// NEW: Reads from budget_periods table

const { settings, updateSettings } = useSettings(userId, periodId);
// Returns: { monthlyPayment, previousBalance, monthlyPayments }
```

### Cloud Synchronization

**SyncContext Integration** ([contexts/SyncContext.jsx](src/contexts/SyncContext.jsx)):
```javascript
const {
  syncBudgetPeriods,          // Sync periods to Google Drive
  loadBudgetPeriods,          // Load periods from Google Drive
  immediateSyncBudgetPeriods  // Immediate sync (no debounce)
} = useSyncContext();
```

**Automatic Sync**:
- Budget period creation/update triggers Google Drive sync
- Polling (30 seconds) for multi-device updates
- Debounced (1 second delay) to prevent sync spam
- Offline-first: local changes, sync when online

### User Interface

**YearSelector Component** ([components/YearSelector.jsx](src/components/YearSelector.jsx)):
- Dropdown in header for year selection
- Visual badges: ✅ Active / 📦 Archived
- "Opret nyt år" button for creating new years
- Click outside to close dropdown
- Keyboard accessible (Enter, Escape)

**CreateYearModal Component** ([components/CreateYearModal.jsx](src/components/CreateYearModal.jsx)):
- Modal for creating new budget years
- Auto-suggests next year (e.g., 2026 if 2025 exists)
- Auto-calculates starting balance from previous year
- Option to copy expenses from previous year
- Form validation (year uniqueness, valid range)

**Settings Year Management** ([components/Settings.jsx](src/components/Settings.jsx)):
```
📅 Budgetår
├─ Aktivt år: 2025
├─ Status: ✅ Aktiv
└─ 📦 Arkiver år 2025 (button)
```

**Read-Only Mode**: Archived periods show:
- Prominent banner: "📦 Dette er et arkiveret budgetår (YEAR) - kun visning"
- All inputs disabled (expense table, settings)
- Delete/edit buttons disabled
- Clear visual feedback

### User Workflows

**Creating a New Budget Year**:
1. Click "Opret nyt år" in YearSelector dropdown
2. CreateYearModal opens with suggested year (2026)
3. System auto-calculates starting balance from 2025 ending balance
4. Option: Check "Kopier udgifter fra tidligere år"
5. Click "Opret budget" → New year created with optional expense copies
6. Automatically switched to new year
7. Alert: "✅ Budget for år 2026 oprettet!"

**Switching Between Years**:
1. Click YearSelector dropdown (shows current year)
2. Select different year from list
3. App reloads with selected year's data
4. All calculations, charts, tables update automatically

**Archiving a Year**:
1. Go to Settings tab (⚙️ Indstillinger)
2. Find "📅 Budgetår" section
3. Click "📦 Arkiver år 2025"
4. Confirmation prompt
5. Year status → 'archived', entire app becomes read-only
6. Alert: "📦 Budgetår 2025 er nu arkiveret"

**Balance Carryover Workflow**:
1. End of 2025 → Click "Opret nyt år"
2. System calculates 2025 ending balance: 4831 + (5700×12) - 62000 = 11231 kr.
3. CreateYearModal pre-fills "Tidligere saldo": 11231 kr.
4. Create 2026 → Starts with 11231 kr. carried forward
5. Perfect continuity between years

### CSV Export with Year Support

**Enhanced Export** ([utils/exportHelpers.js](src/utils/exportHelpers.js)):
```javascript
const year = activePeriod?.year || new Date().getFullYear();
const filename = `budget_${year}_${new Date().toISOString().split('T')[0]}.csv`;
downloadCSV(csvContent, filename);
```

**Filename Format**: `budget_2025_2025-10-17.csv`
- Year from active budget period
- ISO date for uniqueness
- CSV contains period-specific data only

### Technical Implementation Details

**Period Selection State** (App.jsx):
```javascript
const {
  periods,
  activePeriod,
  loading: periodsLoading,
  createPeriod,
  archivePeriod,
  calculateEndingBalance
} = useBudgetPeriods(user?.id);

// Load settings from active period
useEffect(() => {
  if (activePeriod && !periodsLoading) {
    dispatchSettings({
      type: "SET_ALL",
      payload: {
        monthlyPayment: activePeriod.monthlyPayment,
        previousBalance: activePeriod.previousBalance,
        monthlyPayments: activePeriod.monthlyPayments || null
      }
    });
  }
}, [activePeriod, periodsLoading]);

// Read-only mode enforcement
const isReadOnly = activePeriod?.status === 'archived';
```

**Period-Scoped Expense Operations**:
```javascript
const { expenses, addExpense, updateExpense, deleteExpense } =
  useExpenses(user?.id, activePeriod?.id);

// All operations automatically filter by activePeriod.id
```

**UUID Generation for Offline-First**:
```javascript
import { v4 as uuidv4 } from 'uuid';

const periodId = uuidv4(); // Client-side UUID generation
await createPeriod({ id: periodId, ...periodData });
// Syncs to cloud when online
```

### Best Practices

**When to Archive**:
- End of calendar year (December 31st)
- After finalizing year-end reports
- When creating next year's budget
- To prevent accidental modifications

**When to Create New Year**:
- Beginning of new calendar year (January 1st)
- When planning ahead (create 2026 in Q4 2025)
- After calculating ending balance from previous year

**Data Safety**:
- Always archive before creating new year
- Verify ending balance calculation before carryover
- Export CSV backup before archiving
- Never delete budget periods (archive instead)

### Developer Notes

For schema changes, add columns to `budget_periods` table (not `expenses`) and maintain foreign key integrity. Automatic migration handles upgrades from pre-periods installations.

### Troubleshooting

Common issues:
- **Sync failures**: Check Google Drive API credentials in `.env`, verify OAuth consent screen configuration
- **Token expiration**: Sessions expire after 1 hour, user will need to re-authenticate
- **Archived periods**: Verify `isReadOnly` prop is correctly passed to components
- **Balance calculations**: Ensure `calculateEndingBalance()` includes monthlyPayments JSONB field
- **Performance**: All queries automatically filter by `budget_period_id` (indexed in PGlite)
- **Multi-device sync**: Polling occurs every 30 seconds, not real-time

## UI Components & Features

### Component Overview

**Core UI Components**:
1. **[Header.jsx](src/components/Header.jsx)** - App header with user info and sync status ✅
2. **[Auth.jsx](src/components/Auth.jsx)** - Google OAuth login screen ✅
3. **[Layout.jsx](src/components/Layout.jsx)** - Main app layout with navigation ✅
4. **[TabView.jsx](src/components/TabView.jsx)** - Tabbed navigation with dropdown
5. **[SummaryCards.jsx](src/components/SummaryCards.jsx)** - 4 budget summary cards
6. **[Alert.jsx](src/components/Alert.jsx)** - Notification system
7. **[ErrorBoundary.jsx](src/components/ErrorBoundary.jsx)** - Error handling

**Main View Components**:
8. **[Dashboard.jsx](src/components/Dashboard.jsx)** - Overview with charts and stats ✅
   - Summary cards (4 metrics)
   - Pie chart (expense distribution by frequency)
   - Bar chart (monthly expenses vs income)
   - Line chart (balance projection)
   - Quick stats section

9. **[ExpenseManager.jsx](src/components/ExpenseManager.jsx)** - Inline expense editing ✅
   - Searchable expense table
   - Inline editing (all fields editable)
   - Bulk selection and deletion
   - Add new expense functionality

10. **[MonthlyView.jsx](src/components/MonthlyView.jsx)** - Monthly breakdown table ✅
    - 12-column month-by-month view
    - All expenses with monthly amounts
    - Row and column totals

**Tab Content Components**:
11. **[BalanceChart.jsx](src/components/BalanceChart.jsx)** - Balance visualization
12. **[ExpenseDistribution.jsx](src/components/ExpenseDistribution.jsx)** - Expense charts
13. **[ExpensesTable.jsx](src/components/ExpensesTable.jsx)** - Expenses table with filtering ✅
14. **[MonthlyOverview.jsx](src/components/MonthlyOverview.jsx)** - 12-month breakdown
15. **[Settings.jsx](src/components/Settings.jsx)** - Settings with sync status ✅

**Modal Components**:
16. **[AddExpenseModal.jsx](src/components/AddExpenseModal.jsx)** - Add expense modal ✅
17. **[DeleteConfirmation.jsx](src/components/DeleteConfirmation.jsx)** - Delete confirmation ✅
18. **[CreateYearModal.jsx](src/components/CreateYearModal.jsx)** - Create new budget year ✅
19. **[PaymentModeConfirmation.jsx](src/components/PaymentModeConfirmation.jsx)** - Payment mode toggle confirmation ✅
20. **[SettingsModal.jsx](src/components/SettingsModal.jsx)** - Settings dialog ✅

**Year Management Components**:
21. **[YearSelector.jsx](src/components/YearSelector.jsx)** - Budget year dropdown selector ✅
22. **[YearComparison.jsx](src/components/YearComparison.jsx)** - Year-over-year comparison view ✅
23. **[YearComparisonCharts.jsx](src/components/YearComparisonCharts.jsx)** - Multi-year visualization ✅

**Template Management**:
24. **[TemplateManager.jsx](src/components/TemplateManager.jsx)** - Budget template CRUD ✅

### New Features ✅

**Search & Filtering** ([useExpenseFilters](src/hooks/useExpenseFilters.js)):
- Text search across expense names
- Filter by frequency (monthly/quarterly/yearly)
- Filter by active month
- Clear filters button
- Active filter count indicator

**CSV Import**:
- Parse CSV files with validation
- Duplicate detection
- Error reporting
- Preview before import

**Cloud Sync Status**:
- Connection indicator (online/offline)
- Sync status badge (syncing/synced/error)
- Last sync timestamp
- Automatic background sync

### Tabbed Navigation System

**Tab Structure**:
1. **📊 Oversigt** (Overview) - Dropdown with sub-tabs:
   - 📈 Balance udvikling (Balance chart)
   - 🥧 Udgiftsfordeling (Expense distribution)
2. **📝 Udgifter** (Expenses) - Expense table with filters ✅
3. **📅 Månedlig oversigt** (Monthly overview) - 12-month breakdown
4. **⚙️ Indstillinger** (Settings) - Config and sync status ✅

### User Interactions

**Authentication Flow** ✅:
1. User opens app → Login screen if not authenticated
2. Click "Log ind med Google"
3. Authenticate with Google OAuth
4. App loads with cloud-synced data

**Search & Filter** ✅:
- Type in search box to filter by name
- Select frequency dropdown to filter by type
- Select month dropdown to filter by active period
- Click "Ryd filtre" to reset
- See count of filtered expenses

**CSV Import** ✅:
- Go to Settings tab
- Click "📊 Importer fra CSV"
- Select CSV file
- Review validation results
- Confirm import

**Keyboard Shortcuts**:
- **Ctrl+N** (Cmd+N): Open add expense modal
- **Ctrl+Z** (Cmd+Z): Undo last operation
- **Ctrl+Shift+Z** (Cmd+Shift+Z): Redo operation
- **Enter**: Submit forms
- **Escape**: Close modals

## Styling System

**Color Palette**:
- Primary gradient: `#667eea` → `#764ba2` (purple)
- Success: `#10b981` (green)
- Error: `#ef4444` (red)
- Background: `#f9fafb`

**CSS Variables**: Defined in [:root](src/index.css)
- All colors, shadows, and transitions centralized
- Use `var(--color-primary)`, `var(--shadow-md)`, etc.

**Responsive Breakpoints**:
- Desktop: Default (>768px)
- Tablet: 768px
- Mobile: 480px

## Language & Localization

**Language**: Entirely in Danish (da-DK)

**Month Names**: `["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"]`

**Danish UI Text Examples**:
- "Månedlig indbetaling til budgetkonto"
- "Årlige udgifter"
- "Log ind med Google"
- "☁️ Online" / "📴 Offline"
- "✅ Synkroniseret"

**Date Formatting**: `da-DK` locale for `toLocaleDateString()`

## Recent Improvements

**Phase 1 - Modular Refactoring** (completed):
- ✅ Component-based architecture
- ✅ Custom hooks (useExpenses, useAlert, useAuth, useExpenseFilters, useSettings)
- ✅ Pure utility functions
- ✅ Undo/Redo functionality
- ✅ ErrorBoundary
- ✅ Enhanced accessibility

**Phase 2 - UI/UX Redesign** (completed):
- ✅ Tabbed navigation system
- ✅ No-scroll interface design
- ✅ Dropdown menu support
- ✅ Delete confirmation modal
- ✅ Balance chart visualization
- ✅ Expense distribution charts

**Phase 3 - Enhanced Features** (completed): ✅
- ✅ Cloud synchronization with Google Drive
- ✅ Google OAuth authentication
- ✅ Multi-device sync with polling
- ✅ Offline-first architecture
- ✅ Search and filter expenses
- ✅ CSV import functionality

**Phase 4 - Modern App Architecture** (completed): ✅
- ✅ Layout component with tab navigation
- ✅ Dashboard with comprehensive visualizations
  - Pie chart (frequency distribution)
  - Bar chart (monthly comparison)
  - Line chart (balance projection)
  - Quick statistics cards
- ✅ ExpenseManager with inline editing
  - Search functionality
  - Bulk operations (select/delete)
  - Inline field editing
- ✅ MonthlyView with 12-month breakdown
- ✅ PGlite integration for local-first architecture
- ✅ Settings hook with dual persistence (PGlite + Google Drive)
- ✅ Enhanced calculation utilities (8 functions)

**Phase 5 - Performance Optimization** (completed): ✅
- ✅ Removed debug console.logs from chart components
- ✅ Added React.useMemo for expensive calculations
- ✅ Memoized chart rendering to prevent re-renders
- ✅ Simplified data loading logic (consolidated useEffect hooks)
- ✅ Removed unused useLocalStorage hook
- ✅ Cleaner, more maintainable initialization flow

**Phase 6 - Testing Infrastructure** (completed): ✅
- ✅ Vitest testing framework with React Testing Library
- ✅ Happy-dom for lightweight DOM simulation
- ✅ Comprehensive test utilities and setup ([test/setup.js](src/test/setup.js))
- ✅ Component tests for UI components:
  - [Alert.test.jsx](src/components/Alert.test.jsx) - Alert component behavior
  - [SummaryCards.test.jsx](src/components/SummaryCards.test.jsx) - Budget cards display
  - [ErrorBoundary.test.jsx](src/components/ErrorBoundary.test.jsx) - Error handling
  - [TabView.test.jsx](src/components/TabView.test.jsx) - Tab navigation and dropdowns ✅
  - [AddExpenseModal.test.jsx](src/components/AddExpenseModal.test.jsx) - Modal interactions and validation ✅
  - [DeleteConfirmation.test.jsx](src/components/DeleteConfirmation.test.jsx) - Delete confirmation UI ✅
- ✅ Hook tests for custom hooks:
  - [useAlert.test.js](src/hooks/useAlert.test.js) - Alert notifications
  - [useExpenseFilters.test.js](src/hooks/useExpenseFilters.test.js) - Search & filtering
- ✅ Utility tests for business logic:
  - [calculations.test.js](src/utils/calculations.test.js) - Budget calculations
  - [validators.test.js](src/utils/validators.test.js) - Input validation
  - [exportHelpers.test.js](src/utils/exportHelpers.test.js) - CSV export functionality ✅
  - [importHelpers.test.js](src/utils/importHelpers.test.js) - CSV import and parsing ✅
- ✅ Test commands: `npm test`, `npm run test:watch`, `npm run test:coverage`, `npm run test:ui`

**Current Metrics**:
- Total components: 24+ (17 core + 3 main views + 5 modals + 3 year management + templates)
- Custom hooks: 9 (useExpenses, useAlert, useAuth, useBudgetPeriods, useDebounce, useExpenseFilters, useOnlineStatus, useSettings, useSyncContext)
- Utility modules: 9 (calculations, validators, exportHelpers, importHelpers, seed, constants, logger, uuid, yearComparison)
- Calculation functions: 8 (annual, monthly, summary, totals, projection, grouping, breakdown, validation)
- Test files: 28 (comprehensive coverage for hooks, components, and utilities) ✅
- Test cases: 595+ passing tests across all modules ✅
- Total codebase: ~8000+ lines (modular, optimized, test-covered, production-ready)
- ESLint: Clean, no errors
- Build size: ~280 KB (compressed: ~85 KB)
- Test coverage: Comprehensive (hooks, components, utilities, CSV import/export, multi-year features)

## Future Enhancements

**Phase 7 - Advanced Analytics** (pending):
- Multi-year comparison and historical analysis
- Budget forecasting with predictive analytics
- Expense categories with color coding
- Enhanced chart interactivity (tooltips, drill-down)
- Export to PDF with charts
- Email notifications
- Trend analysis and insights

**Phase 8 - Collaboration** (pending):
- Expense sharing between users
- Budget templates and sharing
- Collaborative budget planning
- Family budget management

**Phase 9 - Mobile & PWA** (pending):
- Progressive Web App (PWA) support
- Mobile app (React Native)
- Push notifications
- Mobile-optimized charts
- Offline caching strategies
- Install prompts

## Code Quality Standards

**ESLint Configuration**:
- React Hooks rules enforced
- React Refresh plugin for HMR
- Modern ES2020+ features

**Best Practices**:
- Functional components with Hooks
- Custom hooks for reusable logic
- Pure utility functions for testability
- Consistent error handling with try-catch
- User confirmations for destructive actions
- Accessibility: ARIA labels, keyboard support
- JSDoc comments for all functions
- Comprehensive test coverage with Vitest
- Test-driven development for utilities and hooks
- Component testing with React Testing Library

**Architecture Principles**:
- Component-based modular design
- Separation of concerns (UI, logic, utilities)
- Single Responsibility Principle
- DRY (Don't Repeat Yourself)
- Pure functions for calculations and validation

## Common Modification Patterns

### Adding a New Feature
1. Determine state management needs → Add to hook or create new hook
2. Create pure functions in [utils/](src/utils/) if reusable
3. Create component in [components/](src/components/)
4. Add component-specific CSS file
5. Import and integrate in [App.jsx](src/App.jsx)
6. Test undo/redo if modifying expense data
7. Maintain Danish language consistency
8. Consider cloud sync implications

### Adding Cloud Sync to a Feature
1. Update local PGlite schema in [lib/pglite.js](src/lib/pglite.js)
2. Add data to unified sync payload in [contexts/SyncContext.jsx](src/contexts/SyncContext.jsx)
3. Update JSON structure in Google Drive upload/download functions
4. Integrate sync callbacks in component/hook
5. Test offline behavior
6. Test multi-device synchronization (30-second polling)

### Adding a New Component
1. Create `ComponentName.jsx` in [src/components/](src/components/)
2. Create corresponding `ComponentName.css`
3. Use CSS variables for consistent styling
4. Follow prop patterns (callbacks, not setState)
5. Add JSDoc comments
6. Export for use in App.jsx

## Debugging Tips

**Common Issues**:
1. **Google Drive API**: Check `.env` file has valid `VITE_GOOGLE_CLIENT_ID` and `VITE_GOOGLE_API_KEY`
2. **Auth not working**: Verify Google Cloud Console OAuth 2.0 configuration and consent screen
3. **Sync failures**: Check browser console for Google Drive API errors and token expiration
4. **API quota exceeded**: Monitor Google Cloud Console for Drive API quota usage (1,000 requests/day free tier)
5. **Filter not working**: Verify filter logic in useExpenseFilters

**Debugging Strategy**:
- **Pure functions**: Easy to test in isolation
- **Hook debugging**: Use React DevTools to inspect state
- **Cloud sync**: Check browser console for sync logs
- **Error boundary**: Check console for caught errors
- **Network issues**: Use browser DevTools Network tab

**Testing Strategy**:
- **Unit Tests**: Comprehensive tests for hooks, utilities, and components
- **Component Tests**: React Testing Library for UI component behavior
- **Integration Tests**: Hook interactions and state management
- **Test Coverage**: Hooks (useAlert, useExpenseFilters), Components (Alert, SummaryCards, ErrorBoundary), Utils (calculations, validators)
- **Testing Framework**: Vitest with happy-dom for fast, reliable tests

**Manual Testing Checklist**:
- [ ] Google OAuth login/logout
- [ ] Cloud sync (add/edit/delete)
- [ ] Multi-device sync
- [ ] Offline operation
- [ ] Search and filters
- [ ] CSV import/export
- [ ] Tab navigation
- [ ] Undo/Redo operations
- [ ] Mobile responsiveness
- [ ] Alert messages
- [ ] Error handling

## Documentation

- **Project Guide**: This file (CLAUDE.md)
- **Local Database Schema**: [lib/pglite.js](src/lib/pglite.js) - PGlite table definitions and migrations
- **Google Drive Integration**: [lib/googleDrive.js](src/lib/googleDrive.js) - Drive API client and sync logic
- **Cloud Sync**: [contexts/SyncContext.jsx](src/contexts/SyncContext.jsx) - Centralized sync state management
- **Environment Setup**: [.env.example](.env.example) - Required Google Cloud credentials
- **Serena Configuration**: [.serena/project.yml](.serena/project.yml) - Project settings for Serena MCP
