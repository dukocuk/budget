# Component Documentation

## Component Overview

**Total**: 32 components organized in 7 subdirectories
**Organization**: cards/ • charts/ • common/ • core/ • features/ • modals/ • tables/
**Last Updated**: 2025-01-30

---

## Core Components (core/)

4 essential application components

### Auth.jsx
**Path**: `src/components/core/Auth.jsx`
**Purpose**: Google OAuth login screen
**Props**: `onSignIn`, `loading`, `error`
**Features**:
- Google sign-in button with @react-oauth/google
- Loading state display
- Error message handling
- Branded styling with app logo

### Dashboard.jsx
**Path**: `src/components/core/Dashboard.jsx`
**Purpose**: Main dashboard with charts and statistics
**Props**: `expenses`, `settings`, `activePeriod`
**Features**:
- Summary cards (4 key budget metrics)
- Balance chart (monthly projection visualization)
- Year comparison charts (multi-year analysis)
- Responsive grid layout
- Real-time calculation updates

### Header.jsx
**Path**: `src/components/core/Header.jsx`
**Purpose**: App header with user info and controls
**Props**: `user`, `syncStatus`, `onSignOut`
**Features**:
- User display name and profile picture
- Sync status indicator (☁️ Online / 📴 Offline)
- Year selector dropdown integration
- Sign out button
- Responsive mobile header

### Layout.jsx
**Path**: `src/components/core/Layout.jsx`
**Purpose**: Main application layout wrapper
**Props**: `children`, `activeTab`, `onTabChange`
**Features**:
- Responsive layout structure
- Tab navigation system
- Mobile bottom tab bar integration
- Desktop sidebar navigation

---

## Feature Components (features/)

3 primary feature modules

### ExpenseManager.jsx
**Path**: `src/components/features/ExpenseManager.jsx`
**Purpose**: Expense CRUD table with inline editing
**Props**: `expenses`, `onUpdate`, `onDelete`, `onAdd`
**Features**:
- Inline editing (all fields editable)
- Search functionality
- Bulk selection and deletion
- Add expense button
- Keyboard shortcuts (Ctrl+N for new)
- Undo/redo support

### Settings.jsx
**Path**: `src/components/features/Settings.jsx`
**Purpose**: Configuration and sync controls
**Props**: `settings`, `onUpdate`, `syncStatus`
**Features**:
- Monthly payment configuration
- Previous balance input
- Budget year management
- CSV import/export buttons
- Sync status display
- Archive year controls

### TemplateManager.jsx
**Path**: `src/components/features/TemplateManager.jsx`
**Purpose**: Budget template CRUD operations
**Props**: `templates`, `onSave`, `onDelete`, `onApply`
**Features**:
- Create new templates from current budget
- Edit existing templates
- Delete templates with confirmation
- Apply template to active budget
- Template preview

---

## Table Components (tables/)

2 data table components

### ExpensesTable.jsx
**Path**: `src/components/tables/ExpensesTable.jsx`
**Purpose**: Filterable, sortable expense data table
**Props**: `expenses`, `filters`, `onSort`, `onFilter`
**Features**:
- Search by expense name
- Filter by frequency (monthly/quarterly/yearly)
- Filter by month range
- Sortable columns
- Pagination support
- Responsive mobile view

### MonthlyView.jsx
**Path**: `src/components/tables/MonthlyView.jsx`
**Purpose**: 12-month breakdown table
**Props**: `expenses`, `settings`
**Features**:
- 12-column month-by-month view
- All expenses with calculated monthly amounts
- Row totals (annual per expense)
- Column totals (monthly totals)
- Horizontal scroll on mobile
- Danish month names

---

## Chart Components (charts/)

2 data visualization components

### BalanceChart.jsx
**Path**: `src/components/charts/BalanceChart.jsx`
**Purpose**: Monthly balance projection line chart
**Props**: `data`, `settings`
**Features**:
- Recharts LineChart integration
- Monthly balance projection
- Previous balance carryover
- Danish month labels (Jan, Feb, Mar...)
- Responsive sizing
- Tooltip with formatted values

### YearComparisonCharts.jsx
**Path**: `src/components/charts/YearComparisonCharts.jsx`
**Purpose**: Multi-year comparison visualizations
**Props**: `periods`, `selectedYears`
**Features**:
- Multi-line year comparison charts
- Year-over-year trend analysis
- Legend with color coding per year
- Comparative metrics display
- Responsive design

---

## Card Components (cards/)

3 summary and mobile card components

### SummaryCards.jsx
**Path**: `src/components/cards/SummaryCards.jsx`
**Purpose**: 4 budget metric summary cards
**Props**: `summary`, `settings`
**Features**:
- Total Annual Expenses card
- Average Monthly Expenses card
- Monthly Balance card
- Annual Reserve card
- Responsive 2x2 grid layout
- Danish number formatting (1.234,56 kr.)

