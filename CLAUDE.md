# CLAUDE.md

Personal budget tracker in Danish (da-DK) for managing fixed expenses in DKK. React SPA with offline-first PGlite storage and Google Drive sync.

## Tech Stack
React 19.1.1 • Vite 7.1.7 • Vitest 3.0.4 • @testing-library/react • PGlite 0.3.10 • @react-oauth/google • Recharts 3.2.1

## Commands
```bash
npm run dev          # Dev server (HMR)
npm run build        # Production build
npm test             # Run Vitest tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
npm run lint         # ESLint
```

## Core Concepts

**Offline-First Architecture**: PGlite (PostgreSQL in browser) as primary storage → Google Drive backup/sync
**Multi-Year Budgets**: Budget periods with complete data isolation, archived years read-only
**State Management**: Hook-based architecture (10 custom hooks)
**Language**: Danish (da-DK), comma decimal separator (1.234,56)
**Cloud Sync**: Automatic Google Drive sync (debounced 1s), 30s polling for multi-device

## Directory Structure
```
src/
├── components/  # 30+ UI components (Header, Dashboard, Modals, etc.)
├── hooks/       # 10 custom hooks (useExpenses, useAuth, useBudgetPeriods, etc.)
├── utils/       # 10 utility modules (calculations, validators, localeHelpers, etc.)
├── lib/         # External integrations (pglite.js, googleDrive.js)
└── contexts/    # React contexts (SyncContext)
```

## Hook API Reference

| Hook | Key Methods | Returns | Purpose |
|------|------------|---------|---------|
| **useExpenses** | addExpense(), updateExpense(), deleteExpense(), undo(), redo() | expenses, selectedExpenses | CRUD + undo/redo + sync |
| **useAuth** | signInWithGoogle(), signOut() | user, loading, error | Google OAuth authentication |
| **useBudgetPeriods** | createPeriod(), archivePeriod(), calculateEndingBalance() | periods, activePeriod | Multi-year management |
| **useSyncContext** | syncExpenses(), syncSettings(), loadExpenses() | syncStatus, lastSyncTime, isOnline | Centralized sync state |
| **useExpenseFilters** | setSearchText(), setFrequencyFilter(), clearFilters() | filteredExpenses, hasActiveFilters | Search & filtering |
| **useSettings** | updateSettings() | settings, loading | Settings with dual persistence |
| **useAlert** | showAlert() | alert | Notification system |
| **useDebounce** | - | debouncedValue | Debounce utility |
| **useOnlineStatus** | - | isOnline | Network detection |
| **useViewportSize** | - | width, height | Responsive layout |

## Component Map

### Core UI
- **Header** - User info, sync status, year selector
- **Auth** - Google OAuth login screen
- **Layout** - Main app layout with navigation
- **Dashboard** - Charts, stats, summary cards
- **ExpenseManager** - Expense table with inline editing
- **MonthlyView** - 12-month breakdown table
- **Settings** - Configuration and sync controls

### Modals
- **AddExpenseModal** - Add/edit expense form
- **CreateYearModal** - Create new budget year
- **DeleteConfirmation** - Confirm delete operations
- **SettingsModal** - Settings dialog
- **PaymentModeConfirmation** - Toggle payment mode
- **MonthlyAmountsModal** - Variable monthly payments
- **SwitchToFixedModal** - Switch to fixed payments
- **TemplateManagerModal** - Budget templates

### Supporting Components
- **Alert** - Toast notifications
- **ErrorBoundary** - Error handling wrapper
- **TabView** - Tabbed navigation
- **SummaryCards** - 4 budget metric cards
- **BalanceChart** - Monthly balance visualization
- **ExpensesTable** - Filterable expense table
- **YearSelector** - Year dropdown selector
- **YearComparison** - Year-over-year comparison
- **YearComparisonCharts** - Multi-year charts
- **TemplateManager** - Template CRUD
- **MonthlyCard** - Mobile monthly view card
- **ExpenseCard** - Mobile expense card
- **BottomSheet** - Mobile bottom sheet
- **BottomTabBar** - Mobile navigation
- **MonthlyOverview** - Monthly totals view

## Utils Reference

