# User Stories - Budget Tracker

**Generated:** 2026-01-31
**Purpose:** Comprehensive user stories covering all possible user interactions for test planning

---

## 1. Authentication & Access

### US-001: First-Time Login
**As a** first-time user
**I want to** sign in with my Google account
**So that** I can securely access my personal budget data

**Acceptance Criteria:**
- Login screen displays Google sign-in button
- OAuth flow completes successfully
- User is redirected to dashboard after authentication
- User profile picture and name displayed in header

### US-002: Returning User Login
**As a** returning user
**I want to** be automatically logged in if my session is active
**So that** I don't have to re-authenticate every time

**Acceptance Criteria:**
- Session persists between browser sessions
- Token automatically refreshed if valid
- User sees loading screen during initialization
- Dashboard loads with user's data

### US-003: Sign Out
**As a** logged-in user
**I want to** sign out of my account
**So that** I can secure my data on shared devices

**Acceptance Criteria:**
- Sign out button accessible in header menu
- User returned to login screen
- Local data cleared appropriately
- Confirmation message displayed

### US-004: Token Expiration
**As a** user with expired session
**I want to** be prompted to re-authenticate
**So that** I can continue working without losing data

**Acceptance Criteria:**
- Clear error message when token expires
- Automatic redirect to login
- Data saved before logout
- Session restored after re-authentication

---

## 2. Expense Management (CRUD Operations)

### US-005: Add New Monthly Expense
**As a** budget user
**I want to** add a new monthly expense with fixed amount
**So that** I can track recurring costs

**Acceptance Criteria:**
- Modal opens with "Ny udgift" button or Ctrl+N
- Fields: Name, Amount (Danish format), Frequency=Monthly
- Amount validated (positive number, comma decimal)
- Expense appears immediately in table
- Success alert displayed
- Cloud sync triggered after 1s

### US-006: Add Quarterly Expense
**As a** budget user
**I want to** add a quarterly expense (Jan/Apr/Jul/Oct)
**So that** I can track quarterly bills

**Acceptance Criteria:**
- Frequency dropdown shows "Kvartalsvis"
- Charged only on months 1, 4, 7, 10
- Start/end month range respected
- Monthly view shows charges in correct months
- Balance chart reflects quarterly pattern

### US-007: Add Yearly Expense
**As a** budget user
**I want to** add a yearly expense on specific month
**So that** I can track annual subscriptions

**Acceptance Criteria:**
- Frequency dropdown shows "Årlig"
- Start month selector enabled
- Single charge on specified month
- Amount appears only once in monthly breakdown
- Annual total calculated correctly

### US-008: Add Expense with Date Range
**As a** budget user
**I want to** set start and end months for an expense
**So that** I can track temporary subscriptions

**Acceptance Criteria:**
- Start month and end month selectors
- Validation: end month ≥ start month
- Expense only charged within range
- Months outside range show zero
- Clear visual indication of active period

### US-009: Edit Existing Expense
**As a** budget user
**I want to** edit an expense inline or via modal
**So that** I can correct mistakes or update amounts

**Acceptance Criteria:**
- Click expense row to edit
- All fields editable
- Changes saved on blur or Enter
- Real-time validation
- Undo available after edit
- Cloud sync triggered

### US-010: Delete Single Expense
**As a** budget user
**I want to** delete an expense
**So that** I can remove outdated items

**Acceptance Criteria:**
- Delete button/icon on expense row
- Confirmation dialog appears
- Expense removed from all views
- Undo available
- Balance recalculated
- Success alert displayed

### US-011: Bulk Delete Expenses
**As a** budget user
**I want to** select and delete multiple expenses at once
**So that** I can clean up my budget efficiently

**Acceptance Criteria:**
- Checkboxes on expense rows
- "Select all" option available
- Bulk delete button enabled when items selected
- Confirmation shows count
- All selected items deleted
- Single undo restores all

### US-012: Undo Expense Operation
**As a** budget user
**I want to** undo my last expense change (Ctrl+Z)
**So that** I can recover from mistakes

**Acceptance Criteria:**
- Ctrl+Z keyboard shortcut works
- Undo button in UI when available
- Works for add, edit, delete operations
- Up to 50 actions in history
- Visual feedback on undo
- canUndo state correctly tracked

### US-013: Redo Expense Operation
**As a** budget user
**I want to** redo an undone action (Ctrl+Shift+Z)
**So that** I can reapply changes

**Acceptance Criteria:**
- Ctrl+Shift+Z keyboard shortcut works
- Redo button enabled when available
- Restores previously undone change
- canRedo state correctly tracked
- Works across multiple redo steps

### US-014: Add Expense with Variable Monthly Amounts
**As a** budget user
**I want to** set different amounts for each month
**So that** I can track variable expenses accurately