### MonthlyCard.jsx
**Path**: `src/components/cards/MonthlyCard.jsx`
**Purpose**: Mobile-optimized monthly view card
**Props**: `month`, `expenses`, `balance`
**Features**:
- Compact card layout for mobile
- Touch-optimized interactions
- Monthly expense breakdown
- Balance display
- Swipeable card design

### ExpenseCard.jsx
**Path**: `src/components/cards/ExpenseCard.jsx`
**Purpose**: Mobile-optimized expense card
**Props**: `expense`, `onEdit`, `onDelete`
**Features**:
- Compact expense display
- Touch-friendly edit/delete actions
- Frequency badge display
- Amount formatting in DKK
- Swipe-to-delete gesture

---

## Modal Components (modals/)

9 modal dialog components

### AddExpenseModal.jsx
**Path**: `src/components/modals/AddExpenseModal.jsx`
**Purpose**: Add or edit expense form dialog
**Props**: `isOpen`, `onClose`, `onSave`, `expense` (optional for edit)
**Features**:
- Name, amount, frequency inputs
- Start month and end month selectors
- Form validation with error messages
- Submit/cancel buttons
- Keyboard shortcuts (Enter to submit, Escape to close)
- Template integration

### CreateYearModal.jsx
**Path**: `src/components/modals/CreateYearModal.jsx`
**Purpose**: Create new budget year dialog
**Props**: `isOpen`, `onClose`, `onCreate`, `suggestedYear`
**Features**:
- Year input with validation
- Auto-calculated starting balance from previous year
- Option to copy expenses from previous year
- Form validation (unique year check)
- Preview of starting balance calculation

### DeleteConfirmation.jsx
**Path**: `src/components/modals/DeleteConfirmation.jsx`
**Purpose**: Generic delete confirmation dialog
**Props**: `isOpen`, `onClose`, `onConfirm`, `message`, `itemName`
**Features**:
- Warning message display
- Confirm/cancel buttons
- Keyboard shortcuts (Enter/Escape)
- Customizable warning text
- Danger styling

### SettingsModal.jsx
**Path**: `src/components/modals/SettingsModal.jsx`
**Purpose**: Settings dialog wrapper
**Props**: `isOpen`, `onClose`, `settings`, `onSave`
**Features**:
- Modal wrapper for Settings component
- Responsive design
- Close on backdrop click
- Escape key to close

### PaymentModeConfirmation.jsx
**Path**: `src/components/modals/PaymentModeConfirmation.jsx`
**Purpose**: Confirm payment mode toggle
**Props**: `isOpen`, `onClose`, `onConfirm`, `currentMode`
**Features**:
- Confirm switch between fixed/variable payment modes
- Warning about data migration
- Clear explanation of mode differences
- Confirm/cancel actions

### MonthlyAmountsModal.jsx
**Path**: `src/components/modals/MonthlyAmountsModal.jsx`
**Purpose**: Variable monthly payments editor
**Props**: `isOpen`, `onClose`, `onSave`, `amounts` (array of 12)
**Features**:
- 12-month input grid (Jan-Dec)
- Individual month editing
- Total calculation display
- Danish number formatting
- Validation (all months required)

### SwitchToFixedModal.jsx
**Path**: `src/components/modals/SwitchToFixedModal.jsx`
**Purpose**: Switch to fixed payment mode confirmation
**Props**: `isOpen`, `onClose`, `onConfirm`
**Features**:
- Confirmation dialog for mode switch
- Data migration warning
- Explanation of fixed mode behavior
- Confirm/cancel buttons

### TemplateManagerModal.jsx
**Path**: `src/components/modals/TemplateManagerModal.jsx`
**Purpose**: Budget template management dialog
**Props**: `isOpen`, `onClose`, `templates`, `onApply`
**Features**:
- Template CRUD operations in modal
- Template preview before applying
- Delete confirmation integration
- Apply template to current budget
- Close on successful application

### BackupManagerModal.jsx
**Path**: `src/components/modals/BackupManagerModal.jsx`
**Purpose**: Google Drive backup management
**Props**: `isOpen`, `onClose`, `backups`
**Features**:
- List all available backups from Google Drive
- Preview backup contents before restore
- Restore backup with confirmation
- Delete old backups
- Backup metadata display (date, size, expense count)

---

## Common Components (common/)

9 shared utility components

### Alert.jsx
**Path**: `src/components/common/Alert.jsx`
**Purpose**: Toast notification system
**Props**: `message`, `type`, `onClose`, `autoClose`
**Features**:
- Success/error/info/warning types
- Auto-dismiss (3 seconds default)
- Animated entrance/exit
- Color-coded styling
- Positioned at top-right

