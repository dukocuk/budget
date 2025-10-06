# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal budget tracker application for managing fixed expenses in DKK (Danish Kroner). Single-page React application built with Vite, focusing on annual budget planning with monthly/quarterly/yearly expense tracking.

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

## Architecture & State Management

**Single Component Architecture**: Entire application in `App.jsx` - no router, no separate components.

**State Structure**:
- `expenses`: Array of expense objects with `{id, name, amount, frequency, startMonth, endMonth}`
- `monthlyPayment`: Fixed monthly deposit to budget account
- `previousBalance`: Carryover from previous year
- `selectedExpenses`: Array of expense IDs for bulk operations
- `nextId`: Auto-increment ID generator

**Core Business Logic**:
- `calculateAnnualAmount(expense)`: Converts any frequency (monthly/quarterly/yearly) to annual total
- `getMonthlyAmount(expense, month)`: Returns expense amount for specific month (0 if outside range)
- `calculateSummary()`: Computes totalAnnual, avgMonthly, monthlyBalance, annualReserve

**Frequency Types**:
- `monthly`: Charged every month within start/end range
- `quarterly`: Charged on months 1, 4, 7, 10 within start/end range
- `yearly`: Single charge on startMonth

**Data Persistence**:
- LocalStorage key: `budgetData2025`
- Stores: expenses, monthlyPayment, previousBalance, savedDate
- Export: CSV with UTF-8 BOM for Excel compatibility

## Language & Localization

UI is entirely in Danish (da-DK):
- Month names: `["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"]`
- Date formatting: `da-DK` locale
- Alert messages and labels in Danish

When modifying UI text or adding features, maintain Danish language consistency.

## Key Behaviors

**Month Range Validation**: When changing `startMonth` > `endMonth`, endMonth auto-adjusts. When changing `endMonth` < `startMonth`, value is clamped to startMonth.

**Alert System**: 3-second auto-dismissing notifications with types: success, error, info.

**CSV Export**: Includes UTF-8 BOM (`\ufeff`) for proper Danish character rendering in Excel.
