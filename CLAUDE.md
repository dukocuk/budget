# CLAUDE.md

Personal budget tracker in Danish (da-DK) for managing fixed expenses in DKK. React SPA with offline-first PGlite storage and Google Drive sync.

## Tech Stack
React 19.1.1 • Vite 7.1.7 • Vitest 3.2.4 • @testing-library/react • PGlite 0.3.10 • @react-oauth/google • Recharts 3.2.1

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
**State Management**: Context-based architecture with 6 centralized providers (ExpenseProvider, BudgetPeriodProvider, ModalProvider, SyncContext, AlertProvider, LoadingProvider)
**Language**: Danish (da-DK), comma decimal separator (1.234,56)
**Cloud Sync**: Automatic Google Drive sync (debounced 1s), 30s polling for multi-device

## Directory Structure
```
src/
├── components/         # 36 components organized in 7 subdirectories
│   ├── cards/          # 3 components: SummaryCards, MonthlyCard, ExpenseCard
│   ├── charts/         # 2 components: BalanceChart, YearComparisonCharts
│   ├── common/         # 13 components: Alert, ErrorBoundary, TabView, FormField, SettingsCard, etc.
│   ├── core/           # 4 components: Auth, Dashboard, Header, Layout
│   ├── features/       # 3 components: ExpenseManager, Settings, TemplateManager
│   ├── modals/         # 9 components: All modal dialogs and confirmations
│   └── tables/         # 2 components: ExpensesTable, MonthlyView
├── hooks/              # 20 hooks (10 core + 10 consumer/utility)
├── utils/              # 10 utility modules (calculations, validators, localeHelpers, etc.)
├── lib/                # External integrations (pglite.js, googleDrive.js)
└── contexts/           # 6 React contexts (.js) and providers (.jsx)
```

## Hook API Reference

| Hook | Key Methods | Returns | Purpose |
|------|------------|---------|---------|
| **useExpenses** | addExpense(), updateExpense(), deleteExpense(), undo(), redo() | expenses, selectedExpenses | CRUD + undo/redo + sync |
| **useAuth** | signInWithGoogle(), signOut() | user, loading, error | Google OAuth authentication |
| **useBudgetPeriods** | createPeriod(), archivePeriod(), calculateEndingBalance() | periods, activePeriod | Multi-year management |
| **useSyncContext** | syncExpenses(), syncSettings(), loadExpenses() | syncStatus, lastSyncTime, isOnline | Centralized sync state |
| **useExpenseFilters** | setSearchText(), setFrequencyFilter(), clearFilters() | filteredExpenses, hasActiveFilters | Search & filtering |
| **useAlertContext** | showAlert() | alert, hideAlert | Alert context consumer |
| **useDebounce** | - | debouncedValue | Debounce utility |
| **useOnlineStatus** | - | isOnline | Network detection |
| **useViewportSize** | - | width, height | Responsive layout |
| **useExpenseContext** | - | expenses, addExpense, updateExpense, deleteExpense | Expense context consumer |
| **useBudgetPeriodContext** | - | periods, activePeriod, createPeriod | Budget period context consumer |
| **useModal** | - | openModal, closeModal | Modal context consumer |
| **useLoadingContext** | - | loading, loadingStage, progress | Loading state access |
| **useDataInitialization** | initializeData() | isInitialized, error | Cloud data initialization |
| **useDeleteConfirmation** | confirmDelete() | showConfirmation, handleDelete | Delete confirmation logic |
| **useKeyboardShortcuts** | registerShortcut() | shortcuts | Keyboard shortcut management |
| **useCSVOperations** | importCSV(), exportCSV() | isProcessing | CSV import/export |
| **useYearManagement** | createYear(), archiveYear() | years | Multi-year operations |
| **useSettingsHandlers** | handleChange() | handlers | Settings handlers |

## Centralized State Management

The app uses a **context-based architecture** with 6 core providers for centralized state management:

### Provider Hierarchy
```
App (useAuth)
└─ LoadingProvider
   └─ SyncProvider (user)
      └─ BudgetPeriodProvider (userId)
         └─ AlertProvider
            └─ ModalProvider
               └─ ExpenseProvider (userId, periodId)
                  └─ AppContent
```

### Context Providers

| Provider | State Managed | Consumer Hook | Purpose |
|----------|--------------|---------------|---------|
| **ExpenseProvider** | expenses, selectedExpenses, loading, canUndo, canRedo | useExpenseContext() | Expense CRUD + undo/redo + bulk operations |
| **BudgetPeriodProvider** | periods, activePeriod, loading, error | useBudgetPeriodContext() | Multi-year budget management |
| **ModalProvider** | Modal open/close states for all modals | useModal() | Centralized modal coordination |
| **SyncContext** | syncStatus, lastSyncTime, isOnline | useSyncContext() | Cloud sync orchestration |
| **AlertProvider** | alert, showAlert, hideAlert | useAlertContext() | Toast notification system |
| **LoadingProvider** | loading, loadingStage, progress | useLoadingContext() | Unified loading state (auth→budget→data→complete) |

