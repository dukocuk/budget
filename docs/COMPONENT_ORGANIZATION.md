# Component Organization Guide

**Purpose**: Guide for organizing React components in the budget tracker application
**Structure**: 7 subdirectories with clear responsibilities
**Last Updated**: 2025-01-30

---

## Table of Contents
1. [Directory Structure](#directory-structure)
2. [Subdirectory Purposes](#subdirectory-purposes)
3. [When to Use Each Directory](#when-to-use-each-directory)
4. [Import Path Conventions](#import-path-conventions)
5. [File Naming Conventions](#file-naming-conventions)
6. [Component Guidelines](#component-guidelines)

---

## Directory Structure

```
src/components/
├── cards/          # 3 components  - Summary and mobile card components
├── charts/         # 2 components  - Data visualization components
├── common/         # 9 components  - Shared utility components
├── core/           # 4 components  - Essential app-level components
├── features/       # 3 components  - Primary feature modules
├── modals/         # 9 components  - Modal dialogs and confirmations
└── tables/         # 2 components  - Data table components
```

**Total**: 32 components organized by functional purpose

---

## Subdirectory Purposes

### cards/
**Purpose**: Summary cards and mobile-optimized card layouts
**Count**: 3 components
**Use For**: Dashboard metrics, mobile view cards, compact data display

**Components**:
- `SummaryCards.jsx` - 4 budget metric cards (total expenses, monthly avg, balance, reserve)
- `MonthlyCard.jsx` - Mobile monthly view card
- `ExpenseCard.jsx` - Mobile expense item card

**When to add here**: Creating summary cards, dashboard metrics, or mobile-optimized card layouts

---

### charts/
**Purpose**: Data visualization and chart components
**Count**: 2 components
**Use For**: Charts, graphs, data visualizations using Recharts

**Components**:
- `BalanceChart.jsx` - Monthly balance projection line chart
- `YearComparisonCharts.jsx` - Multi-year comparison charts

**When to add here**: Creating new chart types, data visualizations, or Recharts wrappers

---

### common/
**Purpose**: Shared utility components used across the app
**Count**: 9 components
**Use For**: Reusable UI components, utilities, wrappers, layout helpers

**Components**:
- `Alert.jsx` - Toast notification system
- `ErrorBoundary.jsx` - Error handling wrapper
- `TabView.jsx` - Tabbed navigation
- `YearSelector.jsx` - Budget year dropdown
- `YearComparison.jsx` - Year-over-year comparison view
- `BottomSheet.jsx` - Mobile bottom sheet drawer
- `BottomTabBar.jsx` - Mobile bottom navigation
- `UnifiedLoadingScreen.jsx` - Multi-stage loading screen
- `MonthlyOverview.jsx` - Monthly expense totals overview

**When to add here**: Creating reusable components, UI utilities, mobile navigation, shared layout components

**Note**: If a component is used in 2+ different features, consider moving it to `common/`

---

### core/
**Purpose**: Essential application-level components
**Count**: 4 components
**Use For**: App shell, authentication, main dashboard, primary layout

**Components**:
- `Auth.jsx` - Google OAuth login screen
- `Dashboard.jsx` - Main dashboard with charts and stats
- `Header.jsx` - App header with user info and controls
- `Layout.jsx` - Main application layout wrapper

**When to add here**: Core app infrastructure, authentication screens, main dashboard components

**Guideline**: Components here should be essential for app functionality and loaded on every page

---

### features/
**Purpose**: Primary feature modules and business logic components
**Count**: 3 components
**Use For**: Main feature implementations, CRUD interfaces, primary user workflows

**Components**:
- `ExpenseManager.jsx` - Expense CRUD table with inline editing
- `Settings.jsx` - Configuration and sync controls
- `TemplateManager.jsx` - Budget template management

**When to add here**: Implementing major features, business logic heavy components, primary user workflows

**Guideline**: Each component here should represent a distinct feature or user workflow

---

### modals/
**Purpose**: Modal dialogs, confirmations, and popups
**Count**: 9 components
**Use For**: All modal windows, dialogs, confirmations, overlays

**Components**:
- `AddExpenseModal.jsx` - Add/edit expense form
- `CreateYearModal.jsx` - Create new budget year dialog
- `DeleteConfirmation.jsx` - Generic delete confirmation
- `SettingsModal.jsx` - Settings dialog wrapper
- `PaymentModeConfirmation.jsx` - Payment mode toggle confirmation
- `MonthlyAmountsModal.jsx` - Variable monthly payments editor
- `SwitchToFixedModal.jsx` - Switch to fixed mode confirmation
- `TemplateManagerModal.jsx` - Template management dialog
- `BackupManagerModal.jsx` - Backup management interface

**When to add here**: Creating any modal, dialog, popup, or confirmation overlay

**Guideline**: All components here should integrate with `ModalProvider` and use `useModal()` hook

---

### tables/
**Purpose**: Data table components for displaying tabular data
**Count**: 2 components
**Use For**: Tables, grids, data lists with rows and columns

**Components**:
- `ExpensesTable.jsx` - Filterable, sortable expense table
- `MonthlyView.jsx` - 12-month breakdown table

**When to add here**: Creating data tables, grids, or structured row/column layouts

**Guideline**: Tables should support filtering, sorting, and responsive mobile views

---

## When to Use Each Directory

### Decision Tree

```
New Component?
│
├─ Is it a modal/dialog? → modals/
│
├─ Is it a data table? → tables/
│
├─ Is it a chart/graph? → charts/
│
├─ Is it a summary card? → cards/
│
├─ Is it used across multiple features? → common/
│
├─ Is it a core app component (auth, dashboard, layout)? → core/
│
└─ Is it a major feature module? → features/
```

### Examples

**Example 1: Creating a new backup restore dialog**
- **Question**: Is it a modal?
- **Answer**: Yes
- **Directory**: `modals/BackupRestoreModal.jsx`

**Example 2: Creating a spending trend chart**
- **Question**: Is it a chart?
- **Answer**: Yes
- **Directory**: `charts/SpendingTrendChart.jsx`

**Example 3: Creating a category filter dropdown**
- **Question**: Used in multiple features?
- **Answer**: Yes (expense table, dashboard, reports)
- **Directory**: `common/CategoryFilter.jsx`

**Example 4: Creating a budget report export feature**
- **Question**: Major feature module?
- **Answer**: Yes
- **Directory**: `features/ReportExporter.jsx`

---

## Import Path Conventions

### Absolute Paths (Preferred)
Use absolute paths from `src/` for clarity:

```javascript
// ✅ Correct: Clear absolute path
import Auth from '@/components/core/Auth';
import AddExpenseModal from '@/components/modals/AddExpenseModal';
import SummaryCards from '@/components/cards/SummaryCards';
```

### Relative Paths
Use relative paths when appropriate:

```javascript
// From App.jsx (src/App.jsx)
import Dashboard from './components/core/Dashboard';
import Header from './components/core/Header';

// From a component in core/ (src/components/core/Dashboard.jsx)
import SummaryCards from '../cards/SummaryCards';
import BalanceChart from '../charts/BalanceChart';
```

### Import Grouping
Group imports by directory for readability:

```javascript
// ✅ Good: Grouped by directory
import { useExpenseContext } from '@/hooks/useExpenseContext';
import { useBudgetPeriodContext } from '@/hooks/useBudgetPeriodContext';

import Dashboard from '@/components/core/Dashboard';
import Header from '@/components/core/Header';

import SummaryCards from '@/components/cards/SummaryCards';
import BalanceChart from '@/components/charts/BalanceChart';

import AddExpenseModal from '@/components/modals/AddExpenseModal';
import DeleteConfirmation from '@/components/modals/DeleteConfirmation';

// ❌ Bad: Random order
import AddExpenseModal from '@/components/modals/AddExpenseModal';
import Dashboard from '@/components/core/Dashboard';
import { useExpenseContext } from '@/hooks/useExpenseContext';
import SummaryCards from '@/components/cards/SummaryCards';
```

---

## File Naming Conventions

### Component Files
- **Format**: `ComponentName.jsx` (PascalCase)
- **CSS**: `ComponentName.css` (matching name)
- **Tests**: `ComponentName.test.jsx` (same directory)

**Example**:
```
src/components/modals/
├── AddExpenseModal.jsx
├── AddExpenseModal.css
└── AddExpenseModal.test.jsx
```

### Naming Rules
- ✅ **Use PascalCase**: `ExpenseCard.jsx`, `YearSelector.jsx`
- ✅ **Descriptive names**: `MonthlyView.jsx`, `BalanceChart.jsx`
- ✅ **No abbreviations**: `ExpenseManager.jsx` not `ExpMgr.jsx`
- ❌ **No generic names**: `Component.jsx`, `Utils.jsx`, `Main.jsx`

### File Structure
```javascript
// Component.jsx structure
import React from 'react';
import PropTypes from 'prop-types'; // Optional but recommended
import './Component.css';

export default function Component({ prop1, prop2 }) {
  // Component logic
  return (
    // JSX
  );
}

Component.propTypes = {
  prop1: PropTypes.string.isRequired,
  prop2: PropTypes.number,
};
```

---

## Component Guidelines

### Single Responsibility
Each component should have one clear purpose:

```javascript
// ✅ Good: Single responsibility
function ExpenseCard({ expense }) {
  return (
    <div className="expense-card">
      <h3>{expense.name}</h3>
      <p>{expense.amount} kr.</p>
    </div>
  );
}

// ❌ Bad: Multiple responsibilities
function ExpenseCardWithEditingAndDeletion({ expense }) {
  // Handles display, editing, deletion, validation, sync...
  // Too many responsibilities!
}
```

### Component Size
- **Small components**: < 100 lines
- **Medium components**: 100-300 lines
- **Large components**: > 300 lines (consider splitting)

**Guideline**: If a component exceeds 300 lines, consider extracting subcomponents

### Composition Over Complexity
Break complex components into smaller, composable pieces:

```javascript
// ✅ Good: Composition
function Dashboard() {
  return (
    <div>
      <SummaryCards />
      <BalanceChart />
      <YearComparisonCharts />
    </div>
  );
}

// ❌ Bad: Monolithic
function Dashboard() {
  // 500 lines of mixed logic for cards, charts, data fetching...
}
```

### Props Interface
Define clear, minimal prop interfaces:

```javascript
// ✅ Good: Clear, minimal props
function ExpenseCard({ expense, onEdit, onDelete }) {
  // Component logic
}

// ❌ Bad: Too many props
function ExpenseCard({
  name, amount, frequency, startMonth, endMonth,
  onEdit, onDelete, onArchive, onDuplicate,
  showEdit, showDelete, showArchive,
  // ... 10 more props
}) {
  // Too complex!
}
```

### State Management
- **Local state**: Use `useState` for component-specific state
- **Shared state**: Use context consumers (`useExpenseContext`, etc.)
- **Avoid prop drilling**: Use context for deeply nested data

```javascript
// ✅ Good: Context for shared state
function ExpenseTable() {
  const { expenses } = useExpenseContext(); // Shared state
  const [sortOrder, setSortOrder] = useState('asc'); // Local state
}

// ❌ Bad: Prop drilling
function App() {
  const [expenses, setExpenses] = useState([]);
  return <Level1 expenses={expenses} />;
}
function Level1({ expenses }) {
  return <Level2 expenses={expenses} />;
}
function Level2({ expenses }) {
  return <Level3 expenses={expenses} />;
}
// ... 5 more levels
```

---

## Moving Components Between Directories

### When to Move

**From `features/` to `common/`**:
- Component is used in 2+ features
- Component is now reusable utility

**From `core/` to `features/`**:
- Component is not essential for all pages
- Component represents specific feature, not app infrastructure

**From `common/` to specific directory**:
- Component is only used in one context
- Component has specialized purpose (modal, chart, card)

### How to Move

1. **Move file**: `mv src/components/old/Component.jsx src/components/new/`
2. **Move styles**: `mv src/components/old/Component.css src/components/new/`
3. **Move tests**: `mv src/components/old/Component.test.jsx src/components/new/`
4. **Update imports**: Search and replace old import paths
5. **Run tests**: `npm test` to ensure nothing broke
6. **Update docs**: Update `COMPONENTS.md` with new location

---

## Best Practices Summary

### Do's ✅
- Group related components in subdirectories
- Use clear, descriptive component names
- Keep components focused on single responsibility
- Use context consumers for shared state
- Write tests alongside components
- Document props with PropTypes or TypeScript

### Don'ts ❌
- Don't create deeply nested subdirectories
- Don't use generic names (Component, Utils, Main)
- Don't put unrelated components together
- Don't duplicate code across components
- Don't bypass component organization (no flat `/components/`)
- Don't create components without tests

---

## Future Considerations

### Potential New Directories

If the app grows, consider adding:

```
src/components/
├── forms/      # Form components and inputs
├── layouts/    # Layout components (grid, flexbox)
├── widgets/    # Self-contained widget components
└── hooks/      # Component-specific custom hooks (move from src/hooks/)
```

### Scaling Guidelines
- **10-20 components**: Current 7-directory structure is perfect
- **20-50 components**: Consider splitting `common/` into more specific directories
- **50+ components**: Consider feature-based organization (by domain, not component type)

---

## Additional Resources

- [React File Structure Best Practices](https://react.dev/learn/thinking-in-react#step-1-break-the-ui-into-a-component-hierarchy)
- [Component Design Patterns](https://reactpatterns.com/)
- [Atomic Design Methodology](https://atomicdesign.bradfrost.com/)

---

## Appendix: Full Component List by Directory

### cards/ (3)
1. SummaryCards.jsx
2. MonthlyCard.jsx
3. ExpenseCard.jsx

### charts/ (2)
1. BalanceChart.jsx
2. YearComparisonCharts.jsx

### common/ (9)
1. Alert.jsx
2. BottomSheet.jsx
3. BottomTabBar.jsx
4. ErrorBoundary.jsx
5. MonthlyOverview.jsx
6. TabView.jsx
7. UnifiedLoadingScreen.jsx
8. YearComparison.jsx
9. YearSelector.jsx

### core/ (4)
1. Auth.jsx
2. Dashboard.jsx
3. Header.jsx
4. Layout.jsx

### features/ (3)
1. ExpenseManager.jsx
2. Settings.jsx
3. TemplateManager.jsx

### modals/ (9)
1. AddExpenseModal.jsx
2. BackupManagerModal.jsx
3. CreateYearModal.jsx
4. DeleteConfirmation.jsx
5. MonthlyAmountsModal.jsx
6. PaymentModeConfirmation.jsx
7. SettingsModal.jsx
8. SwitchToFixedModal.jsx
9. TemplateManagerModal.jsx

### tables/ (2)
1. ExpensesTable.jsx
2. MonthlyView.jsx

**Total: 32 components**
