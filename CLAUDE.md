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
- Supabase 2.74.0 (cloud sync & authentication)
- PGlite 0.3.10 (local PostgreSQL with offline-first architecture) ✅

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
│   │   ├── useAlert.js     # Alert notifications
│   │   ├── useAuth.js      # Authentication ✅
│   │   ├── useSupabaseSync.js # Automatic cloud sync ✅
│   │   ├── useExpenseFilters.js # Search & filtering ✅
│   │   └── useSettings.js  # Settings management with PGlite ✅
│   ├── lib/                # External integrations
│   │   ├── supabase.js    # Supabase client ✅
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
│   │   └── migration.js    # Data migration ✅
│   ├── App.jsx            # Main app orchestration with auth wrapper ✅
│   ├── App.css            # Comprehensive styling ✅
│   ├── index.css          # Global styles with CSS variables ✅
│   └── main.jsx           # React entry point
├── test/                  # Test utilities
│   └── setup.js          # Vitest test setup and configuration ✅
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql # Database schema ✅
├── public/              # Static assets
├── .env.example         # Example environment variables ✅
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite configuration with Vitest ✅
├── eslint.config.js     # ESLint rules
├── vitest.config.js     # Vitest test configuration ✅
├── CLAUDE.md           # This file
├── CLOUD_SYNC_IMPLEMENTATION.md # Cloud sync details ✅
└── SETUP_CLOUD_SYNC.md # Setup guide ✅
```

## Architecture & State Management

**Modular Component Architecture**: Refactored from 530-line monolithic App.jsx into component-based architecture with separation of concerns. **Tabbed Navigation**: Major UI redesign with no-scroll tab-based interface. **Cloud Sync**: Automatic Supabase synchronization with offline-first architecture.

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

- **`useSupabaseSync()`**: Automatic cloud synchronization ✅
  - `syncStatus`: Current sync state (idle, syncing, synced, error, offline)
  - `lastSyncTime`: Timestamp of last successful sync
  - `syncError`: Error message if sync failed
  - `isOnline`: Online/offline detection
  - `syncExpenses()`: Debounced expense sync (1 second delay)
  - `syncSettings()`: Debounced settings sync
  - `loadExpenses()`, `loadSettings()`: Load data from cloud
  - Real-time subscriptions for multi-device sync

- **`useExpenseFilters()`**: Search and filtering ✅
  - `filteredExpenses`: Filtered expense array
  - `searchText`, `setSearchText()`: Text search
  - `frequencyFilter`, `setFrequencyFilter()`: Filter by frequency
  - `monthFilter`, `setMonthFilter()`: Filter by active month
  - `clearFilters()`: Reset all filters
  - `hasActiveFilters`: Boolean indicator

- **`useAlert()`**: Centralized notification system
  - `alert`: Current notification `{message, type}`
  - `showAlert()`: Display notification with auto-dismiss

- **`useSettings(userId)`**: Settings management with dual persistence ✅
  - `settings`: Settings object `{monthlyPayment, previousBalance}`
  - `loading`: Loading state during settings operations
  - `error`: Error messages from settings operations
  - `updateSettings(newSettings)`: Update settings with dual sync
  - **Dual Persistence**: PGlite (local) + Supabase (cloud)
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
  - **Database tables**: `expenses`, `settings` with Row Level Security
  - **Automatic sync**: Debounced (1 second delay) after changes
  - **Real-time updates**: Multi-device sync via Supabase realtime
  - **Offline-first**: Works without internet, syncs when reconnected
  - **Backup & Sync**: Cloud serves as backup and multi-device sync layer
  - **Context Hook**: `useSyncContext()` for accessing sync state and operations

- **Browser localStorage**:
  - **Migration tracking**: One-time flags for data migration ([migration.js](src/utils/migration.js))
  - **NO expense/settings data**: All app data now in PGlite + Supabase only

**Data Migration** ([utils/migration.js](src/utils/migration.js)): ✅
- Automatic localStorage → Supabase migration on first login
- One-time migration with backup creation
- Restore capability if needed

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
- **Real-time Multi-Device**: Updates appear on all devices instantly
- **Conflict Resolution**: Last-write-wins strategy
- **Row Level Security**: User data isolation at database level
- **Backup Layer**: Cloud serves as backup and cross-device sync

### Architecture
- **Authentication**: Google OAuth via Supabase Auth
- **Local Database**: PGlite with tables `expenses`, `settings`
- **Cloud Database**: Supabase PostgreSQL with automatic schema migrations
- **Real-time**: Supabase Realtime for instant cross-device updates
- **Sync Strategy**: Local-first writes, debounced cloud sync, optimistic UI

### Setup
See [SETUP_CLOUD_SYNC.md](SETUP_CLOUD_SYNC.md) for complete setup instructions.

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
16. **[AddExpenseModal.jsx](src/components/AddExpenseModal.jsx)** - Add expense modal
17. **[DeleteConfirmation.jsx](src/components/DeleteConfirmation.jsx)** - Delete confirmation

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
4. Automatic data migration from localStorage (if exists)
5. App loads with cloud-synced data

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
- ✅ Cloud synchronization with Supabase
- ✅ Google OAuth authentication
- ✅ Real-time multi-device sync
- ✅ Offline-first architecture
- ✅ Search and filter expenses
- ✅ CSV import functionality
- ✅ Automatic data migration

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
- ✅ Settings hook with dual persistence (PGlite + Supabase)
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
- Total components: 20 (17 core + 3 main views + 2 modals)
- Custom hooks: 7 (useExpenses, useAlert, useAuth, useSupabaseSync, useExpenseFilters, useSettings, useSyncContext)
- Utility modules: 6 (calculations, validators, exportHelpers, importHelpers, migration, constants)
- Calculation functions: 8 (annual, monthly, summary, totals, projection, grouping, breakdown, validation)
- Test files: 10 (comprehensive coverage for hooks, components, and utilities) ✅
- Test cases: 240+ passing tests across all modules ✅
- Total codebase: ~6000 lines (modular, optimized, test-covered, production-ready)
- ESLint: Clean, no errors
- Build size: ~280 KB (compressed: ~85 KB)
- Test coverage: Comprehensive (hooks, components, utilities, CSV import/export)

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
1. Update database schema in [supabase/migrations/](supabase/migrations/)
2. Add sync methods to [useSupabaseSync](src/hooks/useSupabaseSync.js)
3. Integrate sync callbacks in component/hook
4. Test offline behavior
5. Test multi-device synchronization

### Adding a New Component
1. Create `ComponentName.jsx` in [src/components/](src/components/)
2. Create corresponding `ComponentName.css`
3. Use CSS variables for consistent styling
4. Follow prop patterns (callbacks, not setState)
5. Add JSDoc comments
6. Export for use in App.jsx

## Debugging Tips

**Common Issues**:
1. **Supabase connection**: Check `.env` file and credentials
2. **Auth not working**: Verify Google OAuth configuration
3. **Sync failures**: Check browser console and Supabase logs
4. **RLS errors**: Verify database policies are correct
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
- [ ] Automatic data migration
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

- **Setup Guide**: [SETUP_CLOUD_SYNC.md](SETUP_CLOUD_SYNC.md)
- **Implementation Details**: [CLOUD_SYNC_IMPLEMENTATION.md](CLOUD_SYNC_IMPLEMENTATION.md)
- **Project Guide**: This file
- **Database Schema**: [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql)
