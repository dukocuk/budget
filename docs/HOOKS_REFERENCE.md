# Hooks Reference Documentation

**Total Hooks**: 20 custom React hooks
**Categories**: 10 core business logic hooks + 5 context consumer hooks + 5 utility hooks
**Last Updated**: 2025-01-30

---

## Table of Contents
1. [Core Business Logic Hooks](#core-business-logic-hooks) (10)
2. [Context Consumer Hooks](#context-consumer-hooks) (5)
3. [Utility Hooks](#utility-hooks) (5)
4. [Usage Patterns](#usage-patterns)
5. [Testing](#testing)

---

## Core Business Logic Hooks

These hooks contain primary business logic and state management.

### 1. useExpenses
**Path**: `src/hooks/useExpenses.js`
**Purpose**: Expense CRUD operations with undo/redo support and cloud sync
**Category**: Core state management

**Returns**:
```javascript
{
  expenses: Array<Expense>,         // All expenses for active budget period
  loading: boolean,                 // Loading state
  error: string | null,             // Error message
  canUndo: boolean,                 // Undo available
  canRedo: boolean,                 // Redo available

  // Methods
  addExpense: (expense) => Promise<void>,
  updateExpense: (id, updates) => Promise<void>,
  deleteExpense: (id) => Promise<void>,
  bulkDelete: (ids[]) => Promise<void>,
  undo: () => void,
  redo: () => void,
}
```

**Key Features**:
- CRUD operations with optimistic updates
- Undo/redo stack (10 operations)
- Automatic cloud sync (debounced 1s)
- Offline-first with PGlite storage
- Bulk operations support

**Example**:
```javascript
const { expenses, addExpense, deleteExpense, undo } = useExpenses();

// Add new expense
await addExpense({
  name: 'Netflix',
  amount: 99,
  frequency: 'monthly',
  startMonth: 1,
  endMonth: 12,
});

// Undo last operation
undo();
```

---

### 2. useAuth
**Path**: `src/hooks/useAuth.js`
**Purpose**: Google OAuth authentication state and methods
**Category**: Authentication

**Returns**:
```javascript
{
  user: Object | null,              // Authenticated user object
  loading: boolean,                 // Auth operation in progress
  loadingState: {
    isLoading: boolean,
    stage: string,                  // 'initializing' | 'verifying' | 'connecting' | 'complete' | 'error'
    progress: number,               // 0-100
  },
  error: string | null,             // Auth error message

  // Methods
  handleGoogleSignIn: (response) => Promise<void>,
  signOut: () => void,
  retryAuth: () => void,
}
```

**Key Features**:
- Authorization code flow with refresh tokens
- Automatic token refresh
- Session persistence
- Multi-stage loading UI
- Error recovery

**Example**:
```javascript
const { user, loading, signOut } = useAuth();

if (loading) return <LoadingScreen />;
if (!user) return <Auth />;

return (
  <div>
    <p>Welcome {user.name}</p>
    <button onClick={signOut}>Sign Out</button>
  </div>
);
```

---

### 3. useBudgetPeriods
**Path**: `src/hooks/useBudgetPeriods.js`
**Purpose**: Multi-year budget period management
**Category**: Core state management

**Returns**:
```javascript
{
  periods: Array<BudgetPeriod>,     // All budget periods (years)
  activePeriod: BudgetPeriod | null, // Currently selected year
  loading: boolean,
  error: string | null,

  // Methods
  createPeriod: (year, options) => Promise<void>,
  archivePeriod: (id) => Promise<void>,
  setActivePeriod: (id) => void,
  calculateEndingBalance: (periodId) => number,
}
```

**Key Features**:
- Multi-year budget isolation
- Archive old years (read-only)
- Automatic balance carryover
- Copy expenses between years
- Year-over-year comparisons

**Example**:
```javascript
const { periods, activePeriod, createPeriod } = useBudgetPeriods();

// Create new budget year
await createPeriod(2026, {
  copyExpensesFrom: activePeriod.id,
  startingBalance: activePeriod.endingBalance,
});
```

---

### 4. useSyncContext
**Path**: `src/hooks/useSyncContext.js`
**Purpose**: Cloud synchronization state and operations
**Category**: Sync orchestration

**Returns**:
```javascript
{
  syncStatus: 'idle' | 'syncing' | 'error',
  lastSyncTime: Date | null,
  isOnline: boolean,

  // Methods
  syncExpenses: () => Promise<void>,
  syncSettings: () => Promise<void>,
  loadExpenses: () => Promise<Array<Expense>>,
  uploadToCloud: () => Promise<void>,
  downloadFromCloud: () => Promise<Object>,
}
```

**Key Features**:
- Centralized sync coordination
- Debounced uploads (1s delay)
- Polling for multi-device sync (30s intervals)
- Conflict resolution
- Offline queue

**Example**:
```javascript
const { syncStatus, lastSyncTime, syncExpenses } = useSyncContext();

return (
  <div>
    <span>Status: {syncStatus}</span>
    <span>Last sync: {lastSyncTime?.toLocaleString()}</span>
    <button onClick={syncExpenses}>Sync Now</button>
  </div>
);
```

---

### 5. useExpenseFilters
**Path**: `src/hooks/useExpenseFilters.js`
**Purpose**: Expense search and filtering logic
**Category**: Data filtering

**Returns**:
```javascript
{
  filteredExpenses: Array<Expense>, // Filtered expense list
  filters: {
    searchText: string,
    frequency: string | null,       // 'monthly' | 'quarterly' | 'yearly'
    startMonth: number | null,
    endMonth: number | null,
  },
  hasActiveFilters: boolean,

  // Methods
  setSearchText: (text) => void,
  setFrequencyFilter: (freq) => void,
  setMonthRange: (start, end) => void,
  clearFilters: () => void,
}
```

**Key Features**:
- Real-time text search
- Multiple filter criteria
- Debounced search (300ms)
- Filter persistence

**Example**:
```javascript
const { filteredExpenses, setSearchText, clearFilters } = useExpenseFilters();

return (
  <div>
    <input onChange={(e) => setSearchText(e.target.value)} />
    <ExpenseTable expenses={filteredExpenses} />
    <button onClick={clearFilters}>Clear Filters</button>
  </div>
);
```

---

### 6. useCSVOperations
**Path**: `src/hooks/useCSVOperations.js`
**Purpose**: CSV import/export operations
**Category**: Data operations

**Returns**:
```javascript
{
  isProcessing: boolean,
  error: string | null,

  // Methods
  importCSV: (file) => Promise<{imported: number, errors: Array}>,
  exportCSV: (expenses) => void,
  validateCSV: (file) => Promise<{valid: boolean, errors: Array}>,
}
```

**Key Features**:
- UTF-8 BOM encoding for Excel compatibility
- Danish locale number parsing (1.234,56)
- Validation before import
- Error reporting
- Progress tracking

**Example**:
```javascript
const { importCSV, exportCSV, isProcessing } = useCSVOperations();

const handleImport = async (file) => {
  const result = await importCSV(file);
  console.log(`Imported ${result.imported} expenses`);
};

const handleExport = () => {
  exportCSV(expenses); // Downloads CSV file
};
```

---

### 7. useDataInitialization
**Path**: `src/hooks/useDataInitialization.js`
**Purpose**: Initialize application data from cloud on first load
**Category**: Data initialization

**Returns**:
```javascript
{
  isInitialized: boolean,
  loading: boolean,
  error: string | null,

  // Methods
  initializeData: () => Promise<void>,
  resetInitialization: () => void,
}
```

**Key Features**:
- One-time cloud data fetch
- Populates local PGlite database
- Handles first-time users
- Error recovery
- Progress reporting

**Example**:
```javascript
const { isInitialized, loading, initializeData } = useDataInitialization();

useEffect(() => {
  if (user && !isInitialized) {
    initializeData();
  }
}, [user]);
```

---

### 8. useDeleteConfirmation
**Path**: `src/hooks/useDeleteConfirmation.js`
**Purpose**: Generic delete confirmation logic
**Category**: UI logic

**Returns**:
```javascript
{
  showConfirmation: boolean,
  itemToDelete: any,

  // Methods
  confirmDelete: (item, message) => Promise<boolean>,
  handleDelete: () => void,
  cancelDelete: () => void,
}
```

**Key Features**:
- Reusable confirmation pattern
- Custom warning messages
- Promise-based resolution
- Keyboard shortcut support (Enter/Escape)

**Example**:
```javascript
const { confirmDelete } = useDeleteConfirmation();

const handleDeleteExpense = async (expense) => {
  const confirmed = await confirmDelete(
    expense,
    `Slet udgift "${expense.name}"?`
  );

  if (confirmed) {
    await deleteExpense(expense.id);
  }
};
```

---

### 9. useKeyboardShortcuts
**Path**: `src/hooks/useKeyboardShortcuts.js`
**Purpose**: Global keyboard shortcut management
**Category**: UI utilities

**Returns**:
```javascript
{
  shortcuts: Array<Shortcut>,

  // Methods
  registerShortcut: (key, modifier, handler) => void,
  unregisterShortcut: (key) => void,
  getShortcut: (key) => Shortcut | null,
}
```

**Key Features**:
- Global shortcut registration
- Modifier key support (Ctrl, Cmd, Shift)
- Automatic cleanup
- Conflict prevention

**Example**:
```javascript
const { registerShortcut } = useKeyboardShortcuts();

useEffect(() => {
  registerShortcut('n', 'ctrl', () => openAddExpenseModal());
  registerShortcut('z', 'ctrl', () => undo());
  registerShortcut('z', 'ctrl+shift', () => redo());
}, []);
```

---

### 10. useYearManagement
**Path**: `src/hooks/useYearManagement.js`
**Purpose**: Multi-year budget operations (high-level)
**Category**: Multi-year management

**Returns**:
```javascript
{
  years: Array<number>,             // List of all budget years
  currentYear: number,

  // Methods
  createYear: (year, options) => Promise<void>,
  archiveYear: (year) => Promise<void>,
  switchYear: (year) => void,
  copyExpenses: (fromYear, toYear) => Promise<void>,
}
```

**Key Features**:
- Simplified year operations
- Wrapper around useBudgetPeriods
- Year validation
- Expense copying

**Example**:
```javascript
const { years, createYear, archiveYear } = useYearManagement();

// Create next year
await createYear(2026, { copyFromCurrent: true });

// Archive old year
await archiveYear(2023);
```

---

## Context Consumer Hooks

These hooks provide access to centralized context state.

### 11. useExpenseContext
**Path**: `src/hooks/useExpenseContext.js`
**Purpose**: Consumer hook for ExpenseProvider context
**Category**: Context consumer

**Returns**: Same as `useExpenses` but from centralized provider

**Usage**:
```javascript
// ✅ Correct: Use context consumer
import { useExpenseContext } from '../hooks/useExpenseContext';

function MyComponent() {
  const { expenses, addExpense } = useExpenseContext();
  // Component logic
}

// ❌ Wrong: Don't call useExpenses directly
import { useExpenses } from '../hooks/useExpenses'; // Isolated state!
```

**Why Use This**:
- Ensures single source of truth
- Prevents state duplication
- Required for components under ExpenseProvider

---

### 12. useBudgetPeriodContext
**Path**: `src/hooks/useBudgetPeriodContext.js`
**Purpose**: Consumer hook for BudgetPeriodProvider context
**Category**: Context consumer

**Returns**: Same as `useBudgetPeriods` but from centralized provider

**Usage**:
```javascript
import { useBudgetPeriodContext } from '../hooks/useBudgetPeriodContext';

function YearSelector() {
  const { periods, activePeriod, setActivePeriod } = useBudgetPeriodContext();
  // Render year selector
}
```

---

### 13. useModal
**Path**: `src/hooks/useModal.js`
**Purpose**: Consumer hook for ModalProvider context
**Category**: Context consumer

**Returns**:
```javascript
{
  // Modal states (boolean for each modal)
  isAddExpenseModalOpen: boolean,
  isCreateYearModalOpen: boolean,
  isSettingsModalOpen: boolean,
  isDeleteConfirmationOpen: boolean,
  // ... (all modals)

  // Methods
  openModal: (modalName) => void,
  closeModal: (modalName) => void,
  closeAllModals: () => void,
}
```

**Usage**:
```javascript
import { useModal } from '../hooks/useModal';

function Toolbar() {
  const { openModal } = useModal();

  return (
    <button onClick={() => openModal('addExpense')}>
      Add Expense
    </button>
  );
}
```

---

### 14. useAlertContext
**Path**: `src/hooks/useAlertContext.js`
**Purpose**: Consumer hook for AlertProvider context
**Category**: Context consumer

**Returns**:
```javascript
{
  alert: {
    message: string,
    type: 'success' | 'error' | 'info' | 'warning',
    visible: boolean,
  },

  // Methods
  showAlert: (message, type) => void,
  hideAlert: () => void,
}
```

**Usage**:
```javascript
import { useAlertContext } from '../hooks/useAlertContext';

function SaveButton() {
  const { showAlert } = useAlertContext();

  const handleSave = async () => {
    try {
      await saveData();
      showAlert('Gemt!', 'success');
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };
}
```

---

### 15. useLoadingContext
**Path**: `src/hooks/useLoadingContext.js`
**Purpose**: Consumer hook for LoadingProvider context
**Category**: Context consumer

**Returns**:
```javascript
{
  loading: boolean,
  loadingStage: string,             // 'auth' | 'budget' | 'data' | 'complete'
  progress: number,                 // 0-100
  message: string,

  // Methods (usually called by providers)
  setLoading: (stage, progress) => void,
  completeLoading: () => void,
}
```

**Usage**:
```javascript
import { useLoadingContext } from '../hooks/useLoadingContext';

function App() {
  const { loading, loadingStage, progress } = useLoadingContext();

  if (loading) {
    return <UnifiedLoadingScreen stage={loadingStage} progress={progress} />;
  }

  return <MainApp />;
}
```

---

## Utility Hooks

General-purpose utility hooks.

### 16. useDebounce
**Path**: `src/hooks/useDebounce.js`
**Purpose**: Debounce value changes
**Category**: Utility

**Signature**:
```javascript
function useDebounce<T>(value: T, delay: number): T
```

**Usage**:
```javascript
import { useDebounce } from '../hooks/useDebounce';

function SearchInput() {
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebounce(searchText, 300);

  useEffect(() => {
    // Only runs 300ms after user stops typing
    performSearch(debouncedSearch);
  }, [debouncedSearch]);

  return <input onChange={(e) => setSearchText(e.target.value)} />;
}
```

---

### 17. useOnlineStatus
**Path**: `src/hooks/useOnlineStatus.js`
**Purpose**: Detect online/offline network status
**Category**: Utility

**Returns**:
```javascript
{
  isOnline: boolean,
}
```

**Usage**:
```javascript
import { useOnlineStatus } from '../hooks/useOnlineStatus';

function SyncIndicator() {
  const { isOnline } = useOnlineStatus();

  return (
    <div>
      {isOnline ? '☁️ Online' : '📴 Offline'}
    </div>
  );
}
```

---

### 18. useViewportSize
**Path**: `src/hooks/useViewportSize.js`
**Purpose**: Track viewport dimensions for responsive UI
**Category**: Utility

**Returns**:
```javascript
{
  width: number,
  height: number,
  isMobile: boolean,              // width < 768px
  isTablet: boolean,              // 768px <= width < 1024px
  isDesktop: boolean,             // width >= 1024px
}
```

**Usage**:
```javascript
import { useViewportSize } from '../hooks/useViewportSize';

function ResponsiveComponent() {
  const { isMobile, width } = useViewportSize();

  return isMobile ? <MobileView /> : <DesktopView />;
}
```

---

### 19. useSettingsHandlers
**Path**: `src/hooks/useSettingsHandlers.js`
**Purpose**: Form handlers for settings changes
**Category**: Utility

**Returns**:
```javascript
{
  handlers: {
    handleMonthlyPaymentChange: (value) => void,
    handlePreviousBalanceChange: (value) => void,
    handlePaymentModeChange: (mode) => void,
    // ... other setting handlers
  },

  // Validation
  validateSettings: (settings) => { valid: boolean, errors: Array },
}
```

**Usage**:
```javascript
import { useSettingsHandlers } from '../hooks/useSettingsHandlers';

function SettingsForm() {
  const { handlers } = useSettingsHandlers();

  return (
    <input
      type="number"
      onChange={(e) => handlers.handleMonthlyPaymentChange(e.target.value)}
    />
  );
}
```

---

### 20. useAlert (Deprecated - Use useAlertContext)
**Path**: `src/hooks/useAlert.js`
**Purpose**: Legacy alert hook (replaced by useAlertContext)
**Category**: Deprecated

**Note**: This hook is maintained for backward compatibility but new code should use `useAlertContext` instead.

---

## Usage Patterns

### Pattern 1: Core Hook vs Context Consumer

**Rule**: Always use context consumer hooks in components under providers.

```javascript
// ✅ Correct: In component tree under ExpenseProvider
import { useExpenseContext } from '../hooks/useExpenseContext';

function ExpenseTable() {
  const { expenses } = useExpenseContext(); // Shared state
  return <table>...</table>;
}

// ❌ Wrong: Creates isolated state
import { useExpenses } from '../hooks/useExpenses';

function ExpenseTable() {
  const { expenses } = useExpenses(); // Isolated, won't sync!
  return <table>...</table>;
}
```

### Pattern 2: Combining Hooks

```javascript
function Dashboard() {
  // Context consumers
  const { expenses } = useExpenseContext();
  const { activePeriod } = useBudgetPeriodContext();
  const { showAlert } = useAlertContext();

  // Utility hooks
  const { isMobile } = useViewportSize();
  const { isOnline } = useOnlineStatus();

  // Derived hooks
  const { filteredExpenses } = useExpenseFilters();

  // Component logic
}
```

### Pattern 3: Async Operations with Alerts

```javascript
function SaveButton() {
  const { updateExpense } = useExpenseContext();
  const { showAlert } = useAlertContext();

  const handleSave = async (expense) => {
    try {
      await updateExpense(expense.id, expense);
      showAlert('Udgift opdateret!', 'success');
    } catch (error) {
      showAlert(`Fejl: ${error.message}`, 'error');
    }
  };

  return <button onClick={handleSave}>Gem</button>;
}
```

### Pattern 4: Loading States

```javascript
function DataTable() {
  const { expenses, loading } = useExpenseContext();

  if (loading) return <Spinner />;
  if (!expenses.length) return <EmptyState />;

  return <table>{/* render expenses */}</table>;
}
```

---

## Testing

All hooks have comprehensive test coverage using Vitest and @testing-library/react-hooks.

### Test File Locations
Each hook has a corresponding test file:
```
src/hooks/
├── useExpenses.js
├── useExpenses.test.js         # Tests for useExpenses
├── useAuth.js
├── useAuth.test.js              # (in AuthContext.test.js)
└── ...
```

### Running Hook Tests
```bash
# Run all tests
npm test

# Run specific hook tests
npm test useExpenses

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Example
```javascript
import { renderHook, act } from '@testing-library/react-hooks';
import { useDebounce } from './useDebounce';

test('debounces value changes', async () => {
  const { result, rerender } = renderHook(
    ({ value }) => useDebounce(value, 500),
    { initialProps: { value: 'initial' } }
  );

  expect(result.current).toBe('initial');

  rerender({ value: 'changed' });
  expect(result.current).toBe('initial'); // Still old value

  await act(() => new Promise(r => setTimeout(r, 600)));
  expect(result.current).toBe('changed'); // Updated after delay
});
```

---

## Hook Dependencies

### Provider Dependency Graph
```
App
└─ AuthProvider (useAuth)
   └─ LoadingProvider (useLoadingContext)
      └─ SyncProvider (useSyncContext)
         └─ BudgetPeriodProvider (useBudgetPeriodContext)
            └─ AlertProvider (useAlertContext)
               └─ ModalProvider (useModal)
                  └─ ExpenseProvider (useExpenseContext)
```

### Hook Usage Map
| Hook | Used By | Depends On |
|------|---------|------------|
| useExpenseContext | ExpenseManager, Dashboard, Tables | ExpenseProvider |
| useBudgetPeriodContext | Header, YearSelector, Settings | BudgetPeriodProvider |
| useModal | All modal triggers | ModalProvider |
| useAlertContext | All components needing alerts | AlertProvider |
| useLoadingContext | App, Auth | LoadingProvider |
| useSyncContext | Header, Settings | SyncProvider |
| useDebounce | Search inputs, filters | None |
| useOnlineStatus | SyncIndicator | None |
| useViewportSize | Layout, responsive components | None |

---

## Migration Notes

### From Standalone Hooks to Context Consumers

**Old Pattern** (Deprecated):
```javascript
import { useExpenses } from '../hooks/useExpenses';

function MyComponent() {
  const { expenses } = useExpenses(); // Isolated state!
}
```

**New Pattern** (Current):
```javascript
import { useExpenseContext } from '../hooks/useExpenseContext';

function MyComponent() {
  const { expenses } = useExpenseContext(); // Shared state!
}
```

**Why**: Context pattern fixes state sharing bug where each hook call had isolated state.

---

## Additional Resources

- [React Hooks Documentation](https://react.dev/reference/react)
- [Testing Library Hooks](https://react-hooks-testing-library.com/)
- [Custom Hooks Best Practices](https://react.dev/learn/reusing-logic-with-custom-hooks)
