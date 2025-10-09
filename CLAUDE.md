# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal budget tracker application for managing fixed expenses in DKK (Danish Kroner). Single-page React application built with Vite, focusing on annual budget planning with monthly/quarterly/yearly expense tracking.

**Technology Stack**:
- React 19.1.1 with Hooks
- Vite 7.1.7 (build tool with HMR)
- ESLint 9.36.0 (code quality)
- Recharts 3.2.1 (charting library)
- React Modal 3.16.3 (modal dialogs)
- Supabase 2.74.0 (planned backend integration)
- PGlite 0.3.10 (local PostgreSQL)

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
│   │   ├── Header.jsx/css   # App header
│   │   ├── Settings.jsx/css # Settings section
│   │   ├── SummaryCards.jsx/css # Budget summary cards
│   │   ├── ExpensesTable.jsx/css # Main expenses table
│   │   ├── MonthlyOverview.jsx/css # Monthly breakdown
│   │   ├── AddExpenseModal.jsx/css # Modal for adding expenses
│   │   └── ErrorBoundary.jsx/css # Error handling wrapper
│   ├── hooks/               # Custom React hooks
│   │   ├── useExpenses.js  # Expense CRUD + undo/redo
│   │   ├── useAlert.js     # Alert notifications
│   │   └── useLocalStorage.js # Storage operations
│   ├── utils/              # Pure utility functions
│   │   ├── constants.js    # App constants
│   │   ├── calculations.js # Budget calculations
│   │   ├── validators.js   # Input validation
│   │   └── exportHelpers.js # CSV export logic
│   ├── App.jsx            # Main app orchestration
│   ├── App.css            # Comprehensive styling with responsive design
│   ├── index.css          # Global styles
│   └── main.jsx           # React entry point
├── public/              # Static assets
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite configuration
├── eslint.config.js     # ESLint rules
└── CLAUDE.md           # This file
```

## Architecture & State Management

**Modular Component Architecture**: Refactored from 530-line monolithic App.jsx into component-based architecture with separation of concerns.

**State Management** (via custom hooks):
- **`useExpenses()`**: Complete expense CRUD operations with undo/redo history
  - `expenses`: Array of expense objects `{id, name, amount, frequency, startMonth, endMonth}`
  - `selectedExpenses`: Array of expense IDs for bulk operations
  - `addExpense(expenseData)`: Adds new expense (optional data parameter), inserts at top of table
  - `updateExpense()`, `deleteExpense()`, `deleteSelected()`
  - `undo()`, `redo()`: Full history tracking with keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)

- **`useAlert()`**: Centralized notification system
  - `alert`: Current notification `{message, type}`
  - `showAlert()`: Display notification with auto-dismiss

- **`useLocalStorage()`**: Generic localStorage operations
  - `savedData`: Current saved state
  - `saveData()`, `loadData()`, `clearData()`: Storage operations with error handling

**Global State** (App.jsx):
- `monthlyPayment`: Fixed monthly deposit (default: 5700 kr.)
- `previousBalance`: Carryover from previous year (default: 4831 kr.)

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
   - Logic:
     - Returns 0 if month outside startMonth/endMonth
     - `yearly`: Amount on startMonth only
     - `quarterly`: Amount on quarter months only
     - `monthly`: Amount every month in range

3. **`calculateSummary(expenses, monthlyPayment, previousBalance)`**
   - Computes budget overview metrics
   - Returns: `{totalAnnual, avgMonthly, monthlyBalance, annualReserve}`
   - All values rounded to whole numbers

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

**Data Persistence** ([hooks/useLocalStorage.js](src/hooks/useLocalStorage.js)):
- **LocalStorage key**: `budgetData2025`
- **Stored data**: `{expenses, monthlyPayment, previousBalance, savedDate}`
- **Operations**: `saveData()`, `loadData()`, `clearData()` with error handling
- **Export**: CSV with UTF-8 BOM (`\ufeff`) for Excel compatibility ([utils/exportHelpers.js](src/utils/exportHelpers.js))

## UI Components & Features

### Component Overview

All components follow modular architecture with separate CSS files:

1. **[Header.jsx](src/components/Header.jsx)** - App title and branding
2. **[Settings.jsx](src/components/Settings.jsx)** - Monthly payment and previous balance inputs
3. **[SummaryCards.jsx](src/components/SummaryCards.jsx)** - 4 budget summary cards
4. **[ExpensesTable.jsx](src/components/ExpensesTable.jsx)** - Main expenses table with inline editing and highlight animation
5. **[MonthlyOverview.jsx](src/components/MonthlyOverview.jsx)** - 12-month expense breakdown
6. **[AddExpenseModal.jsx](src/components/AddExpenseModal.jsx)** - Modal dialog for adding expenses with validation
7. **[Alert.jsx](src/components/Alert.jsx)** - Notification system
8. **[ErrorBoundary.jsx](src/components/ErrorBoundary.jsx)** - Error handling wrapper

### Settings Section
- Monthly payment input with validation
- Previous balance input with validation
- Real-time updates to summary calculations

### Summary Cards (4 cards)
- **Årlige udgifter**: Total annual expenses
- **Gennemsnitlig månedlig udgift**: Average monthly expense
- **Månedlig balance**: Monthly surplus/deficit (green/red indicator)
- **Årlig reserve**: Annual reserve including previous balance

### Add Expense Modal
- **Modal dialog** for adding new expenses (using react-modal)
- **Form fields** with real-time validation:
  - Udgiftsnavn (auto-focused text input)
  - Beløb (number input with min: 0)
  - Frekvens (dropdown: Månedlig/Kvartalsvis/Årlig)
  - Start/Slut måned (auto-validating dropdowns)
- **Error messages** display inline with red styling
- **Keyboard support**: Enter to submit, Escape to cancel
- **Accessible**: ARIA labels, focus management, focus trap
- **Mobile-responsive**: Full-screen on small devices
- **Animations**: Fade-in overlay, slide-up modal

### Expenses Table
- Editable inline inputs for all fields
- **New row highlight**: 2-second green flash animation for newly added expenses
- **Top insertion**: New expenses appear at top of table (most recent first)
- Bulk selection with checkboxes
- Individual delete buttons with confirmation
- Column validation (month ranges auto-adjust)
- Undo/Redo buttons (keyboard: Ctrl+Z, Ctrl+Shift+Z)
- Delete selected button (bulk operations)

### Monthly Overview Table
- 12-month breakdown per expense
- Shows amounts or "-" for inactive months
- Totals row at bottom
- Horizontal scroll on mobile
- Responsive design with sticky headers

### Alert System
- Types: success (green), error (red), info (blue)
- Auto-dismiss after 3 seconds
- Fixed position top-right
- Slide-in animation
- Managed via [useAlert](src/hooks/useAlert.js) hook

### Error Handling
- ErrorBoundary wraps entire app
- Graceful error recovery with user-friendly messages
- Reset functionality to recover from crashes
- Technical details in collapsible section

## User Interactions

### Adding Expenses
**Modal-Based UX Flow** (Improved):
- Click "➕ Tilføj ny udgift" button (or press Ctrl+N)
- Modal dialog opens with pre-filled form fields:
  - **Udgiftsnavn**: Auto-focused text input
  - **Beløb**: Number input (default: 100 kr., min: 0)
  - **Frekvens**: Dropdown (Månedlig/Kvartalsvis/Årlig)
  - **Start/Slut måned**: Dropdowns with auto-validation
- Real-time validation with error messages
- Submit with "➕ Tilføj udgift" button (or press Enter)
- Cancel with "Annuller" button (or press Escape)
- New expense inserts at **top** of table (immediately visible)
- 2-second green highlight animation on new row
- Success alert notification
- Can undo with Ctrl+Z

**Keyboard Shortcuts**:
- `Ctrl+N` (or `Cmd+N`): Open add expense modal
- `Enter`: Submit form (when in modal)
- `Escape`: Close modal without saving

### Editing Expenses
- **Name**: Direct text input with real-time updates
- **Amount**: Number input (minimum 0, validated)
- **Frequency**: Dropdown (Månedlig/Kvartalsvis/Årlig)
- **Months**: Dropdown with auto-validation (start/end range)
- All edits can be undone/redone

### Deleting Expenses
- **Single**: Click "Slet" button with confirmation dialog
- **Bulk**: Select multiple → "🗑️ Slet valgte" with confirmation
- Confirmation dialog before deletion
- Success alert after deletion
- Can undo deletion with Ctrl+Z

### Undo/Redo Operations
- **Undo**: Ctrl+Z (Cmd+Z on Mac) or click "↶ Fortryd" button
- **Redo**: Ctrl+Shift+Z (Cmd+Shift+Z on Mac) or click "↷ Gentag" button
- Buttons only visible when operations available
- Works for: add, edit, delete operations
- Full history tracking

### Keyboard Shortcuts Summary
- **Ctrl+N** (Cmd+N): Open add expense modal
- **Ctrl+Z** (Cmd+Z): Undo last operation
- **Ctrl+Shift+Z** (Cmd+Shift+Z): Redo operation
- **Enter**: Submit add expense form (when modal is open)
- **Escape**: Close modal without saving

### Data Operations
- **💾 Gem lokalt**: Save to localStorage with success feedback
- **📁 Hent gemt data**: Load from localStorage with validation
- **📊 Eksporter til CSV**: Download CSV with full breakdown and UTF-8 BOM

## Styling System

**Color Palette**:
- Primary gradient: `#667eea` → `#764ba2` (purple)
- Success: `#10b981` (green)
- Error: `#ef4444` (red)
- Info: `#3b82f6` (blue)
- Neutral grays: `#f9fafb`, `#e5e7eb`, `#374151`, `#1f2937`