| Module | Functions | Purpose |
|--------|-----------|---------|
| **calculations.js** | 8 functions | Budget calculations (annual amounts, projections, breakdowns) |
| **validators.js** | validateAmount(), validateExpense(), sanitizeExpense() | Input validation and sanitization |
| **localeHelpers.js** | parseDanishNumber(), formatDanishNumber() | Danish locale number handling |
| **importHelpers.js** | parseCSV(), validateImport() | CSV import with validation |
| **exportHelpers.js** | generateCSV(), downloadCSV() | CSV export (UTF-8 BOM) |
| **yearComparison.js** | compareYears(), calculateYoY() | Year-over-year comparisons |
| **logger.js** | log(), error(), warn() | Logging utility |
| **uuid.js** | generateId(), isValidUUID() | UUID helpers for offline-first |
| **constants.js** | MONTH_NAMES, FREQUENCIES | App constants |
| **seed.js** | generateTestData() | Test seed data (dev only) |

## Data Schema

### PGlite Tables (Local)
```sql
budget_periods (id, user_id, year, monthly_payment, previous_balance, monthly_payments, status)
expenses (id, budget_period_id, name, amount, frequency, start_month, end_month)
```

### Cloud Storage
- **Location**: Google Drive `/BudgetTracker/budget-data.json`
- **Format**: JSON with budget_periods and expenses arrays
- **Sync**: Automatic debounced (1s delay) + 30s polling

### Key Calculations
- **Frequencies**: `monthly`, `quarterly` (Jan/Apr/Jul/Oct), `yearly`
- **Annual Amount**: Sum based on frequency and date range
- **Balance Projection**: previous_balance + income - expenses per month
- **Ending Balance**: Used for year carryover

## Common Tasks

| Task | Files | Steps |
|------|-------|-------|
| **Add Component** | `src/components/` | 1. Create Component.jsx + Component.css<br/>2. Import in App.jsx or parent component<br/>3. Add props and state management |
| **Add Hook** | `src/hooks/` | 1. Create useHookName.js<br/>2. Export hook function<br/>3. Import and use in component |
| **Update Calculation** | `src/utils/calculations.js` | 1. Modify function<br/>2. Update tests in calculations.test.js<br/>3. Verify components using it |
| **Add Cloud Sync** | `src/lib/pglite.js`<br/>`src/contexts/SyncContext.jsx` | 1. Add column to PGlite schema<br/>2. Add to JSON sync payload<br/>3. Update upload/download functions |
| **Add Test** | `src/components/*.test.jsx`<br/>`src/hooks/*.test.js` | 1. Import testing libraries<br/>2. Write test cases<br/>3. Run `npm test` |

## Development Workflow

### Authentication Setup
1. Get OAuth credentials from Google Cloud Console
2. Add to `.env`: `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_API_KEY`
3. Enable Google Drive API
4. Configure consent screen with `drive.file` scope

### Testing
```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:ui         # Vitest UI
npm run test:coverage   # Coverage report
```

### Common Issues
| Issue | Solution |
|-------|----------|
| **Sync failures** | Check `.env` credentials, verify OAuth config |
| **Token expiration** | Sessions expire after 1h, user must re-authenticate |
| **Offline mode** | All features work offline, sync resumes when online |
| **Performance** | All operations <50ms, use React DevTools Profiler |

## Quick Reference

### Stats
- **Components**: 30+ | **Hooks**: 10 | **Utils**: 10
- **Tests**: 595+ passing | **Coverage**: Comprehensive
- **Performance**: <50ms operations | **Console logs**: 22 strategic
- **Build**: ~280KB (~85KB compressed)

### Keyboard Shortcuts
- **Ctrl+N** (Cmd+N): Add expense modal
- **Ctrl+Z** (Cmd+Z): Undo
- **Ctrl+Shift+Z** (Cmd+Shift+Z): Redo
- **Enter**: Submit forms
- **Escape**: Close modals

### Frequency Logic
- **Monthly**: Every month in start-end range
- **Quarterly**: Jan/Apr/Jul/Oct in range
- **Yearly**: Single charge on startMonth

### Multi-Year Features
- Create new budget years (auto-calculate starting balance)
- Archive old years (read-only mode)
- Copy expenses between years
- Year-over-year comparison charts

## Extended Documentation

For detailed information, see:
- `docs/ARCHITECTURE.md` - Full architecture, state management, sync mechanisms
- `docs/MULTI_YEAR.md` - Complete multi-year workflows and best practices
- `docs/COMPONENTS.md` - Detailed component documentation and UI patterns
- `docs/HISTORY.md` - Project phases, improvements, and standards
