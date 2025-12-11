/**
 * useKeyboardShortcuts Hook
 *
 * Manages global keyboard shortcuts for the application:
 * - Ctrl/Cmd+N: Open add expense modal
 * - Ctrl/Cmd+Z: Undo last action
 * - Ctrl/Cmd+Shift+Z: Redo last action
 *
 * @param {Object} params
 * @param {Function} params.onAddExpense - Callback to open add expense modal
 * @param {Function} params.onUndo - Callback to undo last action
 * @param {Function} params.onRedo - Callback to redo last action
 * @param {boolean} params.canUndo - Whether undo is available
 * @param {boolean} params.canRedo - Whether redo is available
 * @param {Function} params.showAlert - Callback to show alert messages
 * @returns {Function} handleKeyPress - Event handler for keydown events
 */
export function useKeyboardShortcuts({
  onAddExpense,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  showAlert,
}) {
  const handleKeyPress = e => {
    // Ctrl/Cmd + N for new expense
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      onAddExpense();
      return;
    }

    // Ctrl/Cmd + Z for undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      if (canUndo && onUndo()) {
        showAlert('Handling fortrudt', 'info');
      }
    }

    // Ctrl/Cmd + Shift + Z for redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      if (canRedo && onRedo()) {
        showAlert('Handling gentaget', 'info');
      }
    }
  };

  return handleKeyPress;
}