**Layout**:
- Max width: 1400px
- Gradient background (full viewport)
- White content container with shadow
- Responsive grid for summary cards and settings

**Responsive Breakpoints**:
- Desktop: Default (>768px)
- Tablet: 768px
- Mobile: 480px

**Key CSS Classes**:
- `.summary-card`: Hover effect with translateY
- `.btn`: Consistent button styling with hover animations
- `.alert`: Fixed position with slide-in keyframe
- `.table-container`: Horizontal scroll with sticky headers

## Language & Localization

**Language**: Entirely in Danish (da-DK)

**Month Names**: `["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"]`

**Danish UI Text Examples**:
- "Månedlig indbetaling til budgetkonto"
- "Overført fra sidste år"
- "Årlige udgifter"
- "Gennemsnitlig månedlig udgift"
- "Er du sikker på at du vil slette...?"
- "Data gemt lokalt i din browser!"

**Date Formatting**: `da-DK` locale for `toLocaleDateString()`

**When modifying**: Maintain Danish language consistency in all UI text, alerts, and exported CSV headers.

## Key Behaviors & Validation

### Month Range Validation ([utils/validators.js](src/utils/validators.js))
- Automatic range adjustment via `validateMonthRange()`
- When `startMonth` changes:
  - If `startMonth > endMonth`: Auto-adjust `endMonth = startMonth`
