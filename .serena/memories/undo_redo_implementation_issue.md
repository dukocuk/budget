# Undo/Redo Implementation Issue Found

## Date: 2025-10-19

## Issue
Tests corrected to expect `canRedo = false` after initial load now correctly **FAIL**, exposing implementation bugs.

## Test Results After Fix
- ❌ Test 1: "should have canUndo false and canRedo false after initial load" - FAILS
  - Expected: `canRedo = false`  
  - Actual: `canRedo = true`
- ✅ Test 2: "should return false when undoing with no history" - PASSES
- ❌ Test 3: "should return false when redoing with no future state" - FAILS
  - Expected: `redoResult = false`
  - Actual: `redoResult = true`

## Root Cause Analysis
Location: `src/hooks/useExpenses.js` lines 485-559

Implementation:
```javascript
const [history, setHistory] = useState([])
const [historyIndex, setHistoryIndex] = useState(-1)
const canRedo = historyIndex < history.length - 1
```

Issue: After initial load, the `useLayoutEffect` (line 526) adds the first expense snapshot to history, resulting in:
- `history = [[]]` (one entry with loaded expenses)
- `historyIndex = 0`  
- `canRedo = 0 < 1 - 1 = 0 < 0 = false` (SHOULD be false)

But tests show `canRedo = true`, suggesting history may have **2 entries** instead of 1, likely due to:
1. Multiple state updates during initial load
2. Race condition between loading states
3. useLayoutEffect running multiple times

## Recommendation
This is an implementation bug, not a test bug. The original tests had WRONG expectations that masked the bug. The corrected tests now properly expose it.

**Next Step**: Fix the undo/redo implementation to ensure:
- After initial load: `canRedo = false` (no future state)
- After undo: `canRedo = true` (can redo what was undone)
- History should only have ONE entry after initial load

## Status
Test fixes: ✅ COMPLETE  
Implementation fix: ⏳ PENDING (separate task)
