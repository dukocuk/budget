# Integration Test Quick Start Guide

**Status**: 950/975 tests passing (97.4%)
**Integration Tests**: 21/61 Phase 1 tests passing (34%)
**Reference File**: `src/test/integration/expenses/expenseCrud.test.jsx` ✅

---

## ✅ What's Working

### 1. Test Infrastructure (100% Complete)
- **Shared utilities** in `src/test/integration/shared/`
- **Global mocks** configured in `src/test/setup.js`
- **Logger resolution** fixed permanently
- **Module imports** working correctly

### 2. Reference Integration Test
**File**: `src/test/integration/expenses/expenseCrud.test.jsx`
- ✅ All 15 tests passing
- ✅ Full integration chain validated
- ✅ Production-quality code
- **Use this as your template for all future integration tests**

---

## 🚀 How to Write a New Integration Test

### Step 1: Copy the Template

```bash
cp src/test/integration/expenses/expenseCrud.test.jsx \
   src/test/integration/yourFeature/yourTest.test.jsx
```

### Step 2: Update Imports

```javascript
// Check component export type
// Modal components: import Component from './Component'
// Providers: import { Provider } from './Provider'

import YourComponent from '../../../components/YourComponent';
import { YourProvider } from '../../../contexts/YourProvider';
```

### Step 3: Get Exact UI Text

```javascript
// Read the actual component file to get exact text
// ❌ Wrong: screen.getByText(/Submit/i)
// ✅ Right: screen.getByText(/Gem ændringer/i) // actual Danish text
```

### Step 4: Write Tests

```javascript
describe('US-XXX: User Story Title', () => {
  it('should complete full workflow', async () => {
    // 1. Render with full provider hierarchy
    render(
      <SyncContext.Provider value={mockSyncContext}>
        <YourProvider>
          <YourComponent />
        </YourProvider>
      </SyncContext.Provider>
    );

    // 2. User actions
    await user.type(input, 'value');
    await user.click(button);

    // 3. Verify integration
    await waitFor(() => {
      expect(mockDB.query).toHaveBeenCalled();
      expect(screen.getByText('Success')).toBeInTheDocument();
    });
  });
});
```

---

## 🔧 Common Fixes

### Fix 1: "Cannot find module" Error
**Already Fixed Globally** - If you still see this:
1. Check import path is correct
2. Ensure `.js` extension is used in source files
3. Verify file actually exists

### Fix 2: "Element type is invalid"
**Cause**: Wrong import type
**Fix**: Check if component uses `export default` or named export

```javascript
// Check actual component:
export default Component // → import Component from ...
export function Component // → import { Component } from ...
```

### Fix 3: "Unable to find element with text"
**Cause**: Wrong text selector
**Fix**: Read actual component to get exact text (including Danish)

```javascript
// Read component source:
<button>Opret budgetår</button>

// Then use exact text:
screen.getByText(/Opret budgetår/i) // ✅
// Not: screen.getByText(/Opret år/i) // ❌
```

### Fix 4: "expected undefined to be truthy"
**Cause**: Callback/handler not being called
**Fix**: Verify mock provides the expected methods

```javascript
// Ensure your mock has all required methods:
const mockSyncContext = {
  syncExpenses: vi.fn().mockResolvedValue(undefined),
  // Add all other methods the component needs
};
```

---

## 📋 Checklist for New Tests

Before submitting:
- [ ] Copied pattern from expenseCrud.test.jsx
- [ ] Checked actual component for export type
- [ ] Verified exact UI text (Danish locale)
- [ ] Set up full provider hierarchy
- [ ] Used `waitFor()` for async assertions
- [ ] Tested user-visible behavior (not implementation)
- [ ] All tests pass: `npm test -- yourTest.test.jsx`
- [ ] Verified in full suite: `npm test`

---

## 🎯 Files That Need Work

### Priority 1: Complete Phase 1

**yearCreation.test.jsx** (1/12 passing)
- Text selectors fixed
- Needs mock adjustments for callbacks

**tokenRefresh.test.jsx** (0/10 passing)
- Needs OAuth mock alignment
- Token expiration timing setup

**automaticSync.test.jsx** (0/11 passing)
- Needs fake timers for debounce
- Sync status mock setup

**offlineMode.test.jsx** (0/13 passing)
- Needs online/offline state mocks
- Queue management setup

**authentication.test.jsx** (6/10 passing)
- 4 tests need error UI fixes
- OAuth flow adjustment

### Priority 2: Create Phase 2 (After Phase 1 complete)
10 files covering business logic - see INTEGRATION_TEST_FINAL_SUMMARY.md

---

## 💡 Pro Tips

1. **Start with ONE test** - Get it passing before adding more
2. **Read components first** - Don't guess text or behavior
3. **Use shared utilities** - Import from `../shared/`
4. **Test incrementally** - Run test after each change
5. **Match exact text** - Danish locale is important
6. **Full providers** - Include entire hierarchy
7. **User behavior** - Not internal implementation
8. **Clear mocks** - `vi.clearAllMocks()` in beforeEach

---

## 📚 Key Files to Reference

**Working Example**:
- `src/test/integration/expenses/expenseCrud.test.jsx` - **START HERE**

**Infrastructure**:
- `src/test/integration/shared/` - Reusable utilities
- `src/test/setup.js` - Global configuration

**Documentation**:
- `docs/INTEGRATION_TEST_FINAL_SUMMARY.md` - Complete overview
- `docs/INTEGRATION_TEST_CURRENT_STATUS.md` - Detailed status
- `docs/INTEGRATION_TEST_PROGRESS.md` - Implementation plan

---

## 🚀 Quick Commands

```bash
# Run specific test file
npm test -- src/test/integration/expenses/expenseCrud.test.jsx

# Run all integration tests
npm test -- src/test/integration/

# Run full test suite
npm test

# Watch mode for development
npm test -- --watch yourTest.test.jsx
```

---

## 🎓 Learning Path

1. **Read**: `expenseCrud.test.jsx` completely
2. **Understand**: Provider hierarchy and mock setup
3. **Practice**: Fix one test in yearCreation.test.jsx
4. **Apply**: Create new test file using same pattern
5. **Refine**: Extract common patterns to shared utilities
6. **Scale**: Complete Phase 1, then move to Phase 2

---

**Remember**: The foundation is solid. Follow the proven pattern in expenseCrud.test.jsx and you'll write production-quality integration tests efficiently.

**Questions?** Check docs/INTEGRATION_TEST_FINAL_SUMMARY.md for comprehensive guidance.