- When `endMonth` changes:
  - If `endMonth < startMonth`: Clamp `endMonth = startMonth`
- Range validation: 1 ≤ month ≤ 12

### Amount Validation ([utils/validators.js](src/utils/validators.js))
- `validateAmount()` ensures minimum 0 kr.
- Uses `parseFloat()` with fallback to 0
- Invalid inputs sanitized to 0
- Non-numeric values rejected

### Expense Validation ([utils/validators.js](src/utils/validators.js))
- `validateExpense()`: Complete object validation
- `sanitizeExpense()`: Data normalization
- Ensures all required fields present
- Type checking for amounts and months

### CSV Export Format ([utils/exportHelpers.js](src/utils/exportHelpers.js))
- UTF-8 BOM: `\ufeff` (first character for Excel compatibility)
- Three sections:
  1. Summary table (expense, amount, frequency, months, annual)
  2. Monthly breakdown (12 columns + total)
  3. Summary stats (annual, monthly payment, previous balance)
- Filename: `budget_2025_YYYY-MM-DD.csv`
- Generated by `generateCSV()`, downloaded via `downloadCSV()`

### LocalStorage Error Handling ([hooks/useLocalStorage.js](src/hooks/useLocalStorage.js))
- Try-catch blocks for all storage operations
- User-friendly error alerts in Danish
- Console logging for debugging
- Graceful fallback to initial state on load errors
- Success feedback for save operations

## Initial Data

Default expenses (14 items) include:
- Sats Danmark: 360 kr./month
- 3 Danmark: 160 kr./month (May-Dec)
- IDA Fagforening: 3,460 kr./year (Feb)
- Akademikernes A-kasse: 1,497 kr./quarter
- Various insurance and subscriptions

See [utils/constants.js](src/utils/constants.js) for complete default data.

## Recent Improvements

**Modular Refactoring** (completed):
- ✅ Component-based architecture (7 components)
- ✅ Custom hooks (useExpenses, useAlert, useLocalStorage)
- ✅ Pure utility functions (calculations, validators, exportHelpers)
- ✅ Undo/Redo functionality with keyboard shortcuts
- ✅ ErrorBoundary for graceful error recovery
- ✅ Enhanced accessibility (ARIA labels, keyboard nav)
- ✅ Improved validation and error handling