**Acceptance Criteria:**
- Payment mode toggle: Fixed/Variable
- Modal with 12 month inputs
- Danish number format (1.234,56)
- Each month saved independently
- Monthly view reflects variable amounts
- Switch back to fixed mode available

### US-015: Copy Expense to New Year
**As a** budget user
**I want to** copy expenses when creating a new budget year
**So that** I don't have to re-enter recurring costs

**Acceptance Criteria:**
- Checkbox "Kopier udgifter fra tidligere år"
- All expenses from previous year copied
- IDs regenerated for new period
- Start/end months reset if needed
- Success message shows count copied

---

## 3. Budget Period/Year Management

### US-016: Create First Budget Year
**As a** first-time user
**I want to** create my first budget year
**So that** I can start tracking expenses

**Acceptance Criteria:**
- Automatic prompt or manual creation
- Year input (defaults to current year)
- Monthly payment input (Danish format)
- Previous balance defaults to 0
- Budget period created in database
- User redirected to new period

### US-017: Create New Budget Year with Balance Carryover
**As a** budget user starting a new year
**I want to** carry forward my ending balance automatically
**So that** I have accurate starting balance

**Acceptance Criteria:**
- "Opret nyt år" button in year selector
- Suggests next year (e.g., 2026 if 2025 exists)
- Auto-calculates ending balance from previous year
- Previous balance pre-filled in modal
- Formula: prev_balance + (monthly × 12) - expenses
- Handles variable monthly payments

### US-018: Switch Between Budget Years
**As a** budget user with multiple years
**I want to** switch between different budget years
**So that** I can view historical or future budgets

**Acceptance Criteria:**
- Year selector dropdown in header
- Lists all years (newest first)
- Shows status badges (✅ Active / 📦 Archived)
- Clicking year reloads all data
- Dashboard, charts, tables update
- Active year highlighted

### US-019: Archive Budget Year
**As a** budget user at year end
**I want to** archive a budget year
**So that** I prevent accidental changes to historical data

**Acceptance Criteria:**
- Archive button in Settings tab
- Confirmation dialog
- Year status changes to 'archived'
- Read-only banner appears
- All edit/delete buttons disabled
- Can still view all data and charts

### US-020: View Archived Year (Read-Only)
**As a** budget user viewing archived year
**I want to** see all data but unable to edit
**So that** I can reference history safely

**Acceptance Criteria:**
- Banner: "📦 Dette er et arkiveret budgetår (YEAR) - kun visning"
- Expense table shows data, no edit capability
- Settings fields disabled
- Charts and visualizations work normally
- Export still available
- Clear visual feedback of read-only state

### US-021: Update Budget Settings (Monthly Payment)
**As a** budget user
**I want to** change my monthly payment amount
**So that** I can reflect income changes

**Acceptance Criteria:**
- Settings tab has monthly payment field
- Danish number format validation
- Changes saved to database
- Balance projections recalculate
- Charts update immediately
- Success alert displayed
- Cloud sync triggered

### US-022: Update Previous Balance
**As a** budget user
**I want to** adjust the starting balance for a year
**So that** I can correct initial values

**Acceptance Criteria:**
- Previous balance field in settings
- Danish number format
- Immediate recalculation of projections
- All charts and summaries update
- Validation: allows negative values
- Saved to database

---

## 4. Templates

### US-023: Save Current Budget as Template
**As a** budget user with established expenses
**I want to** save my current budget as a template
**So that** I can reuse it for other years

**Acceptance Criteria:**
- "Gem som skabelon" button
- Template name input
- Current expenses stored as template
- Template appears in template list
- Can be applied to new years

### US-024: Load Template into Budget
**As a** budget user creating new year
**I want to** load a template
**So that** I can quickly populate common expenses

**Acceptance Criteria:**
- Template selector in creation modal
- Preview of template expenses
- One-click apply
- Expenses copied with new IDs
- Success message with count
- Existing expenses not affected

### US-025: Manage Templates (View/Edit/Delete)
**As a** budget user
**I want to** manage my saved templates
**So that** I can keep them up-to-date

**Acceptance Criteria:**
- Template manager modal
- List all templates
- Edit template name and expenses
- Delete template with confirmation
- Preview template contents
- Templates persisted to cloud

---

## 5. Cloud Sync

### US-026: Automatic Cloud Sync After Changes
**As a** budget user making changes
**I want to** have my data automatically backed up to Google Drive
**So that** I don't lose work

**Acceptance Criteria:**
- Changes sync after 1s debounce
- Sync indicator shows "Synkroniserer..."
- Success: timestamp updated "Sidst synkroniseret: X"
- Failure: error indicator with retry option
- Works for expenses and settings
- No user intervention required

