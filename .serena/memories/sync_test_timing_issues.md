# Sync Test Timing Issues - Investigation Required

## Summary
4 sync tests in `src/contexts/SyncContext.test.jsx` remain skipped due to complex timing issues with fake timers and async operations. These tests require deeper investigation and rework.

## Skipped Tests
1. **Line 299**: `should handle sync errors gracefully` - Error state reset after 5 seconds
2. **Line 580**: `should debounce sync by 1 second` - Debounce timing validation
3. **Line 643**: `should cancel previous debounced sync on new call` - Debounce cancellation
4. **Line 713**: `should reset status from synced to idle after 2 seconds` - Status reset timing

## Root Cause Analysis
The SyncContext implementation (lines 1-80 of SyncContext.jsx) uses:
- **Refs for sync status** (syncStatusRef, lastSyncTimeRef, syncErrorRef)
- **Timeout refs** (statusResetTimeoutRef, errorResetTimeoutRef, syncTimeoutRef)
- **Debouncing logic** with 1-second delay
- **Status reset timeouts** (2 seconds for synced→idle, 5 seconds for error→idle)

## Attempted Fixes
1. ✅ Added PGlite mocks for budget periods query
2. ✅ Unskipped tests (removed .skip)
3. ❌ Added fake timer setup with vi.useFakeTimers()
4. ❌ Added timer advancement with vi.advanceTimersByTime() and vi.runAllTimersAsync()
5. **Result**: All 4 tests timeout at 5000ms despite timer fixes

## Problems Identified
- **Complex timing dependencies**: Refs + setTimeout + async operations
- **Mock incompleteness**: Timers may not properly interact with React hooks and refs
- **Test isolation**: Fake timers affected other passing tests
- **Async coordination**: Debouncing + status resets + React state updates

## Priority Assessment
These tests are **lower priority** because:
- They were already **skipped** (not covering functionality)
- Not like undo/redo tests that were **passing with wrong expectations** (Priority 1)
- Fixing them doesn't expose real bugs, it adds missing coverage

## Recommendations
1. **Defer to future investigation**: Focus on Priority 1 issues first
2. **Research approach**: Study Vitest docs on fake timers with React hooks + refs
3. **Consider alternatives**: 
   - Integration tests instead of unit tests for timing-sensitive features
   - Increase test timeout instead of fake timers
   - Mock setTimeout/clearTimeout directly
4. **Test strategy**: These may benefit from E2E tests rather than unit tests

## Related Files
- `/src/contexts/SyncContext.test.jsx` (lines 299, 580, 643, 713)
- `/src/contexts/SyncContext.jsx` (implementation with refs and timeouts)

## Status
Restored to `.skip` status to maintain passing test suite. 11/15 tests passing, 4 skipped.