### ErrorBoundary.jsx
**Path**: `src/components/common/ErrorBoundary.jsx`
**Purpose**: React error boundary wrapper
**Props**: `children`, `fallback`
**Features**:
- Catches React component errors
- User-friendly error display
- Reload application button
- Error logging to console
- Prevents full app crash

### TabView.jsx
**Path**: `src/components/common/TabView.jsx`
**Purpose**: Tabbed navigation component
**Props**: `tabs`, `activeTab`, `onChange`, `children`
**Features**:
- Horizontal tab list
- Active tab highlighting
- Keyboard navigation (arrow keys)
- Responsive tab overflow handling
- Tab content rendering

### YearSelector.jsx
**Path**: `src/components/common/YearSelector.jsx`
**Purpose**: Budget year dropdown selector
**Props**: `periods`, `activePeriod`, `onChange`, `onCreateNew`
**Features**:
- Dropdown with all budget years
- Status badges (✅ Active / 📦 Archived)
- "Opret nyt år" (Create new year) button
- Click outside to close dropdown
- Keyboard navigation

### YearComparison.jsx
**Path**: `src/components/common/YearComparison.jsx`
**Purpose**: Year-over-year comparison view
**Props**: `periods`, `selectedYears`, `onYearToggle`
**Features**:
- Multi-select year checkboxes
- Side-by-side year comparison
- Difference calculations (absolute and percentage)
- Comparative metrics display
- Export comparison data

### BottomSheet.jsx
**Path**: `src/components/common/BottomSheet.jsx`
**Purpose**: Mobile bottom sheet drawer
**Props**: `isOpen`, `onClose`, `children`, `title`
**Features**:
- Slide-up animation from bottom
- Drag-to-close gesture
- Backdrop with click-to-close
- Responsive height adjustment
- Touch-optimized

### BottomTabBar.jsx
**Path**: `src/components/common/BottomTabBar.jsx`
**Purpose**: Mobile bottom navigation bar
**Props**: `tabs`, `activeTab`, `onChange`
**Features**:
- Fixed bottom positioning
- Icon + label for each tab
- Active tab highlighting
- Touch-optimized tap targets
- Responsive visibility (mobile only)

### UnifiedLoadingScreen.jsx
**Path**: `src/components/common/UnifiedLoadingScreen.jsx`
**Purpose**: Unified loading screen with progress stages
**Props**: `loading`, `stage`, `progress`
**Features**:
- Multi-stage loading display (auth → budget → data → complete)
- Progress bar with percentage
- Stage-specific messages
- Smooth transitions between stages
- Full-screen overlay

### MonthlyOverview.jsx
**Path**: `src/components/common/MonthlyOverview.jsx`
**Purpose**: Monthly expense totals overview
**Props**: `expenses`, `settings`, `selectedMonth`
**Features**:
- Monthly expense breakdown
- Income vs expenses comparison
- Balance calculation for selected month
- Quick month navigation
- Mobile-optimized card layout

---

## Component Dependencies

### Provider Requirements
All components requiring context access must be wrapped in appropriate providers:
- **ExpenseProvider** → ExpenseManager, ExpensesTable, Dashboard
- **BudgetPeriodProvider** → Header, YearSelector, CreateYearModal
- **ModalProvider** → All modal components
- **SyncContext** → Header, Settings
- **AlertProvider** → All components using notifications
- **LoadingProvider** → Auth, App initialization

### Import Path Patterns
Components should be imported using subdirectory paths:
```javascript
// ✅ Correct
import Auth from '../components/core/Auth';
import AddExpenseModal from '../components/modals/AddExpenseModal';
import SummaryCards from '../components/cards/SummaryCards';

// ❌ Wrong (old flat structure)
import Auth from '../components/Auth';
import AddExpenseModal from '../components/AddExpenseModal';
```

---

## Testing

All components have comprehensive test coverage using Vitest and @testing-library/react.

**Test Files**: Located alongside components with `.test.jsx` extension
**Coverage**: 679 passing tests across all components
**Test Commands**:
```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

---

## Performance Considerations

- **Code Splitting**: Large components (Dashboard, ExpenseManager) use React.lazy
- **Memoization**: Expensive calculations use useMemo
- **Optimization**: Lists use React.memo for item components
- **Debouncing**: Search inputs debounced (300ms)
- **Virtual Scrolling**: Long tables implement windowing for 100+ items

---

## Accessibility

All components follow WCAG 2.1 AA standards:
- Semantic HTML elements
- ARIA labels for interactive elements
- Keyboard navigation support
- Focus management in modals
- Screen reader announcements for dynamic content
- Sufficient color contrast ratios

---

## Mobile Responsiveness

Components adapt to mobile viewports (<768px):
- **Desktop**: Full table views, sidebar navigation
- **Mobile**: Card layouts, bottom tab bar, bottom sheets
- **Breakpoints**: Defined in CSS with media queries
- **Touch Targets**: Minimum 44x44px for all interactive elements
