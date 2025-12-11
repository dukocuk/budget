/**
 * Main Application Component - Refactored with modular architecture + Cloud Sync
 * OPTIMIZATION: Uses React.startTransition for batched state updates to prevent chart re-renders
 */

import { useState, useEffect, useMemo, useRef, memo } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { Alert } from './components/Alert';
import { ExpensesTable } from './components/ExpensesTable';
import { MonthlyOverview } from './components/MonthlyOverview';
import { TabView } from './components/TabView';
import BottomTabBar from './components/BottomTabBar';
import Dashboard from './components/Dashboard';
import { AddExpenseModal } from './components/AddExpenseModal';
import { MonthlyAmountsModal } from './components/MonthlyAmountsModal';
import { SettingsModal } from './components/SettingsModal';
import { TemplateManagerModal } from './components/TemplateManagerModal';
import { DeleteConfirmation } from './components/DeleteConfirmation';
import YearSelector from './components/YearSelector';
import CreateYearModal from './components/CreateYearModal';
import YearComparison from './components/YearComparison';
import Auth from './components/Auth';
import { useAlert } from './hooks/useAlert';
import { useAuth } from './hooks/useAuth';
import { useViewportSize } from './hooks/useViewportSize';
import { SyncProvider } from './contexts/SyncContext';
import { useSyncContext } from './hooks/useSyncContext';
import { ModalProvider } from './contexts/ModalProvider';
import { useModal } from './hooks/useModal';
import { ExpenseProvider } from './contexts/ExpenseProvider';
import { useExpenseContext } from './hooks/useExpenseContext';
import { BudgetPeriodProvider } from './contexts/BudgetPeriodProvider';
import { useBudgetPeriodContext } from './hooks/useBudgetPeriodContext';
import { useDeleteConfirmation } from './hooks/useDeleteConfirmation';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useCSVOperations } from './hooks/useCSVOperations';
import { useYearManagement } from './hooks/useYearManagement';
import { useDataInitialization } from './hooks/useDataInitialization';
import { useSettingsHandlers } from './hooks/useSettingsHandlers';
import { calculateSummary } from './utils/calculations';
import { DEFAULT_SETTINGS } from './utils/constants';
import './App.css';

/**
 * Tab content components - defined outside AppContent to prevent recreation
 * This ensures stable component references across re-renders, preventing chart unmount/remount
 */
const OverviewTabContent = memo(({ userId, periodId, activePeriod }) => (
  <Dashboard
    userId={userId}
    periodId={periodId}
    monthlyPayment={
      activePeriod?.monthlyPayment || DEFAULT_SETTINGS.monthlyPayment
    }
    previousBalance={
      activePeriod?.previousBalance || DEFAULT_SETTINGS.previousBalance
    }
    monthlyPayments={activePeriod?.monthlyPayments}
  />
));

const ExpensesTabContent = memo(
  ({
    isReadOnly,
    handleDeleteExpense,
    handleEditExpense,
    handleDeleteSelected,
  }) => {
    const {
      expenses,
      selectedExpenses,
      toggleExpenseSelection,
      toggleSelectAll,
      updateExpense,
      addExpense,
    } = useExpenseContext();
    const { openAddExpenseModal } = useModal();
    const { showAlert } = useAlert();

    // State for MonthlyAmountsModal
    const [monthlyAmountsModal, setMonthlyAmountsModal] = useState({
      isOpen: false,
      expense: null,
    });

    // Handler to open MonthlyAmountsModal
    const handleEditMonthlyAmounts = expense => {
      setMonthlyAmountsModal({ isOpen: true, expense });
    };

    return (
      <div className="tab-content-wrapper">
        {isReadOnly && (
          <div className="read-only-banner">
            <span className="read-only-icon">📦</span>
            <span className="read-only-text">
              Dette år er arkiveret (kun visning). Gå til{' '}
              <strong>⚙️ Indstillinger</strong> for at genaktivere det.
            </span>
          </div>
        )}
        <div className="expenses-header">
          <h2>📋 Dine udgifter</h2>
          <button
            className="btn btn-primary"
            onClick={() => openAddExpenseModal()}
            title={
              isReadOnly
                ? 'Kan ikke tilføje udgifter til arkiveret år'
                : 'Tilføj ny udgift (Ctrl+N)'
            }
            disabled={isReadOnly}
          >
            ➕ Tilføj udgift
          </button>
        </div>

        <ExpensesTable
          expenses={expenses}
          selectedExpenses={selectedExpenses}
          onToggleSelection={isReadOnly ? () => {} : toggleExpenseSelection}
          onToggleSelectAll={isReadOnly ? () => {} : toggleSelectAll}
          onUpdate={isReadOnly ? () => {} : updateExpense}
          onDelete={isReadOnly ? () => {} : handleDeleteExpense}
          onAdd={isReadOnly ? () => {} : addExpense}
          onEdit={isReadOnly ? () => {} : handleEditExpense}
          onEditMonthlyAmounts={
            isReadOnly ? () => {} : handleEditMonthlyAmounts
          }
          readOnly={isReadOnly}
        />

        <button
          className="btn btn-danger"
          onClick={handleDeleteSelected}
          disabled={isReadOnly || selectedExpenses.length === 0}
        >
          🗑️ Slet valgte
        </button>

        {monthlyAmountsModal.isOpen && (
          <MonthlyAmountsModal
            isOpen={monthlyAmountsModal.isOpen}
            expense={monthlyAmountsModal.expense}
            onClose={() =>
              setMonthlyAmountsModal({ isOpen: false, expense: null })
            }
            onSave={async monthlyAmounts => {
              await updateExpense(monthlyAmountsModal.expense.id, {
                monthlyAmounts,
              });
              setMonthlyAmountsModal({ isOpen: false, expense: null });
              showAlert('✅ Variable beløb opdateret', 'success');
            }}
          />
        )}
      </div>
    );
  }
);

