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
│   ├── App.jsx          # Main application component (530 lines)
│   ├── App.css          # Comprehensive styling with responsive design
│   ├── index.css        # Global styles
│   └── main.jsx         # React entry point
├── public/              # Static assets
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── vite.config.js       # Vite configuration
├── eslint.config.js     # ESLint rules
└── CLAUDE.md           # This file
```

## Architecture & State Management

**Single Component Architecture**: Entire application in [App.jsx](src/App.jsx) - no router, no separate components. This simplifies state management and reduces complexity for a focused budgeting tool.

**State Structure** (all managed with `useState`):
- `expenses`: Array of expense objects with `{id, name, amount, frequency, startMonth, endMonth}`
- `monthlyPayment`: Fixed monthly deposit to budget account (default: 5700 kr.)
- `previousBalance`: Carryover from previous year (default: 4831 kr.)
- `selectedExpenses`: Array of expense IDs for bulk operations
- `alert`: Current alert notification `{message, type}`
- `nextId`: Auto-increment ID generator (starts at 15)

**Core Business Logic Functions**:

1. **`calculateAnnualAmount(expense)`** - [App.jsx:38](src/App.jsx#L38)
   - Converts any frequency to annual total
   - Returns: number (annual amount in kr.)
   - Logic:
     - `yearly`: Returns amount directly
     - `quarterly`: Counts quarters (Jan, Apr, Jul, Oct) within date range
     - `monthly`: Multiplies amount by months in range

2. **`getMonthlyAmount(expense, month)`** - [App.jsx:58](src/App.jsx#L58)
   - Returns expense amount for specific month (1-12)
   - Returns: number (0 if outside range)
   - Logic:
     - Returns 0 if month outside startMonth/endMonth
     - `yearly`: Amount on startMonth only
     - `quarterly`: Amount on quarter months only
     - `monthly`: Amount every month in range

3. **`calculateSummary()`** - [App.jsx:72](src/App.jsx#L72)
   - Computes budget overview metrics
   - Returns: `{totalAnnual, avgMonthly, monthlyBalance, annualReserve}`
   - All values rounded to whole numbers

**Frequency Types**:
- `monthly`: Charged every month within start/end range
- `quarterly`: Charged on months 1, 4, 7, 10 within start/end range
- `yearly`: Single charge on startMonth

**Data Persistence**:
- **LocalStorage key**: `budgetData2025`
- **Stored data**: `{expenses, monthlyPayment, previousBalance, savedDate}`
- **Load/Save**: [saveToLocal()](src/App.jsx#L175), [loadFromLocal()](src/App.jsx#L192)
- **Export**: CSV with UTF-8 BOM (`\ufeff`) for Excel compatibility

## UI Components & Features

### 1. Settings Section
- Monthly payment input
- Previous balance input
- Located in `.settings-section` [App.jsx:296](src/App.jsx#L296)

### 2. Summary Cards (4 cards)
- **Årlige udgifter**: Total annual expenses
- **Gennemsnitlig månedlig udgift**: Average monthly expense
- **Månedlig balance**: Monthly surplus/deficit (green/red)
- **Årlig reserve**: Annual reserve including previous balance

### 3. Expenses Table
- Editable inline inputs for all fields
- Bulk selection with checkboxes
- Individual delete buttons
- Column validation (month ranges)
- Located at [App.jsx:370](src/App.jsx#L370)

### 4. Monthly Overview Table
- 12-month breakdown per expense
- Shows amounts or "-" for inactive months
- Totals row at bottom
- Horizontal scroll on mobile
- Located at [App.jsx:469](src/App.jsx#L469)

### 5. Alert System
- Types: success (green), error (red), info (blue)
- Auto-dismiss after 3 seconds
- Fixed position top-right
- Slide-in animation
- Function: [showAlert()](src/App.jsx#L32)

## User Interactions

### Adding Expenses
- Click "➕ Tilføj ny udgift" button
- Creates default expense: "Ny udgift", 100 kr., monthly, Jan-Dec
- Auto-scrolls to bottom
- Shows success alert

### Editing Expenses
- **Name**: Direct text input
- **Amount**: Number input (minimum 0)
- **Frequency**: Dropdown (Månedlig/Kvartalsvis/Årlig)
- **Months**: Dropdown with auto-validation

### Deleting Expenses
- **Single**: Click "Slet" button with confirmation
- **Bulk**: Select multiple → "🗑️ Slet valgte"
- Confirmation dialog before deletion
- Success alert after deletion

### Data Operations
- **💾 Gem lokalt**: Save to localStorage
- **📁 Hent gemt data**: Load from localStorage
- **📊 Eksporter til CSV**: Download CSV with full breakdown

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

### Month Range Validation ([App.jsx:109](src/App.jsx#L109))
- When `startMonth` changes:
  - If `startMonth > endMonth`: Auto-adjust `endMonth = startMonth`
- When `endMonth` changes:
  - If `endMonth < startMonth`: Clamp `endMonth = startMonth`

### Amount Validation
- Minimum: 0 kr.
- Uses `parseFloat()` with fallback to 0
- Invalid inputs default to 0

### CSV Export Format ([App.jsx:216](src/App.jsx#L216))
- UTF-8 BOM: `\ufeff` (first character)
- Three sections:
  1. Summary table (expense, amount, frequency, months, annual)
  2. Monthly breakdown (12 columns + total)
  3. Summary stats (annual, monthly payment, previous balance)
- Filename: `budget_2025_YYYY-MM-DD.csv`

### LocalStorage Error Handling
- Try-catch blocks for save/load operations
- User-friendly error alerts in Danish
- Console logging for debugging
- Graceful fallback to initial state on load errors

## Initial Data

Default expenses (14 items) include:
- Sats Danmark: 360 kr./month
- 3 Danmark: 160 kr./month (May-Dec)
- IDA Fagforening: 3,460 kr./year (Feb)
- Akademikernes A-kasse: 1,497 kr./quarter
- Various insurance and subscriptions

See [App.jsx:5](src/App.jsx#L5) for complete list.

## Future Enhancements

Based on dependencies:
- **Supabase integration**: Cloud sync and multi-device support
- **PGlite**: Local database for enhanced offline functionality
- **Recharts**: Expense visualization and trend analysis
- **React Modal**: Enhanced dialogs for expense details

## Code Quality Standards

**ESLint Configuration**:
- React Hooks rules enforced
- React Refresh plugin for HMR
- Modern ES2020+ features

**Best Practices**:
- Functional components with Hooks
- Inline event handlers for simplicity
- Consistent error handling with try-catch
- User confirmations for destructive actions
- Accessibility: Proper labels, semantic HTML

## Common Modification Patterns

### Adding a New Feature
1. Add state with `useState` if needed
2. Create handler function (prefix with verb: add, update, delete)
3. Add UI in appropriate section
4. Update CSS in [App.css](src/App.css)
5. Test alert notifications
6. Maintain Danish language

### Modifying Calculations
- Core functions: [calculateAnnualAmount](src/App.jsx#L38), [getMonthlyAmount](src/App.jsx#L58), [calculateSummary](src/App.jsx#L72)
- All financial calculations in whole kroner (no decimals in display)
- Use `Math.round()` for final values

### Styling Changes
- Follow existing color palette
- Maintain responsive breakpoints
- Test on mobile (table scrolling is critical)
- Keep hover effects consistent

## Debugging Tips

**Common Issues**:
1. **Month validation**: Check [updateExpense](src/App.jsx#L109) logic
2. **Quarterly calculation**: Verify months 1, 4, 7, 10 in range
3. **CSV encoding**: Ensure UTF-8 BOM is preserved
4. **LocalStorage quota**: Browser limits (~5-10MB)
5. **Alert timing**: 3-second timeout in [showAlert](src/App.jsx#L32)

**Testing Checklist**:
- [ ] Add/edit/delete expenses
- [ ] Month range validation
- [ ] Bulk selection and deletion
- [ ] LocalStorage save/load
- [ ] CSV export opens in Excel correctly
- [ ] Responsive design on mobile
- [ ] Alert messages appear and dismiss