### US-027: Multi-Device Sync (Polling)
**As a** multi-device user
**I want to** see changes from other devices automatically
**So that** my budget stays consistent

**Acceptance Criteria:**
- 30-second polling interval
- Detects remote changes via hash comparison
- Downloads and applies updates
- Local changes not overwritten if recent
- Notification when remote changes applied
- Last-write-wins conflict resolution

### US-028: Manual Sync Trigger
**As a** budget user
**I want to** manually trigger a sync
**So that** I can force an immediate backup

**Acceptance Criteria:**
- Sync button in header or settings
- Initiates immediate upload/download
- Visual feedback during sync
- Success/error notification
- Timestamp updates
- Works when online only

### US-029: Offline Mode Indication
**As a** budget user without internet
**I want to** see clear offline status
**So that** I know sync is pending

**Acceptance Criteria:**
- Offline indicator in header
- Sync status shows "Offline"
- All local operations still work
- Changes queued for sync
- Automatic sync when online
- No errors for failed sync attempts

### US-030: Sync Failure Recovery
**As a** budget user with sync errors
**I want to** retry failed syncs
**So that** my data is eventually backed up

**Acceptance Criteria:**
- Error indicator shows issue
- Retry button available
- Error message explains problem
- Manual retry or automatic retry
- Success after retry updates status
- Local data never lost

---

## 6. Import/Export (CSV)

### US-031: Export Budget to CSV
**As a** budget user
**I want to** export my budget to CSV
**So that** I can analyze in Excel or backup

**Acceptance Criteria:**
- Export button in settings/menu
- Filename: `budget_{YEAR}_{DATE}.csv`
- UTF-8 BOM for Excel compatibility
- Contains: expenses, settings, monthly breakdown
- Danish number format (comma decimals)
- Download starts immediately

### US-032: Import Expenses from CSV
**As a** budget user
**I want to** import expenses from CSV file
**So that** I can bulk-add or migrate data

**Acceptance Criteria:**
- Import button with file picker
- CSV parsing with validation
- Duplicate detection (warn user)
- Preview before import
- Error reporting for invalid rows
- Success message with import count
- Imported expenses appear in table

### US-033: Import Validation and Error Handling
**As a** budget user importing invalid CSV
**I want to** see clear error messages
**So that** I can fix and re-import

**Acceptance Criteria:**
- Row-by-row validation
- Error report shows line numbers
- Specific error types (invalid amount, missing name, etc.)
- Partial import option (skip errors)
- Can download error log
- Clear instructions for fixes

---

## 7. Charts & Visualizations

### US-034: View Monthly Balance Chart
**As a** budget user
**I want to** see a line chart of my projected balance
**So that** I can visualize my financial trajectory

**Acceptance Criteria:**
- Chart shows 12 months (Jan-Dec)
- Y-axis: balance in DKK
- X-axis: month names (Danish)
- Line updates when expenses change
- Negative balances clearly visible
- Responsive to window size

### US-035: View Expense Breakdown Pie Chart
**As a** budget user
**I want to** see expense distribution by frequency
**So that** I understand spending patterns

**Acceptance Criteria:**
- Pie chart with 3 segments: Monthly, Quarterly, Yearly
- Percentages displayed
- Danish number formatting
- Color-coded segments
- Legend shows amounts
- Interactive tooltips

### US-036: View Year-over-Year Comparison Charts
**As a** budget user with multiple years
**I want to** compare current year to previous years
**So that** I can track financial progress

**Acceptance Criteria:**
- Comparison charts in separate view
- Side-by-side or overlay options
- Key metrics: Total expenses, balance, income
- Year selector for comparisons
- Percentage change indicators
- Danish formatting throughout

### US-037: Mobile Chart Rendering
**As a** mobile user
**I want to** view charts optimized for small screens
**So that** I can analyze data on the go

**Acceptance Criteria:**
- Charts scale to screen width
- Touch-friendly interactions
- Simplified legends on mobile
- Horizontal scrolling if needed
- Readable font sizes
- Performance optimized (<30ms render)

---

## 8. Summary Cards & Metrics

### US-038: View Total Monthly Expenses
**As a** budget user
**I want to** see total monthly expenses in a summary card
**So that** I quickly understand my spending

**Acceptance Criteria:**
- Card displays "Samlede månedlige udgifter"
- Amount in Danish format
- Updates in real-time with changes
- Clear visual hierarchy
- Accessible on dashboard

### US-039: View Annual Total
**As a** budget user
**I want to** see total annual expenses
**So that** I understand yearly costs

**Acceptance Criteria:**
- Card displays "Samlede årlige udgifter"
- Calculated from all frequencies
- Danish number formatting
- Updates automatically
- Prominent placement

