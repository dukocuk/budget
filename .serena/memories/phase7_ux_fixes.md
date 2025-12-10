# Phase 7 - UX Fixes and Improvements

## Issues Identified

### 1. Modal Title Change During Close
**Problem**: When closing the "Rediger udgift" modal, the title changes to "Tilføj ny udgift" before the modal closes (during 200ms animation).
**Cause**: Title is directly bound to `editingExpense` prop, which becomes null when closing.
**Fix**: Use local state to preserve title during close animation.

### 2. Gray Input Fields Look Disabled
**Problem**: In MonthlyAmountsModal, filled input fields have `background: #f9fafb` which looks like a disabled state.
**Fix**: Change to white or very subtle background color.

### 3. "Skift til fast beløb" Button Not Working
**Problem**: Button calls `onSave(null)` but this doesn't change paymentMode back to 'fixed'.
**Cause**: onSave callback in AddExpenseModal only sets `monthlyAmounts` to null, doesn't toggle payment mode.
**Fix**: Update onSave callback to also set `paymentMode` to 'fixed' when receiving null.

### 4. Missing Reset Button
**Problem**: No way to quickly reset all monthly values to 0.
**Fix**: Add "Nulstil alle beløb" button in utility buttons section.

## Implementation Steps

### Fix 1: Preserve Modal Title During Close
**File**: src/components/AddExpenseModal.jsx
**Changes**:
- Add local state `const [modalTitle, setModalTitle] = useState('')`
- Update title when modal opens based on editingExpense
- Use modalTitle for display instead of direct prop check

### Fix 2: Update Input Field Colors
**File**: src/components/MonthlyAmountsModal.css
**Changes**:
- Change `.amount-field input:not(:placeholder-shown)` background from `#f9fafb` to `white` or remove entirely
- Keep white background for all input states
- Maintain focus state with `#fefefe`

### Fix 3: Fix "Skift til fast beløb" Functionality
**File**: src/components/AddExpenseModal.jsx
**Changes**:
- Update MonthlyAmountsModal onSave callback to handle null case
- When amounts is null: set paymentMode to 'fixed' and close modal
- When amounts is array: set monthlyAmounts and close modal

### Fix 4: Add Reset Button
**File**: src/components/MonthlyAmountsModal.jsx
**Changes**:
- Add `handleResetAll` function that sets all 12 values to 0
- Add button in utility-buttons section: "🔄 Nulstil alle beløb"
- Style as btn-secondary (purple outline)

## Success Criteria
- [ ] Modal title remains "Rediger udgift" during close animation
- [ ] Input fields have white background, don't look disabled
- [ ] "Skift til fast beløb" button switches back to fixed mode correctly
- [ ] Reset button sets all 12 monthly values to 0
- [ ] All buttons and fields follow UX color guidelines (green/purple/red)
