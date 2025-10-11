# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal budget tracker application for managing fixed expenses in DKK (Danish Kroner). Single-page React application built with Vite, featuring automatic cloud synchronization, real-time multi-device sync, dark mode, expense filtering, and CSV import/export.

**Technology Stack**:
- React 19.1.1 with Hooks
- Vite 7.1.7 (build tool with HMR)
- ESLint 9.36.0 (code quality)
- Recharts 3.2.1 (charting library)
- React Modal 3.16.3 (modal dialogs)
- Supabase 2.74.0 (cloud sync & authentication)
- PGlite 0.3.10 (local PostgreSQL - future)

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
│   │   ├── Layout.jsx/css # App layout (future)
│   │   ├── Dashboard.jsx/css # Dashboard view (future)
│   │   ├── ExpenseManager.jsx/css # Expense management (future)
│   │   └── MonthlyView.jsx/css # Monthly view (future)
│   ├── hooks/               # Custom React hooks
│   │   ├── useExpenses.js  # Expense CRUD + undo/redo + sync ✅
│   │   ├── useAlert.js     # Alert notifications
│   │   ├── useLocalStorage.js # Storage operations
│   │   ├── useAuth.js      # Authentication ✅
│   │   ├── useSupabaseSync.js # Automatic cloud sync ✅
│   │   ├── useTheme.js     # Dark/light mode ✅
│   │   ├── useExpenseFilters.js # Search & filtering ✅
│   │   └── useSettings.js  # Settings management (future)
│   ├── lib/                # External integrations
│   │   ├── supabase.js    # Supabase client ✅
│   │   ├── pglite.js      # PGlite database (future)
│   │   └── sync.js        # Sync logic (future)
│   ├── utils/              # Pure utility functions
│   │   ├── constants.js    # App constants
│   │   ├── calculations.js # Budget calculations
│   │   ├── validators.js   # Input validation
│   │   ├── exportHelpers.js # CSV export logic
│   │   ├── importHelpers.js # CSV import logic ✅
│   │   └── migration.js    # Data migration ✅
│   ├── App.jsx            # Main app orchestration with auth wrapper ✅
│   ├── App.css            # Comprehensive styling with dark mode ✅
│   ├── index.css          # Global styles with theme variables ✅
│   └── main.jsx           # React entry point
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql # Database schema ✅
├── public/              # Static assets
├── .env.example         # Example environment variables ✅
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite configuration
├── eslint.config.js     # ESLint rules
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

- **`useTheme()`**: Dark/light mode management ✅
  - `theme`: Current theme ('light' or 'dark')
  - `toggleTheme()`: Switch between themes
  - `isDark`, `isLight`: Boolean helpers
  - System preference detection
  - LocalStorage persistence

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

- **`useLocalStorage()`**: Generic localStorage operations
  - `savedData`: Current saved state
  - `saveData()`, `loadData()`, `clearData()`: Storage operations with error handling

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
- **Cloud Storage** ([hooks/useSupabaseSync.js](src/hooks/useSupabaseSync.js)): ✅
  - **Database tables**: `expenses`, `settings` with Row Level Security
  - **Automatic sync**: Debounced (1 second delay) after changes
  - **Real-time updates**: Multi-device sync via Supabase realtime
  - **Offline-first**: Works without internet, syncs when reconnected

- **Local Storage** ([hooks/useLocalStorage.js](src/hooks/useLocalStorage.js)):
  - **LocalStorage key**: `budgetData2025`
  - **Backup**: Used before cloud migration
  - **Export**: CSV with UTF-8 BOM for Excel compatibility

**Data Migration** ([utils/migration.js](src/utils/migration.js)): ✅
- Automatic localStorage → Supabase migration on first login
- One-time migration with backup creation
- Restore capability if needed

**CSV Import/Export** ([utils/importHelpers.js](src/utils/importHelpers.js), [utils/exportHelpers.js](src/utils/exportHelpers.js)): ✅
- **Import**: Parse CSV files with validation and duplicate detection
- **Export**: Generate CSV with UTF-8 BOM for Excel compatibility
- **Format**: Expense summary + monthly breakdown + settings

## Cloud Synchronization ✅

### Features
- **Automatic Sync**: Changes sync to cloud within 1 second
- **Real-time Multi-Device**: Updates appear on all devices instantly
- **Offline-First**: Full functionality without internet connection
- **Conflict Resolution**: Last-write-wins strategy
- **Row Level Security**: User data isolation at database level

### Architecture
- **Authentication**: Google OAuth via Supabase Auth
- **Database**: PostgreSQL with automatic schema migrations
- **Real-time**: Supabase Realtime for instant updates
- **Sync Strategy**: Debounced writes, optimistic UI updates

### Setup
See [SETUP_CLOUD_SYNC.md](SETUP_CLOUD_SYNC.md) for complete setup instructions.

## UI Components & Features

