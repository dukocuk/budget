# Budget Tracker - Project Summary for Serena

## Project Identity
- **Name**: Personal Budget Tracker
- **Language**: TypeScript/JavaScript (React)
- **Framework**: React 19.1.1 + Vite 7.1.7
- **Architecture**: Single-page application with offline-first design
- **Domain**: Personal finance management (Danish Kroner)

## Core Architecture

### Technology Stack
- **Frontend**: React 19.1.1 with Hooks
- **Build Tool**: Vite 7.1.7 (HMR enabled)
- **Testing**: Vitest 3.0.4 + React Testing Library + happy-dom
- **Database**:
  - Local: PGlite 0.3.10 (PostgreSQL in browser)
  - Cloud: Supabase 2.74.0 (sync + auth)
- **Charting**: Recharts 3.2.1
- **UI**: React Modal 3.16.3
- **Quality**: ESLint 9.36.0

### Data Architecture
**Offline-First Design**:
- Primary storage: PGlite (local PostgreSQL database)
- Cloud backup: Supabase PostgreSQL
- Sync strategy: Local-first writes, debounced cloud sync (1 second)
- Real-time: Multi-device synchronization via Supabase Realtime
- Authentication: Google OAuth via Supabase Auth

### Multi-Year Budget Periods
- Each budget year is a separate "budget period"
- Complete data isolation per year
- Active vs archived status (read-only when archived)
- Intelligent balance carryover between years
- UUID-based for offline-first support

## Project Structure

### Component Organization (24+ components)
**Core UI Components**:
- Alert.jsx - Notification system
- Auth.jsx - Google OAuth login
- Header.jsx - App header with user info & sync status
- Layout.jsx - Main app layout with navigation
- TabView.jsx - Tabbed navigation system
- SummaryCards.jsx - Budget summary cards
- ErrorBoundary.jsx - Error handling wrapper

**Main View Components**:
- Dashboard.jsx - Overview with charts and statistics
- ExpenseManager.jsx - Inline expense editing
- MonthlyView.jsx - 12-month breakdown table
- ExpensesTable.jsx - Expenses table with filtering
- MonthlyOverview.jsx - Monthly overview
- Settings.jsx - Settings with sync status

**Chart Components**:
- BalanceChart.jsx - Monthly balance visualization
- ExpenseDistribution.jsx - Expense breakdown charts
- YearComparisonCharts.jsx - Multi-year visualization

**Modal Components**:
- AddExpenseModal.jsx - Add/edit expense dialog
- DeleteConfirmation.jsx - Delete confirmation
- CreateYearModal.jsx - Create new budget year
- PaymentModeConfirmation.jsx - Payment mode toggle
- SettingsModal.jsx - Settings dialog

**Year Management**:
- YearSelector.jsx - Budget year dropdown selector
- YearComparison.jsx - Year-over-year comparison
- TemplateManager.jsx - Budget template CRUD

### Custom Hooks (8 hooks)
1. **useExpenses(userId, periodId)** - Expense CRUD + undo/redo + cloud sync
2. **useAlert()** - Centralized notification system
3. **useAuth()** - Authentication management
4. **useBudgetPeriods(userId)** - Multi-year budget period management
5. **useDebounce(value, delay)** - Debounce utility
6. **useExpenseFilters()** - Search and filtering logic
7. **useOnlineStatus()** - Online/offline detection
8. **useSettings(userId, periodId)** - Settings with dual persistence

### Utility Modules (6 modules)
1. **calculations.js** - 8 pure calculation functions
   - calculateAnnualAmount()
   - getMonthlyAmount()
   - calculateSummary()
   - calculateMonthlyTotals()
   - calculateBalanceProjection()
   - groupExpensesByFrequency()
   - calculateMonthlyBreakdownByFrequency()
   - validateExpense()

2. **validators.js** - Input validation and sanitization
3. **exportHelpers.js** - CSV export with UTF-8 BOM
4. **importHelpers.js** - CSV import with validation
5. **seed.js** - Test seed data (development only)
6. **constants.js** - Application constants

### Database Schema (4 migrations)
1. **001_initial_schema.sql** - Initial tables (expenses, settings) + RLS
2. **002_monthly_payments.sql** - Variable monthly payments (JSONB)
3. **003_budget_periods.sql** - Multi-year budget periods
4. **004_budget_templates.sql** - Budget templates

### Key Database Tables
- **expenses**: Individual expense records (linked to budget_period_id)
- **budget_periods**: Budget years with settings and status
- **settings**: User preferences (deprecated, moved to budget_periods)
- **budget_templates**: Reusable budget templates

## Development Workflow

### Essential Commands
```bash
npm run dev          # Development server (localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint code quality
npm test             # Run Vitest tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
npm run test:ui      # UI mode
```

### Testing Strategy
- **Framework**: Vitest 3.0.4 with happy-dom
- **Component Testing**: React Testing Library
- **Test Files**: 17+ comprehensive test files
- **Test Cases**: 240+ passing tests
- **Coverage**: Hooks, components, utilities, CSV import/export