**Metrics**:
- App.jsx reduced: 530 → 218 lines (59% reduction)
- Total codebase: ~1800 lines (modular, maintainable)
- ESLint: Clean, no errors
- Build size: 210.24 KB (compressed: 65.94 KB)

## Future Enhancements

**Phase 1 - Enhanced Features**:
- Expense categories with color coding
- Search/filter expenses
- Charts visualization (Recharts)
- Dark mode support
- Multi-year comparison
- Import CSV functionality

**Phase 2 - Backend Integration**:
- Supabase cloud sync and multi-device support
- PGlite local database for enhanced offline functionality
- Offline-first architecture
- Conflict resolution

**Phase 3 - Advanced Features**:
- Recurring expense templates
- Budget forecasting
- Email notifications
- Expense attachments
- Budget sharing
- Export to PDF

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
- Accessibility: ARIA labels, keyboard support, semantic HTML
- JSDoc comments for all functions

**Architecture Principles**:
- Component-based modular design
- Separation of concerns (UI, logic, utilities)
- Single Responsibility Principle
- DRY (Don't Repeat Yourself)
- Pure functions for calculations and validation

## Common Modification Patterns

### Adding a New Feature
1. Determine if state management needed → Add to appropriate hook or create new hook
2. Create pure functions in [utils/](src/utils/) if logic is reusable
3. Create new component in [components/](src/components/) or modify existing
4. Add component-specific CSS file
5. Import and integrate in [App.jsx](src/App.jsx)
6. Test undo/redo if modifying expense data
7. Maintain Danish language consistency

### Adding a New Component
1. Create `ComponentName.jsx` in [src/components/](src/components/)
2. Create corresponding `ComponentName.css`
3. Follow existing prop patterns (pass callbacks, not setState directly)
4. Add JSDoc comments for props
5. Export component for use in App.jsx

### Modifying Calculations
- Core functions in [utils/calculations.js](src/utils/calculations.js)
- Pure functions: `calculateAnnualAmount`, `getMonthlyAmount`, `calculateSummary`, `calculateMonthlyTotals`
- All financial calculations in whole kroner (no decimals in display)
- Use `Math.round()` for final values
- Add unit tests for new calculation logic

### Adding Validation
- Add new validators to [utils/validators.js](src/utils/validators.js)
- Follow pattern: `validateX(input)` returns validated value
- Use in hooks or components before state updates
- Provide user feedback via alerts for validation errors

### Styling Changes
- Modify component-specific CSS files
- Follow existing color palette (purple gradient primary)
- Maintain responsive breakpoints (480px, 768px)
- Test on mobile (table scrolling is critical)
- Keep hover effects consistent (translateY, color transitions)

## Debugging Tips

**Common Issues**:
1. **Month validation**: Check [validators.js](src/utils/validators.js) `validateMonthRange()`
2. **Quarterly calculation**: Verify months 1, 4, 7, 10 in [calculations.js](src/utils/calculations.js)
3. **CSV encoding**: Ensure UTF-8 BOM is preserved in [exportHelpers.js](src/utils/exportHelpers.js)
4. **LocalStorage quota**: Browser limits (~5-10MB), check [useLocalStorage.js](src/hooks/useLocalStorage.js)
5. **Undo/Redo**: Check history state in [useExpenses.js](src/hooks/useExpenses.js)
6. **Component errors**: Check ErrorBoundary for caught errors

**Debugging Strategy**:
- **Pure functions**: Easy to test in isolation (utils/)
- **Hook debugging**: Use React DevTools to inspect hook state
- **Component props**: Verify prop drilling from App.jsx to components
- **Error boundary**: Check console for caught errors with stack traces
- **Alert debugging**: Check [useAlert.js](src/hooks/useAlert.js) for notification issues

**Testing Checklist**:
- [ ] Add/edit/delete expenses
- [ ] Undo/Redo operations (Ctrl+Z, Ctrl+Shift+Z)
- [ ] Month range validation and auto-adjustment
- [ ] Bulk selection and deletion
- [ ] LocalStorage save/load with error handling
- [ ] CSV export opens in Excel correctly with proper encoding
- [ ] Responsive design on mobile (table scrolling)
- [ ] Alert messages appear and auto-dismiss
- [ ] ErrorBoundary catches and displays errors gracefully
- [ ] Keyboard shortcuts work correctly