const MonthlyTabContent = memo(({ totalAnnual }) => {
  const { expenses } = useExpenseContext();
  return (
    <div className="tab-content-wrapper">
      <MonthlyOverview expenses={expenses} totalAnnual={totalAnnual} />
    </div>
  );
});

const ComparisonTabContent = memo(({ periods, getExpensesForPeriod }) => (
  <div className="tab-content-wrapper">
    <YearComparison
      periods={periods}
      getExpensesForPeriod={getExpensesForPeriod}
    />
  </div>
));

/**
 * AppContent - The main application logic (wrapped by SyncProvider)
 */
function AppContent() {
  // Authentication
  const { user } = useAuth();

  // Budget periods from context
  const {
    periods,
    activePeriod,
    loading: periodsLoading,
    createPeriod,
    updatePeriod,
    createFromTemplate,
    archivePeriod,
    unarchivePeriod,
    calculateEndingBalance,
    getExpensesForPeriod,
    fetchPeriodsFromDB,
  } = useBudgetPeriodContext();

  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Modal state from ModalProvider (replaces 6 individual useState calls)
  const {
    addExpenseModal,
    openAddExpenseModal,
    closeAddExpenseModal,
    showSettingsModal,
    openSettingsModal,
    closeSettingsModal,
    showCreateYearModal,
    openCreateYearModal,
    closeCreateYearModal,
    showTemplateManagerModal,
    openTemplateManagerModal,
    closeTemplateManagerModal,
  } = useModal();

  // Expenses from ExpenseContext (now managed by provider)
  const {
    expenses,
    selectedExpenses,
    addExpense,
    updateExpense,
    _deleteExpense,
    _deleteSelected,
    setAllExpenses,
    undo,
    redo,
    canUndo,
    canRedo,
    _immediateSyncExpenses: immediateSyncExpensesFromContext,
    _isOnline: isOnlineFromContext,
  } = useExpenseContext();

  // Cloud sync (from isolated context to prevent re-renders)
  const {
    syncExpenses,
    loadExpenses,
    loadBudgetPeriods,
    immediateSyncBudgetPeriods,
  } = useSyncContext();

  const { alert, showAlert } = useAlert();

  // Track last synced values to prevent cascading syncs
  const lastSyncedExpensesRef = useRef(null);

  // Delete confirmation logic (extracted to custom hook)
  const {
    deleteConfirmation,
    confirmDeleteExpense,
    confirmDeleteSelected,
    executeDelete,
    cancelDelete,
  } = useDeleteConfirmation();

  // CSV import/export (extracted to custom hook)
  const { handleExport, handleImport } = useCSVOperations({
    expenses,
    activePeriod,
    addExpense,
    showAlert,
  });

  // Year management (extracted to custom hook)
  const { handleCreateYear, handleSelectPeriod } = useYearManagement({
    createPeriod,
    createFromTemplate,
    closeCreateYearModal,
    showAlert,
  });

  // Track if we're in initial data load to prevent sync triggers
  const isInitialLoadRef = useRef(true);

  // Data initialization (extracted to custom hook)
  const isLoadingData = useDataInitialization({
    user,
    activePeriod,
    isInitialized,
    setIsInitialized,
    loadExpenses,
    loadBudgetPeriods,
    setAllExpenses,
    fetchPeriodsFromDB,
    immediateSyncBudgetPeriods,
    showAlert,
    isInitialLoadRef,
  });

  // Settings handlers (extracted to custom hook)
  const {
    handleMonthlyPaymentChange,
    handlePreviousBalanceChange,
    handleMonthlyPaymentsChange,
    handleTogglePaymentMode,
    handleArchivePeriod,
    handleUnarchivePeriod,
  } = useSettingsHandlers({
    activePeriod,
    updatePeriod,
    archivePeriod,
    unarchivePeriod,
    showAlert,
  });

  // Viewport detection for responsive rendering
  const { isMobile } = useViewportSize();

  // Memoize expensive calculations to prevent chart re-renders
  // Use monthlyPayments array if available, otherwise fallback to single monthlyPayment
  const summary = useMemo(() => {
    if (!activePeriod) return { totalAnnual: 0, endingBalance: 0 };
    const paymentValue =
      activePeriod.monthlyPayments || activePeriod.monthlyPayment;
    return calculateSummary(
      expenses,
      paymentValue,
      activePeriod.previousBalance
    );
  }, [
    expenses,
    activePeriod?.monthlyPayment,
    activePeriod?.monthlyPayments,
    activePeriod?.previousBalance,
  ]);

  // Note: Data initialization is handled by useDataInitialization hook

  // Keyboard shortcuts (extracted to custom hook) - MUST be called before any conditional returns
  const handleKeyPress = useKeyboardShortcuts({
    onAddExpense: openAddExpenseModal,
    onUndo: undo,
    onRedo: redo,
    canUndo,
    canRedo,
    showAlert,
  });

  // Sync expenses whenever they change (ONLY after initialization AND initial load complete)
  // OPTIMIZATION: Only sync if expenses actually changed to prevent cascading syncs
  useEffect(() => {
    if (user && isInitialized && !isLoadingData && !isInitialLoadRef.current) {
      // Compare with last synced state to avoid redundant syncs
      const expensesChanged =
        JSON.stringify(expenses) !==
        JSON.stringify(lastSyncedExpensesRef.current);

      if (expensesChanged) {
        lastSyncedExpensesRef.current = expenses;
        syncExpenses(expenses);
      }
    }
  }, [expenses, user, isInitialized, isLoadingData, syncExpenses]);

  // Show loading screen while fetching cloud data
  if (isLoadingData) {
    return (
      <div className="auth-container">
        <div className="auth-loading-card">
          <div className="loading-icon">☁️</div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: '60%' }}></div>
          </div>
          <p className="loading-message">Henter dine data...</p>
          <div className="spinner-enhanced"></div>
          <p
            style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginTop: '1rem',
            }}
          >
            Hvis indlæsning tager lang tid, prøv at genindlæse siden.
          </p>
        </div>
      </div>
    );
  }

  // Add expense handler - receives form data from modal
  const handleAddExpense = formData => {
    if (formData.id) {
      // Update existing expense
      updateExpense(formData.id, formData);
      showAlert('Udgift opdateret!', 'success');
    } else {
      // Add new expense
      addExpense(formData);
      showAlert('Ny udgift tilføjet!', 'success');
    }
  };

  // Open edit modal with pre-filled expense data
  const handleEditExpense = expense => {
    openAddExpenseModal(expense);
  };

  // Note: Handler functions are provided by custom hooks:
  // - useDeleteConfirmation: confirmDeleteExpense, confirmDeleteSelected, executeDelete, cancelDelete
  // - useCSVOperations: handleExport, handleImport
  // - useYearManagement: handleCreateYear, handleSelectPeriod

  // Check if current period is archived (read-only mode)
  const isReadOnly = activePeriod?.status === 'archived';

  // Tab content array - components defined outside to prevent recreation
  const desktopTabs = [
    {
      icon: '📊',
      label: 'Oversigt',
      content: (
        <OverviewTabContent
          userId={user?.id}
          periodId={activePeriod?.id}
          activePeriod={activePeriod}
        />
      ),
    },
    {
      icon: '📝',
      label: 'Udgifter',
      content: (
        <ExpensesTabContent
          isReadOnly={isReadOnly}
          handleDeleteExpense={confirmDeleteExpense}
          handleEditExpense={handleEditExpense}
          handleDeleteSelected={confirmDeleteSelected}
        />
      ),
    },
    {
      icon: '📅',
      label: 'Månedlig oversigt',
      content: <MonthlyTabContent totalAnnual={summary.totalAnnual} />,
    },
    {
      icon: '📈',
      label: 'Sammenligning',
      content: (
        <ComparisonTabContent
          periods={periods}
          getExpensesForPeriod={getExpensesForPeriod}
        />
      ),
    },
  ];

  return (
    <ErrorBoundary>
      <div className="app" onKeyDown={handleKeyPress}>
        <Alert message={alert?.message} type={alert?.type} />

        {/* Header with Year Selector */}
        <div className="header-with-year-selector">
          <YearSelector
            periods={periods}
            activePeriod={activePeriod}
            onSelectPeriod={handleSelectPeriod}
            onCreateYear={openCreateYearModal}
            disabled={periodsLoading}
          />
          <Header user={user} onOpenSettings={openSettingsModal} />
        </div>

        <DeleteConfirmation
          isOpen={deleteConfirmation.isOpen}
          onConfirm={executeDelete}
          onCancel={cancelDelete}
          expenseName={deleteConfirmation.expenseName}
          count={deleteConfirmation.count}
        />

        {/* Desktop TabView (hidden on mobile < 768px) */}
        {!isMobile && (
          <div className="container">
            <TabView
              activeTab={activeTab}
              onTabChange={setActiveTab}
              tabs={desktopTabs}
            />
          </div>
        )}

        {/* Mobile Content Area (visible on mobile < 768px) */}
        {isMobile && (
          <div className="mobile-content">
            {activeTab === 0 && desktopTabs[0].content}
            {activeTab === 1 && desktopTabs[1].content}
            {activeTab === 2 && desktopTabs[2].content}
            {activeTab === 3 && desktopTabs[3].content}
          </div>
        )}

        {/* Add Expense Modal */}
        <AddExpenseModal
          isOpen={addExpenseModal.isOpen}
          onClose={closeAddExpenseModal}
          onAdd={handleAddExpense}
          editingExpense={addExpenseModal.editingExpense}
        />

        {/* Settings Modal */}
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={closeSettingsModal}
          monthlyPayment={
            activePeriod?.monthlyPayment || DEFAULT_SETTINGS.monthlyPayment
          }
          previousBalance={
            activePeriod?.previousBalance || DEFAULT_SETTINGS.previousBalance
          }
          monthlyPayments={activePeriod?.monthlyPayments}
          useVariablePayments={activePeriod?.monthlyPayments !== null}
          onMonthlyPaymentChange={handleMonthlyPaymentChange}
          onPreviousBalanceChange={handlePreviousBalanceChange}
          onMonthlyPaymentsChange={handleMonthlyPaymentsChange}
          onTogglePaymentMode={handleTogglePaymentMode}
          onExport={handleExport}
          onImport={handleImport}
          activePeriod={activePeriod}
          onArchivePeriod={handleArchivePeriod}
          onUnarchivePeriod={handleUnarchivePeriod}
          onOpenTemplateManager={openTemplateManagerModal}
        />

        {/* Template Manager Modal */}
        <TemplateManagerModal
          isOpen={showTemplateManagerModal}
          onClose={closeTemplateManagerModal}
          activePeriod={activePeriod}
        />

        {/* Create Year Modal */}
        <CreateYearModal
          isOpen={showCreateYearModal}
          onClose={closeCreateYearModal}
          onCreate={handleCreateYear}
          periods={periods}
          calculateEndingBalance={calculateEndingBalance}
        />

        {/* Floating Action Button (FAB) */}
        <button
          className="fab"
          onClick={openAddExpenseModal}
          title="Tilføj ny udgift (Ctrl+N)"
          aria-label="Tilføj ny udgift"
        >
          ➕
        </button>

        {/* Bottom Tab Bar (Mobile < 768px) */}
        <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </ErrorBoundary>
  );
}

