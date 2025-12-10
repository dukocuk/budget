# Component Documentation

## Component Overview

Total: 30+ components across core UI, modals, and supporting features.

## Core UI Components

### Header.jsx
**Purpose**: App header with user info and sync status
**Props**: `user`, `syncStatus`, `onSignOut`
**Features**:
- User display name and profile picture
- Sync status indicator (☁️ Online / 📴 Offline)
- Year selector dropdown
- Sign out button

### Auth.jsx
**Purpose**: Google OAuth login screen
**Props**: `onSignIn`, `loading`, `error`
**Features**:
- Google sign-in button
- Loading state
- Error display
- Branded styling

### Layout.jsx
**Purpose**: Main app layout with navigation
**Props**: `children`, `activeTab`, `onTabChange`
**Features**:
- Responsive layout
- Tab navigation
- Mobile-optimized

### Dashboard.jsx
**Purpose**: Overview with charts and stats
**Props**: `expenses`, `settings`
**Features**:
- Summary cards (4 metrics)
- Pie chart (expense distribution by frequency)
- Bar chart (monthly expenses vs income)
- Line chart (balance projection)
- Quick stats section

### ExpenseManager.jsx
**Purpose**: Expense table with inline editing
**Props**: `expenses`, `onUpdate`, `onDelete`
**Features**:
- Inline editing (all fields editable)
- Search functionality
- Bulk selection and deletion
- Add new expense button

### MonthlyView.jsx
**Purpose**: 12-month breakdown table
**Props**: `expenses`
**Features**:
- 12-column month-by-month view
- All expenses with monthly amounts
- Row and column totals
- Scrollable on mobile

### Settings.jsx
**Purpose**: Configuration and sync controls
**Props**: `settings`, `onUpdate`, `syncStatus`
**Features**:
- Monthly payment input
- Previous balance input
- Budget year management
- CSV import/export
- Sync status display

## Modal Components

### AddExpenseModal.jsx
**Purpose**: Add/edit expense form
**Props**: `isOpen`, `onClose`, `onSave`, `expense`
**Features**:
- Name, amount, frequency inputs
- Month range selection
- Form validation
- Submit/cancel buttons

### CreateYearModal.jsx
**Purpose**: Create new budget year
**Props**: `isOpen`, `onClose`, `onCreate`, `suggestedYear`
**Features**:
- Year input with validation
- Auto-calculated starting balance
- Copy expenses from previous year option
- Form validation

### DeleteConfirmation.jsx
**Purpose**: Confirm delete operations
**Props**: `isOpen`, `onClose`, `onConfirm`, `message`
**Features**:
- Warning message
- Confirm/cancel buttons
- Keyboard shortcuts (Enter/Escape)

### SettingsModal.jsx
**Purpose**: Settings dialog
**Props**: `isOpen`, `onClose`, `settings`, `onSave`
**Features**:
- Modal wrapper for settings
- Responsive design

### PaymentModeConfirmation.jsx
**Purpose**: Toggle payment mode
**Props**: `isOpen`, `onClose`, `onConfirm`
**Features**:
- Confirm switch between fixed/variable payments
- Warning about data loss

### MonthlyAmountsModal.jsx
**Purpose**: Variable monthly payments editor
**Props**: `isOpen`, `onClose`, `onSave`, `amounts`
**Features**:
- 12-month input grid
- Individual month editing
- Total calculation display

### SwitchToFixedModal.jsx
**Purpose**: Switch to fixed payment mode
**Props**: `isOpen`, `onClose`, `onConfirm`
**Features**:
- Confirmation dialog
- Data migration warning

### TemplateManagerModal.jsx
**Purpose**: Budget template management
**Props**: `isOpen`, `onClose`, `templates`
**Features**:
- Template CRUD operations
- Apply template to budget

## Supporting Components

### Alert.jsx
**Purpose**: Toast notifications
**Props**: `message`, `type`, `onClose`
**Features**:
- Success/error/info types
- Auto-dismiss (3 seconds)
- Animated entrance/exit