### Key Patterns

**1. Context + Consumer Hook Pattern**
```javascript
// ✅ Correct: Always use consumer hooks
import { useExpenseContext } from '../hooks/useExpenseContext';

function MyComponent() {
  const { expenses, addExpense } = useExpenseContext();
  // Component logic
}

// ❌ Wrong: Never bypass providers
import { useExpenses } from '../hooks/useExpenses'; // Don't call directly!
```

**2. Provider Dependencies**
- ExpenseProvider requires `activePeriod.id` from BudgetPeriodProvider (for year filtering)
- All providers depend on `userId` from authentication
- ModalProvider is independent and can be used anywhere in the tree

**3. State Scope**
- **Centralize**: Cross-component state (expenses, periods, modals, sync)
- **Keep Local**: Transient UI state (form inputs, search filters, debounced values)

**4. Context/Provider Separation**
- Contexts defined in `.js` files (ExpenseContext.js, BudgetPeriodContext.js, etc.)
- Providers implemented in `.jsx` files (ExpenseProvider.jsx, BudgetPeriodProvider.jsx, etc.)
- Separation enables React Fast Refresh for better dev experience

## Component Map

### Core (core/)
- **Auth** - Google OAuth login screen
- **Dashboard** - Charts, stats, summary cards
- **Header** - User info, sync status, year selector
- **Layout** - Main app layout with navigation

### Features (features/)
- **ExpenseManager** - Expense table with inline editing
- **Settings** - Configuration and sync controls
- **TemplateManager** - Template CRUD

### Tables (tables/)
- **ExpensesTable** - Filterable expense table
- **MonthlyView** - 12-month breakdown table

### Charts (charts/)
- **BalanceChart** - Monthly balance visualization
- **YearComparisonCharts** - Multi-year charts

### Cards (cards/)
- **SummaryCards** - 4 budget metric cards
- **MonthlyCard** - Mobile monthly view card
- **ExpenseCard** - Mobile expense card

### Modals (modals/)
- **AddExpenseModal** - Add/edit expense form
- **CreateYearModal** - Create new budget year
- **DeleteConfirmation** - Confirm delete operations
- **SettingsModal** - Settings dialog
- **PaymentModeConfirmation** - Toggle payment mode
- **MonthlyAmountsModal** - Variable monthly payments
- **SwitchToFixedModal** - Switch to fixed payments
- **TemplateManagerModal** - Budget templates
- **BackupManagerModal** - List, preview, restore backups

### Common (common/)
- **Alert** - Toast notifications
- **ErrorBoundary** - Error handling wrapper
- **TabView** - Tabbed navigation
- **YearSelector** - Year dropdown selector
- **YearComparison** - Year-over-year comparison
- **BottomSheet** - Mobile bottom sheet
- **BottomTabBar** - Mobile navigation
- **UnifiedLoadingScreen** - Unified loading with progress stages
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
| **uuid.js** | generateId() | UUID helpers for offline-first |
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
1. Follow comprehensive guide: `docs/OAUTH_GUIDE.md`
2. Create `.env` with: `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_SECRET`, `VITE_GOOGLE_API_KEY`
3. Enable Google Drive API and Google+ API in Cloud Console
4. Configure consent screen with required scopes (`drive.file`, `userinfo.profile`, `userinfo.email`)
5. Add authorized redirect URIs: `http://localhost:5173` (development)
6. Add test users for development testing

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
- **Components**: 36 | **Hooks**: 20 | **Utils**: 10
- **Tests**: 998 passing | **Coverage**: Comprehensive
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
- `PROJECT_INDEX.md` - Comprehensive project structure and component reference
- `docs/ARCHITECTURE.md` - Full architecture, state management, sync mechanisms
- `docs/MULTI_YEAR.md` - Complete multi-year workflows and best practices
- `docs/COMPONENTS.md` - Detailed component documentation (32 components in 7 subdirectories)
- `docs/COMPONENT_ORGANIZATION.md` - Guide for organizing and adding new components
- `docs/HOOKS_REFERENCE.md` - Complete hooks documentation (20 hooks categorized)
- `docs/OAUTH_GUIDE.md` - OAuth setup, troubleshooting, and security guide
- `docs/HISTORY.md` - Project phases, improvements, and standards