/**
 * App - Wrapper component that provides SyncContext
 */
function App() {
  const {
    user,
    loading: authLoading,
    loadingState,
    error,
    handleGoogleSignIn,
    signOut,
    retryAuth,
  } = useAuth();

  // Show auth screen if not logged in
  if (authLoading) {
    return (
      <div className="auth-container">
        <div className="auth-loading-card">
          <div className="loading-icon">⚙️</div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: '30%' }}></div>
          </div>
          <p className="loading-message">Indlæser...</p>
          <div className="spinner-enhanced"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Auth
        user={user}
        loadingState={loadingState}
        error={error}
        handleGoogleSignIn={handleGoogleSignIn}
        signOut={signOut}
        retryAuth={retryAuth}
      />
    );
  }

  // Wrap AppContent with all providers in correct order
  return (
    <SyncProvider user={user}>
      <BudgetPeriodProvider userId={user?.id}>
        <ModalProvider>
          <AppContentWrapper />
        </ModalProvider>
      </BudgetPeriodProvider>
    </SyncProvider>
  );
}

/**
 * AppContentWrapper - Wraps ExpenseProvider which needs activePeriod from BudgetPeriodContext
 */
function AppContentWrapper() {
  const { user } = useAuth();
  const { activePeriod } = useBudgetPeriodContext();

  // Don't render until we have a period
  if (!activePeriod) {
    return (
      <div className="auth-container">
        <div className="auth-loading-card">
          <div className="loading-icon">⚙️</div>
          <p className="loading-message">Indlæser budget...</p>
          <div className="spinner-enhanced"></div>
        </div>
      </div>
    );
  }

  return (
    <ExpenseProvider userId={user?.id} periodId={activePeriod?.id}>
      <AppContent />
    </ExpenseProvider>
  );
}

export default App;
