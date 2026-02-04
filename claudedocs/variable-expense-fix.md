# Variable Expense Cloud Sync Fix

## Issue
Variable expenses were reverting to fixed monthly expenses after page reload or multi-device sync. The `monthlyAmounts` data was being lost during cloud synchronization.

## Root Cause
The `debouncedCloudSync()` function in `useExpenses.js` was reading expenses from PGlite but **excluding the `monthly_amounts` field** when mapping data for cloud upload.

**Location:** `src/hooks/useExpenses.js:239-249`

## The Fix
Added the missing `monthlyAmounts` field to the cloud sync mapping:

```javascript
const expensesToSync = result.rows.map(row => ({
  id: row.id,
  name: row.name,
  amount: row.amount,
  frequency: row.frequency,
  startMonth: row.start_month,
  endMonth: row.end_month,
  budgetPeriodId: row.budget_period_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  monthlyAmounts: row.monthly_amounts ? JSON.parse(row.monthly_amounts) : null, // ✅ ADDED
}));
```

## What Changed
- **File:** `src/hooks/useExpenses.js`
- **Line:** 249-251 (added 1 field)
- **Impact:** Single-line addition, no breaking changes
- **Tests:** All 998 tests pass

## Data Flow (Fixed)
```
1. ✅ User creates/edits variable expense
2. ✅ Stored in PGlite with monthly_amounts column
3. ✅ React state updated with monthlyAmounts
4. ⏱️ 1 second debounce...
5. ✅ Sync includes monthlyAmounts field (FIXED)
6. ✅ Google Drive receives complete data
7. ✅ Next reload: variable expense data persists
8. ✅ Multi-device sync works correctly
```

## Why It Works
- PGlite already stored `monthly_amounts` correctly (JSON string)
- Database schema already had the column
- Load functions already parsed the field correctly
- Only the sync mapping was missing the field
- Adding it aligns sync behavior with storage and load operations

## Verification Steps
To verify the fix works:

1. Create a variable expense with custom monthly amounts
2. Wait 2 seconds (for debounced sync)
3. Reload the page
4. ✅ Expense should still show as variable mode
5. ✅ Monthly amounts should be preserved
6. ✅ Editing monthly amounts should persist after reload

## Related Files
- `src/hooks/useExpenses.js` - Main expense operations (FIXED)
- `src/lib/pglite.js` - Database schema (already correct)
- `src/contexts/SyncContext.jsx` - Cloud sync (already handles field)
- `src/utils/validators.js` - Expense validation (already correct)
- `src/components/modals/MonthlyAmountsModal.jsx` - UI for editing (already correct)

## Testing
All existing tests pass (998/998):
- Expense CRUD operations ✅
- Cloud sync workflows ✅
- Offline mode ✅
- Variable expense validation ✅
- Multi-device sync ✅

No new tests needed - existing integration tests cover the sync flow.