### US-040: View Projected Ending Balance
**As a** budget user
**I want to** see my projected year-end balance
**So that** I can plan savings

**Acceptance Criteria:**
- Card displays "Slutsaldo"
- Formula: start + (monthly × 12) - expenses
- Color coding: green (positive), red (negative)
- Updates with all changes
- Considers variable monthly payments

### US-041: View Monthly Surplus/Deficit
**As a** budget user
**I want to** see monthly surplus or deficit
**So that** I know if I'm overspending

**Acceptance Criteria:**
- Card displays "Månedligt overskud"
- Formula: monthly payment - avg monthly expense
- Positive/negative indicators
- Color coded
- Clear labeling

---

## 9. Filtering & Search

### US-042: Search Expenses by Name
**As a** budget user with many expenses
**I want to** search by expense name
**So that** I can quickly find specific items

**Acceptance Criteria:**
- Search input field in expense manager
- Real-time filtering as typing
- Case-insensitive search
- Matches partial names
- Clear search button
- Result count displayed

### US-043: Filter by Frequency
**As a** budget user
**I want to** filter expenses by frequency (monthly/quarterly/yearly)
**So that** I can review specific categories

**Acceptance Criteria:**
- Frequency filter dropdown
- Options: All, Monthly, Quarterly, Yearly
- Table updates immediately
- Filter state persists during session
- Clear filter button
- Filter indicator visible

### US-044: Filter by Month Active
**As a** budget user
**I want to** filter expenses active in specific month
**So that** I can see what's charged each month

**Acceptance Criteria:**
- Month selector (1-12 or Danish names)
- Shows only expenses active in that month
- Respects start/end month ranges
- Frequency logic applied
- Clear indication of active month
- Reset to "All" option

### US-045: Combined Filters
**As a** budget user
**I want to** use multiple filters simultaneously
**So that** I can narrow down to specific expenses

**Acceptance Criteria:**
- Search + frequency + month filters work together
- AND logic (all conditions must match)
- Clear all filters button
- Active filter badges shown
- Result count updates
- No filters = show all

### US-046: Clear All Filters
**As a** budget user with active filters
**I want to** clear all filters at once
**So that** I can quickly return to full view

**Acceptance Criteria:**
- "Clear filters" button visible when filters active
- One click clears all filter states
- Search text cleared
- Dropdowns reset to "All"
- Full expense list restored
- Visual feedback

---

## 10. Mobile Experience

### US-047: Mobile Navigation (Bottom Tab Bar)
**As a** mobile user
**I want to** navigate via bottom tabs
**So that** I can easily switch between sections

**Acceptance Criteria:**
- Bottom tab bar on mobile devices
- Tabs: Dashboard, Expenses, Charts, Settings
- Active tab highlighted
- Icons + labels
- Fixed position during scroll
- Touch-optimized

### US-048: Mobile Expense Cards
**As a** mobile user
**I want to** see expenses as cards instead of table
**So that** content is easier to read on small screens

**Acceptance Criteria:**
- Card layout on mobile (<768px)
- Each expense in separate card
- All info visible: name, amount, frequency
- Swipe actions for delete
- Touch-friendly buttons
- Vertical scrolling

### US-049: Mobile Bottom Sheet for Add/Edit
**As a** mobile user
**I want to** use bottom sheet modals
**So that** forms are easier to use on mobile