### ErrorBoundary.jsx
**Purpose**: Error handling wrapper
**Props**: `children`
**Features**:
- Catches React errors
- User-friendly error display
- Reload option

### TabView.jsx
**Purpose**: Tabbed navigation
**Props**: `tabs`, `activeTab`, `onChange`
**Features**:
- Horizontal tab list
- Dropdown support for nested tabs
- Keyboard navigation

### SummaryCards.jsx
**Purpose**: 4 budget metric cards
**Props**: `summary`
**Features**:
- Total annual expenses
- Average monthly expenses
- Monthly balance
- Annual reserve
- Responsive grid layout

### BalanceChart.jsx
**Purpose**: Monthly balance visualization
**Props**: `data`
**Features**:
- Line chart with Recharts
- Month labels (Danish)
- Responsive

### ExpensesTable.jsx
**Purpose**: Filterable expense table
**Props**: `expenses`, `filters`
**Features**:
- Search, frequency, month filters
- Sortable columns
- Pagination (if needed)

### YearSelector.jsx
**Purpose**: Year dropdown selector
**Props**: `periods`, `activePeriod`, `onChange`
**Features**:
- Dropdown with year list
- Status badges (✅ Active / 📦 Archived)
- "Opret nyt år" button
- Click outside to close

### YearComparison.jsx
**Purpose**: Year-over-year comparison view
**Props**: `periods`
**Features**:
- Select multiple years to compare
- Side-by-side comparison
- Difference calculations

### YearComparisonCharts.jsx
**Purpose**: Multi-year visualization
**Props**: `periods`
**Features**:
- Multi-line charts
- Year-over-year trends
- Legend with color coding

### TemplateManager.jsx
**Purpose**: Template CRUD
**Props**: `templates`, `onSave`, `onDelete`
**Features**:
- Create, edit, delete templates
- Apply template to budget

### Mobile Components

#### MonthlyCard.jsx
**Purpose**: Mobile monthly view card
**Props**: `month`, `expenses`
**Features**:
- Compact card layout
- Touch-optimized

#### ExpenseCard.jsx
**Purpose**: Mobile expense card
**Props**: `expense`, `onEdit`
**Features**:
- Swipe actions
- Compact display

#### BottomSheet.jsx
**Purpose**: Mobile bottom sheet
**Props**: `isOpen`, `onClose`, `children`
**Features**:
- Swipe to dismiss
- Overlay backdrop

#### BottomTabBar.jsx
**Purpose**: Mobile navigation
**Props**: `activeTab`, `onChange`
**Features**:
- Fixed bottom position
- Icon + label tabs

### MonthlyOverview.jsx
**Purpose**: Monthly totals view
**Props**: `expenses`
**Features**:
- Calendar-style layout
- Monthly totals
- Visual indicators

## Styling System

### CSS Variables
Defined in `src/index.css`:
```css
:root {
  --color-primary: #667eea;
  --color-success: #10b981;
  --color-error: #ef4444;
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  /* ... more variables */
}
```

### Responsive Breakpoints
- **Desktop**: Default (>768px)
- **Tablet**: 768px
- **Mobile**: 480px

### Color Palette
- Primary gradient: `#667eea` → `#764ba2` (purple)
- Success: `#10b981` (green)
- Error: `#ef4444` (red)
- Background: `#f9fafb`

## Localization

### Language
Entirely in Danish (da-DK)

### Month Names
```javascript
["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"]
```

### UI Text Examples
- "Månedlig indbetaling til budgetkonto"
- "Årlige udgifter"
- "Log ind med Google"
- "☁️ Online" / "📴 Offline"
- "✅ Synkroniseret"

### Decimal Formatting
**Locale**: Danish (da-DK)
**Decimal Separator**: Comma (,)
**Thousands Separator**: Period (.)

**Examples**:
- `100,95` → 100.95 kr
- `1.234,56` → 1234.56 kr
- `5.700,00` → 5700.00 kr

**Implementation**: `src/utils/localeHelpers.js`