### Component Overview

**Core UI Components**:
1. **[Header.jsx](src/components/Header.jsx)** - App header with user info and sync status ✅
2. **[Auth.jsx](src/components/Auth.jsx)** - Google OAuth login screen ✅
3. **[TabView.jsx](src/components/TabView.jsx)** - Tabbed navigation with dropdown
4. **[SummaryCards.jsx](src/components/SummaryCards.jsx)** - 4 budget summary cards
5. **[Alert.jsx](src/components/Alert.jsx)** - Notification system
6. **[ErrorBoundary.jsx](src/components/ErrorBoundary.jsx)** - Error handling

**Tab Content Components**:
7. **[BalanceChart.jsx](src/components/BalanceChart.jsx)** - Balance visualization
8. **[ExpenseDistribution.jsx](src/components/ExpenseDistribution.jsx)** - Expense charts
9. **[ExpensesTable.jsx](src/components/ExpensesTable.jsx)** - Expenses table with filtering ✅
10. **[MonthlyOverview.jsx](src/components/MonthlyOverview.jsx)** - 12-month breakdown
11. **[Settings.jsx](src/components/Settings.jsx)** - Settings with sync status ✅

**Modal Components**:
12. **[AddExpenseModal.jsx](src/components/AddExpenseModal.jsx)** - Add expense modal
13. **[DeleteConfirmation.jsx](src/components/DeleteConfirmation.jsx)** - Delete confirmation

### New Features ✅

**Dark Mode** ([useTheme](src/hooks/useTheme.js)):
- Toggle button in header
- System preference detection
- Smooth transitions
- LocalStorage persistence

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

**Theme Toggle** ✅:
- Click theme toggle button in header
- Switch between light and dark mode
- System preference auto-detected on first use
- Preference saved to localStorage

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
- **Light Mode**:
  - Primary gradient: `#667eea` → `#764ba2` (purple)
  - Success: `#10b981` (green)
  - Error: `#ef4444` (red)
  - Background: `#f9fafb`

- **Dark Mode**: ✅
  - Primary gradient: `#7c3aed` → `#a855f7` (purple)
  - Success: `#34d399` (green)
  - Error: `#f87171` (red)
  - Background: `#1f2937`

**CSS Variables**:
```css
[data-theme="light"] {
  --bg-primary: #f9fafb;
  --text-primary: #1f2937;
  /* ... */
}

[data-theme="dark"] {
  --bg-primary: #1f2937;
  --text-primary: #f9fafb;
  /* ... */
}
```

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
- ✅ Custom hooks (useExpenses, useAlert, useLocalStorage)
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
- ✅ Dark mode support
- ✅ Search and filter expenses
- ✅ CSV import functionality
- ✅ Automatic data migration

**Current Metrics**:
- Total components: 17 (15 core + 2 modals)
- Custom hooks: 8 (useExpenses, useAlert, useLocalStorage, useAuth, useSupabaseSync, useTheme, useExpenseFilters, useSettings)
- Utility modules: 5 (calculations, validators, exportHelpers, importHelpers, constants)
- Total codebase: ~3500 lines (modular, maintainable, feature-rich)
- ESLint: Clean, no errors
- Build size: ~280 KB (compressed: ~85 KB)

## Future Enhancements

**Phase 4 - Advanced Features** (pending):
- Multi-year comparison and historical analysis
- Budget forecasting with predictive analytics
- Expense categories with color coding
- Enhanced chart interactivity
- Export to PDF with charts
- Email notifications

**Phase 5 - Collaboration** (pending):
- Expense sharing between users
- Budget templates and sharing
- Collaborative budget planning
- Family budget management

**Phase 6 - Mobile** (pending):
- Progressive Web App (PWA) support
- Mobile app (React Native)
- Push notifications
- Mobile-optimized charts

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
3. Add dark mode styles with CSS variables
4. Follow prop patterns (callbacks, not setState)
5. Add JSDoc comments
6. Export for use in App.jsx

## Debugging Tips

**Common Issues**:
1. **Supabase connection**: Check `.env` file and credentials
2. **Auth not working**: Verify Google OAuth configuration
3. **Sync failures**: Check browser console and Supabase logs
4. **RLS errors**: Verify database policies are correct
5. **Dark mode issues**: Check CSS variable definitions
6. **Filter not working**: Verify filter logic in useExpenseFilters

**Debugging Strategy**:
- **Pure functions**: Easy to test in isolation
- **Hook debugging**: Use React DevTools to inspect state
- **Cloud sync**: Check browser console for sync logs
- **Error boundary**: Check console for caught errors
- **Network issues**: Use browser DevTools Network tab

**Testing Checklist**:
- [ ] Google OAuth login/logout
- [ ] Automatic data migration
- [ ] Cloud sync (add/edit/delete)
- [ ] Multi-device sync
- [ ] Offline operation
- [ ] Dark mode toggle
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