**Acceptance Criteria:**
- Bottom sheet slides up from bottom
- Keyboard-aware (doesn't cover inputs)
- Swipe down to dismiss
- Full-height on small screens
- Smooth animations
- Touch-optimized controls

### US-050: Mobile Monthly Overview
**As a** mobile user
**I want to** view monthly breakdowns in card format
**So that** I can easily review each month

**Acceptance Criteria:**
- Monthly cards instead of table
- Horizontal scroll through months
- Each card shows: month, expenses, balance
- Danish month names
- Tap to expand details
- Swipe gesture navigation

---

## 11. Keyboard Shortcuts

### US-051: Quick Add Expense (Ctrl+N / Cmd+N)
**As a** power user
**I want to** press Ctrl+N to add expense
**So that** I can quickly enter data

**Acceptance Criteria:**
- Ctrl+N (Windows) or Cmd+N (Mac)
- Opens add expense modal
- Focus on first input field
- Works from any view
- Modal closes on Escape
- Documented in UI

### US-052: Undo Shortcut (Ctrl+Z / Cmd+Z)
**As a** power user
**I want to** press Ctrl+Z to undo
**So that** I can quickly recover from mistakes

**Acceptance Criteria:**
- Ctrl+Z (Windows) or Cmd+Z (Mac)
- Undoes last action
- Works for add/edit/delete
- Visual feedback
- Disabled when no history
- Standard behavior

### US-053: Redo Shortcut (Ctrl+Shift+Z / Cmd+Shift+Z)
**As a** power user
**I want to** press Ctrl+Shift+Z to redo
**So that** I can reapply undone changes

**Acceptance Criteria:**
- Ctrl+Shift+Z keyboard combo
- Redoes last undone action
- Visual feedback
- Disabled when no redo available
- Multiple redo steps supported

### US-054: Form Submission (Enter)
**As a** user filling forms
**I want to** press Enter to submit
**So that** I can quickly save without clicking

**Acceptance Criteria:**
- Enter key submits active form
- Works in modals and inline edits
- Validation runs before submit
- Focus management after submit
- Standard form behavior

### US-055: Modal Dismissal (Escape)
**As a** user with open modal
**I want to** press Escape to close
**So that** I can quickly cancel

**Acceptance Criteria:**
- Escape key closes active modal
- Works for all modal types
- Unsaved changes warning if applicable
- Returns focus to trigger element
- Standard modal behavior

---

## 12. Offline Mode

### US-056: Work Fully Offline
**As a** budget user without internet
**I want to** use all features offline
**So that** I can work anywhere

**Acceptance Criteria:**
- All CRUD operations work offline
- PGlite provides full functionality
- No errors or disabled features
- Changes saved locally
- Clear offline indicator
- Sync when back online

### US-057: Offline Queue Management
**As a** user working offline
**I want to** have changes automatically sync when online
**So that** I don't lose work

**Acceptance Criteria:**
- Changes queued during offline period
- Automatic sync when connection restored
- No duplicate uploads
- Queue preserved across browser refresh
- Success notification after sync
- Transparent to user

### US-058: Offline-First Performance
**As a** budget user
**I want to** see instant UI updates
**So that** the app feels fast

**Acceptance Criteria:**
- All operations <50ms
- UI updates immediately (optimistic)
- Background sync doesn't block UI
- No loading spinners for local ops
- Smooth animations
- Responsive at all times

---

## 13. Data Integrity & Validation

### US-059: Amount Validation
**As a** budget user entering amounts
**I want to** see validation errors immediately
**So that** I enter valid data

**Acceptance Criteria:**
- Danish number format (1.234,56)
- Positive numbers only (or zero)
- Clear error messages
- Red border on invalid input
- Cannot submit invalid amount
- Helpful format hint

### US-060: Date Range Validation
**As a** budget user setting date ranges
**I want to** be prevented from invalid ranges
**So that** my data is correct

**Acceptance Criteria:**
- End month ≥ start month
- Validation on change
- Clear error message
- Cannot save invalid range
- Helpful hints
- Visual feedback

### US-061: Required Field Validation
**As a** budget user creating expense
**I want to** be required to fill essential fields
**So that** data is complete

**Acceptance Criteria:**
- Name required
- Amount required
- Frequency required
- Clear required indicators (*)
- Form won't submit if missing
- Error messages specific

### US-062: Duplicate Expense Detection
**As a** budget user
**I want to** be warned about potential duplicates
**So that** I don't add items twice

**Acceptance Criteria:**
- Warning if name + amount match existing
- Can proceed anyway (override)
- Clear warning message
- Shown during add/import
- Doesn't block save
- Helps prevent errors

---

## 14. Accessibility & UX

### US-063: Responsive Design (Desktop)
**As a** desktop user
**I want to** use the app on large screens efficiently
**So that** I can see more data

**Acceptance Criteria:**
- Table layout on desktop
- Multi-column layouts
- Charts side-by-side
- No horizontal scrolling
- Optimal use of space
- Readable font sizes

### US-064: Responsive Design (Tablet)
**As a** tablet user
**I want to** use the app on medium screens
**So that** content adapts appropriately

**Acceptance Criteria:**
- Hybrid layouts (cards + tables)
- Touch-friendly buttons
- Adjusted chart sizes
- Readable on portrait/landscape
- No content cut off
- Smooth transitions

### US-065: Danish Localization
**As a** Danish user
**I want to** see all text and numbers in Danish
**So that** the app feels native

**Acceptance Criteria:**
- All UI text in Danish
- Month names in Danish
- Number format: 1.234,56 kr
- Date format: DD-MM-YYYY
- Currency: DKK
- No English fallbacks

### US-066: Loading States
**As a** user waiting for operations
**I want to** see clear loading indicators
**So that** I know the app is working

**Acceptance Criteria:**
- Unified loading screen on startup
- Progress stages: Auth → Budget → Data → Complete
- Percentage indicator
- Operation-specific spinners
- No blank screens
- Timeout handling

### US-067: Error Messages
**As a** user encountering errors
**I want to** see clear, actionable error messages
**So that** I can fix issues

**Acceptance Criteria:**
- User-friendly language (not technical)
- Specific error descriptions
- Suggested actions
- Contact info if needed
- Error boundary for crashes
- Graceful degradation

### US-068: Success Feedback
**As a** user completing actions
**I want to** see confirmation messages
**So that** I know actions succeeded

**Acceptance Criteria:**
- Toast notifications for success
- Auto-dismiss after 3-5s
- Non-intrusive placement
- Clear success icons
- Specific messages (not generic)
- Color coding (green)

---

## 15. Backup & Recovery

### US-069: View Backup History
**As a** budget user
**I want to** see all my Google Drive backups
**So that** I know my data is safe

**Acceptance Criteria:**
- Backup manager modal
- List all backups with timestamps
- File sizes shown
- Sorted newest first
- Can open in Google Drive
- Clear last backup time

### US-070: Preview Backup Contents
**As a** budget user
**I want to** preview a backup before restoring
**So that** I restore the right version

**Acceptance Criteria:**
- Preview button on each backup
- Shows expense count, year, settings
- Read-only view
- Formatted data display
- Close without restoring
- Helps verify contents

### US-071: Restore from Backup
**As a** budget user recovering data
**I want to** restore from a previous backup
**So that** I can recover lost data

**Acceptance Criteria:**
- Restore button with confirmation
- Warning about overwriting current data
- Progress indicator during restore
- Success/error messages
- Data reloaded after restore
- Backup preserved

### US-072: Automatic Backup Verification
**As a** budget user
**I want to** have backups verified automatically
**So that** I know they're valid

**Acceptance Criteria:**
- Hash verification on each backup
- Corruption detection
- Error alerts if backup fails
- Retry mechanism
- Status indicator shows backup health
- Logs backup events

---

## 16. Advanced Features

### US-073: Variable Monthly Payments
**As a** budget user with irregular income
**I want to** set different monthly payment for each month
**So that** projections are accurate

**Acceptance Criteria:**
- Payment mode toggle in settings
- 12 separate input fields
- Danish format validation
- Monthly view uses variable amounts
- Balance projections accurate
- Can switch back to fixed

### US-074: Copy Settings Between Years
**As a** budget user creating new year
**I want to** copy settings from previous year
**So that** setup is faster

**Acceptance Criteria:**
- Checkbox "Copy settings from previous year"
- Monthly payment copied
- Variable payments copied if applicable
- Templates available
- Can edit after copy
- Clear feedback

### US-075: Multi-Year Analytics
**As a** budget user with history
**I want to** analyze trends across multiple years
**So that** I understand long-term patterns

**Acceptance Criteria:**
- Year comparison view
- Line charts showing trends
- Key metrics: expenses, balance, surplus
- Year-over-year percentages
- Filterable by expense category
- Exportable reports

### US-076: Expense Notes/Comments
**As a** budget user
**I want to** add notes to expenses
**So that** I can remember context

**Acceptance Criteria:**
- Optional notes field on expense
- Visible in table/card views
- Searchable
- Synced to cloud
- Character limit (e.g., 500)
- Rich text optional

### US-077: Budget Alerts/Notifications
**As a** budget user
**I want to** receive alerts when exceeding budget
**So that** I can adjust spending

**Acceptance Criteria:**
- Alert threshold setting
- Notification when balance negative
- Monthly expense warnings
- Alert preferences (on/off)
- Clear, actionable messages
- Not intrusive

### US-078: Expense Categories/Tags
**As a** budget user
**I want to** categorize expenses (housing, transport, etc.)
**So that** I can analyze by category

**Acceptance Criteria:**
- Category field on expense
- Predefined categories + custom
- Filter by category
- Category breakdown charts
- Color-coded
- Category totals

---

## 17. Settings & Configuration

### US-079: View Current Settings
**As a** budget user
**I want to** view all my settings in one place
**So that** I understand my configuration

**Acceptance Criteria:**
- Settings modal/page
- All settings grouped logically
- Current year info (year, status)
- Monthly payment display
- Previous balance display
- Sync settings

### US-080: Change Monthly Payment
**As a** budget user with income change
**I want to** update my monthly payment
**So that** projections reflect reality

**Acceptance Criteria:**
- Monthly payment field editable
- Danish number validation
- Immediate effect on projections
- Saved to database
- Synced to cloud
- Success feedback

### US-081: Reset Settings to Defaults
**As a** budget user
**I want to** reset settings to defaults
**So that** I can start fresh

**Acceptance Criteria:**
- Reset button with confirmation
- Warning about data loss
- Default values documented
- Expenses not affected
- Settings synced after reset
- Success message

---

## 18. Performance & Optimization

### US-082: Fast Operation Response (<50ms)
**As a** budget user
**I want to** see instant responses to actions
**So that** the app feels responsive

**Acceptance Criteria:**
- CRUD operations <50ms
- Graph rendering <30ms
- Search/filter instant
- No perceptible lag
- Smooth animations (60fps)
- Performance monitoring

### US-083: Efficient Rendering (No Unnecessary Re-renders)
**As a** budget user with many expenses
**I want to** not experience slowdowns
**So that** the app stays fast

**Acceptance Criteria:**
- React.memo used appropriately
- useMemo for calculations
- useCallback for functions
- Minimal re-renders
- Profiler shows efficiency
- <100ms for complex views

---

## 19. Edge Cases & Error Handling

### US-084: Handle Empty State (No Expenses)
**As a** new budget user with no expenses
**I want to** see helpful empty state
**So that** I know what to do

**Acceptance Criteria:**
- Empty state graphic/message
- Call-to-action: "Add first expense"
- Helpful tips
- Not just blank screen
- Welcoming tone
- Easy to start

### US-085: Handle Large Dataset (500+ Expenses)
**As a** long-time user with many expenses
**I want to** maintain good performance
**So that** I can continue using the app

**Acceptance Criteria:**
- Virtualized lists if needed
- Pagination or infinite scroll
- No slowdowns
- Search/filter still fast
- Exports work correctly
- Database optimized

### US-086: Handle Network Interruption During Sync
**As a** user with unstable connection
**I want to** not lose data during sync failures
**So that** my work is safe

**Acceptance Criteria:**
- Sync resumes after reconnection
- No data loss
- Clear error messages
- Retry logic
- Queue preserved
- Eventually consistent

### US-087: Handle Browser Storage Limits
**As a** user approaching storage limits
**I want to** be warned before issues
**So that** I can take action

**Acceptance Criteria:**
- Monitor storage usage
- Warning at 80% capacity
- Error at 100%
- Suggest cleanup actions
- Cloud backup reminder
- Graceful handling

### US-088: Handle Concurrent Edits (Multi-Device Conflict)
**As a** multi-device user editing simultaneously
**I want to** have conflicts resolved automatically
**So that** I don't lose changes

**Acceptance Criteria:**
- Last-write-wins strategy
- No data corruption
- Notification of conflict
- Timestamp comparison
- Both changes preserved in history
- User can undo if needed

---

## 20. Security & Privacy

### US-089: Secure Token Storage
**As a** security-conscious user
**I want to** have my auth tokens stored securely
**So that** my account is protected

**Acceptance Criteria:**
- Tokens stored securely (not localStorage)
- HTTPOnly cookies if possible
- Automatic expiration
- Refresh token rotation
- No tokens in logs
- HTTPS only

### US-090: User Data Isolation
**As a** budget user
**I want to** only see my own data
**So that** my privacy is protected

**Acceptance Criteria:**
- All queries filter by user_id
- No cross-user data access
- Google Drive per-user isolation
- No data leakage
- Audit trail if needed
- Security tested

### US-091: Secure Cloud Storage
**As a** budget user
**I want to** have my Google Drive data encrypted
**So that** it's private

**Acceptance Criteria:**
- Data encrypted at rest (Google's encryption)
- Private folder access only
- No public sharing
- OAuth scopes minimal
- Secure API calls
- HTTPS for all requests

---

## Summary Statistics

**Total User Stories:** 91
**Categories:** 20
**Estimated Test Scenarios:** 300+ (including variations and negative cases)

---

## Test Coverage Map

| Category | User Stories | Priority | Test Complexity |
|----------|--------------|----------|-----------------|
| Authentication & Access | US-001 to US-004 | Critical | Medium |
| Expense Management (CRUD) | US-005 to US-015 | Critical | High |
| Budget Period/Year Management | US-016 to US-022 | High | High |
| Templates | US-023 to US-025 | Medium | Medium |
| Cloud Sync | US-026 to US-030 | Critical | Very High |
| Import/Export | US-031 to US-033 | Medium | Medium |
| Charts & Visualizations | US-034 to US-037 | High | Medium |
| Summary Cards | US-038 to US-041 | High | Low |
| Filtering & Search | US-042 to US-046 | Medium | Medium |
| Mobile Experience | US-047 to US-050 | High | High |
| Keyboard Shortcuts | US-051 to US-055 | Low | Low |
| Offline Mode | US-056 to US-058 | Critical | Very High |
| Data Validation | US-059 to US-062 | Critical | Medium |
| Accessibility & UX | US-063 to US-068 | High | Medium |
| Backup & Recovery | US-069 to US-072 | High | High |
| Advanced Features | US-073 to US-078 | Low | Medium |
| Settings | US-079 to US-081 | Medium | Low |
| Performance | US-082 to US-083 | High | High |
| Edge Cases | US-084 to US-088 | High | Very High |
| Security & Privacy | US-089 to US-091 | Critical | High |

---

## Notes for Test Planning

### Testing Approach Recommendations

1. **Unit Tests** (Already 679 passing)
   - Focus on: calculations.js, validators.js, hooks
   - Continue with: utilities, helpers, pure functions

2. **Integration Tests** (Recommended)
   - User stories US-005 to US-015 (Expense CRUD flow)
   - US-026 to US-030 (Cloud sync workflows)
   - US-056 to US-058 (Offline-online transitions)

3. **End-to-End Tests** (High Value)
   - US-001 to US-004 (Authentication flows)
   - US-016 to US-020 (Multi-year workflows)
   - US-031 to US-033 (Import/Export)
   - US-047 to US-050 (Mobile flows)

4. **Visual Regression Tests**
   - US-034 to US-037 (Charts)
   - US-063 to US-065 (Responsive design)
   - US-047 to US-050 (Mobile UI)

5. **Performance Tests**
   - US-082 (Operation speed)
   - US-083 (Rendering efficiency)
   - US-085 (Large datasets)

### Priority Testing Order

**Phase 1 - Critical Path (MVP):**
- US-001, US-002 (Login)
- US-005, US-009, US-010 (Basic CRUD)
- US-016, US-017 (Budget creation)
- US-026 (Auto sync)
- US-056 (Offline mode)

**Phase 2 - Core Features:**
- US-006, US-007, US-008 (All frequency types)
- US-012, US-013 (Undo/redo)
- US-018, US-019, US-020 (Year management)
- US-034, US-035 (Charts)
- US-042, US-043 (Filters)

**Phase 3 - Enhanced UX:**
- US-031, US-032 (Import/Export)
- US-047 to US-050 (Mobile)
- US-051 to US-055 (Keyboard)
- US-066, US-067, US-068 (Feedback)

**Phase 4 - Advanced:**
- US-023 to US-025 (Templates)
- US-073 (Variable payments)
- US-075 (Analytics)
- US-084 to US-088 (Edge cases)

---

## Test Data Requirements

### Sample Test Users
- **New User**: No existing data, first-time flow
- **Established User**: Multiple years, 50+ expenses
- **Power User**: 200+ expenses, multiple templates, archived years
- **Multi-Device User**: Active on 2+ devices simultaneously

### Sample Budget Periods
- **2024**: Archived year (read-only testing)
- **2025**: Active year with full data
- **2026**: New year with carryover balance

### Sample Expenses
- Monthly: Netflix (79 kr), Rent (5000 kr)
- Quarterly: Insurance (500 kr)
- Yearly: Streaming service (599 kr)
- Variable: Utilities with monthly amounts
- Date-limited: Gym membership (Jan-Jun)

### Edge Cases to Test
- Expense with zero amount
- Expense spanning full year (Jan-Dec)
- Expense for single month (same start/end)
- Negative previous balance
- Very large amounts (999.999,99 kr)
- Special characters in names
- Empty/whitespace names
- Simultaneous edits from 2 devices
- Rapid undo/redo sequences
- Offline → Online with queued changes

---

## Mapping to Existing Tests

The project already has **679 passing tests**. These user stories complement existing test coverage by providing:

1. **User perspective** - Tests verify user goals, not just technical functionality
2. **Acceptance criteria** - Clear definition of "done" for each feature
3. **Integration scenarios** - Multi-step workflows (existing tests are mostly unit tests)
4. **Edge case identification** - User stories US-084 to US-088 highlight scenarios to test
5. **Documentation** - User stories serve as living documentation

### Recommended Next Steps

1. **Review existing test coverage** against these user stories
2. **Identify gaps** - Which user stories lack test coverage?
3. **Prioritize** - Start with critical path (Phase 1)
4. **Write integration tests** - Focus on user workflows
5. **Add E2E tests** - For authentication, sync, mobile flows
6. **Automate** - CI/CD pipeline for regression testing

---

**Best Practice Answer:** Yes and No

✅ **YES - User stories are valuable for:**
- Understanding user needs and acceptance criteria
- Defining what to test (functional requirements)
- Guiding test case design
- Living documentation
- Communication between stakeholders

❌ **NOT QUITE - User stories alone are not enough:**
- Need technical test cases for edge cases
- Need performance benchmarks
- Need security test scenarios
- Should be written BEFORE development (TDD/BDD)
- Tests should be written during development, not "some other time"

**Better Practice: Test-Driven Development (TDD)**
1. Write user story (what user wants)
2. Write acceptance tests (how to verify)
3. Write code to pass tests
4. Refactor with tests as safety net

This project has excellent test coverage (679 tests) already, which is great! These user stories can help identify any missing test scenarios.