### Code Quality Standards
- **Linting**: ESLint 9.36.0 with React Hooks rules
- **Architecture**: Component-based modular design
- **Principles**: SOLID, DRY, KISS, YAGNI
- **Testing**: TDD for utilities and hooks
- **Documentation**: JSDoc comments for all functions

## Business Logic

### Expense Model
```javascript
{
  id: UUID,
  name: string,
  amount: number (kr.),
  frequency: 'monthly' | 'quarterly' | 'yearly',
  startMonth: 1-12,
  endMonth: 1-12,
  budget_period_id: UUID
}
```

### Frequency Types
- **monthly**: Charged every month within start/end range
- **quarterly**: Charged on months 1, 4, 7, 10 within start/end range
- **yearly**: Single charge on startMonth

### Budget Period Model
```javascript
{
  id: UUID,
  user_id: UUID,
  year: integer (2000-2100),
  monthly_payment: decimal,
  previous_balance: decimal,
  monthly_payments: JSONB (variable payments),
  status: 'active' | 'archived',
  created_at: timestamp,
  updated_at: timestamp
}
```

## Key Features

### Cloud Synchronization
- **Debounced Sync**: 1-second delay to prevent spam
- **Real-time Updates**: Supabase Realtime for multi-device
- **Conflict Resolution**: Last-write-wins strategy
- **Offline Support**: Full functionality without internet
- **RLS**: Row Level Security for user data isolation

### Search & Filtering
- Text search across expense names
- Filter by frequency (monthly/quarterly/yearly)
- Filter by active month
- Clear filters functionality
- Active filter count indicator

### CSV Import/Export
- **Import**: Parse CSV with validation and duplicate detection
- **Export**: UTF-8 BOM for Excel compatibility
- **Format**: Expense summary + monthly breakdown + settings
- **Filename**: `budget_YYYY_YYYY-MM-DD.csv`

### Multi-Year Management
- Create new budget years with balance carryover
- Archive old years (read-only mode)
- Year-over-year comparison
- Copy expenses from previous year
- Historical data retention

### Undo/Redo
- Full history tracking for expense operations
- Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Shift+Z (redo)
- Supports add, update, delete operations

## Language & Localization
- **Language**: Entirely in Danish (da-DK)
- **Currency**: Danish Kroner (kr.)
- **Month Names**: Danish abbreviations
- **Date Format**: da-DK locale

## Performance Metrics
- **Total Lines**: ~8000+ lines
- **Build Size**: ~280 KB (compressed: ~85 KB)
- **Bundle**: Optimized with Vite
- **Performance**: React.useMemo for expensive calculations
- **Rendering**: Memoized chart components

## Common Patterns

### State Management Pattern
- Custom hooks for reusable logic
- React Context for global state (SyncContext)
- Local state for UI-only concerns
- PGlite for persistent local data

### Error Handling Pattern
- Try-catch blocks in async operations
- ErrorBoundary for component-level errors
- User-friendly error messages via Alert
- Console logging for debugging

### Sync Pattern
```javascript
// Local-first write
await db.exec(insertQuery);
// Debounced cloud sync
debouncedSyncExpenses(expenses);
```

### Testing Pattern
```javascript
// Component tests
render(<Component {...props} />);
await userEvent.click(button);
expect(screen.getByText('...')).toBeInTheDocument();

// Hook tests
const { result } = renderHook(() => useHook());
act(() => result.current.action());
expect(result.current.state).toBe(expected);

// Utility tests
expect(calculateFunction(input)).toBe(expected);
```

## Known Issues & Solutions
- **Migration needed**: Call `migrateToBudgetPeriods(userId)` after upgrade
- **Year uniqueness**: Unique constraint on (user_id, year)
- **RLS policies**: Verify Supabase policies for all tables
- **Read-only mode**: Pass `isReadOnly` prop to components
- **Balance carryover**: Verify `calculateEndingBalance()` includes JSONB payments

## Future Roadmap
- **Phase 7**: Advanced analytics with predictive forecasting
- **Phase 8**: Collaboration features and sharing
- **Phase 9**: PWA support and mobile app

## Development Best Practices
1. **Think Before Build**: Understand → Plan → Build
2. **MVP First**: Start simple, iterate based on feedback
3. **Test Coverage**: Write tests for new features
4. **Error Handling**: Consistent try-catch patterns
5. **User Confirmations**: For destructive actions
6. **Accessibility**: ARIA labels and keyboard support
7. **Danish Language**: Maintain consistency
8. **Cloud Sync**: Consider sync implications for new features

## Symbol Operations Reference
Key functions/classes that may need renaming or refactoring:
- `useExpenses` - Core expense management hook
- `useBudgetPeriods` - Budget period management hook
- `calculateAnnualAmount` - Main calculation function
- `SyncContext` - Global sync state provider
- `pglite.js` - Database initialization and migrations

## Quick Navigation
- **Main Entry**: src/main.jsx → App.jsx → Layout.jsx
- **State**: src/hooks/ (all custom hooks)
- **Logic**: src/utils/calculations.js (pure functions)
- **DB**: src/lib/pglite.js (local), src/lib/supabase.js (cloud)
- **Tests**: src/**/*.test.js(x)
- **Migrations**: supabase/migrations/*.sql

## Environment Variables Required
See `.env.example` for complete list:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
