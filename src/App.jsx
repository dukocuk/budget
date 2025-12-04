/**
 * Main Application Component - Refactored with modular architecture + Cloud Sync
 * OPTIMIZATION: Uses React.startTransition for batched state updates to prevent chart re-renders
 */

import {
  useState,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  startTransition,
} from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { Alert } from './components/Alert';
import { SummaryCards } from './components/SummaryCards';
import { ExpensesTable } from './components/ExpensesTable';
import { MonthlyOverview } from './components/MonthlyOverview';
import { TabView } from './components/TabView';
import { BalanceChart } from './components/BalanceChart';
import { ExpenseDistribution } from './components/ExpenseDistribution';
import { AddExpenseModal } from './components/AddExpenseModal';
import { SettingsModal } from './components/SettingsModal';
import { TemplateManagerModal } from './components/TemplateManagerModal';
import { DeleteConfirmation } from './components/DeleteConfirmation';
import YearSelector from './components/YearSelector';
import CreateYearModal from './components/CreateYearModal';
import YearComparison from './components/YearComparison';
import Auth from './components/Auth';
import { useExpenses } from './hooks/useExpenses';
import { useBudgetPeriods } from './hooks/useBudgetPeriods';
import { useAlert } from './hooks/useAlert';
import { useAuth } from './hooks/useAuth';
import { SyncProvider } from './contexts/SyncContext';
import { useSyncContext } from './hooks/useSyncContext';
import { calculateSummary } from './utils/calculations';
import { generateCSV, downloadCSV } from './utils/exportHelpers';
import { parseCSV } from './utils/importHelpers';
import { DEFAULT_SETTINGS } from './utils/constants';
import { logger } from './utils/logger';
import './App.css';

/**
 * Settings reducer - Batches monthlyPayment, previousBalance, and monthlyPayments array updates
 */
const settingsReducer = (state, action) => {
  switch (action.type) {
    case 'SET_MONTHLY_PAYMENT':
      return { ...state, monthlyPayment: action.payload };
    case 'SET_PREVIOUS_BALANCE':
      return { ...state, previousBalance: action.payload };
    case 'SET_MONTHLY_PAYMENTS':
      return {
        ...state,
        monthlyPayments: action.payload,
        useVariablePayments: action.payload !== null,
      };
    case 'SET_PAYMENT_MODE':
      return {
        ...state,
        useVariablePayments: action.payload,
        monthlyPayments: action.payload ? state.monthlyPayments : null,
      };
    case 'SET_BOTH':
      return {
        monthlyPayment: action.payload.monthlyPayment,
        previousBalance: action.payload.previousBalance,
      };
    case 'SET_ALL':
      return {
        monthlyPayment: action.payload.monthlyPayment,
        previousBalance: action.payload.previousBalance,
        monthlyPayments: action.payload.monthlyPayments || null,
        useVariablePayments:
          action.payload.monthlyPayments !== null &&
          action.payload.monthlyPayments !== undefined,
      };
    default:
      return state;
  }
};

/**
 * AppContent - The main application logic (wrapped by SyncProvider)
 */
function AppContent() {
  // Authentication
  const { user } = useAuth();

  // Budget periods management (multi-year support)
  const {
    periods,
    activePeriod,
    loading: periodsLoading,
    createPeriod,
    createFromTemplate,
    archivePeriod,
    calculateEndingBalance,
    getExpensesForPeriod,
    fetchPeriodsFromDB,
  } = useBudgetPeriods(user?.id);

  // Use reducer to batch settings updates (prevents multiple re-renders)
  const [settings, dispatchSettings] = useReducer(settingsReducer, {
    monthlyPayment: DEFAULT_SETTINGS.monthlyPayment,
    previousBalance: DEFAULT_SETTINGS.previousBalance,
    monthlyPayments: null,
    useVariablePayments: false,
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCreateYearModal, setShowCreateYearModal] = useState(false);
  const [showTemplateManagerModal, setShowTemplateManagerModal] =
    useState(false);

  // Delete confirmation state
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    expenseId: null,
    expenseName: null,
    count: 0,
  });

  // Track if we're in initial data load to prevent sync triggers
  const isInitialLoadRef = useRef(true);

  // Track last synced values to prevent cascading syncs
  const lastSyncedExpensesRef = useRef(null);
  const lastSyncedSettingsRef = useRef({
    monthlyPayment: 0,
    previousBalance: 0,
    monthlyPayments: null,
  });

  // Expenses management (pass user ID AND period ID for filtering)
  const {
    expenses,
    selectedExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
    deleteSelected,
    toggleExpenseSelection,
    toggleSelectAll,
    setAllExpenses,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useExpenses(user?.id, activePeriod?.id);

  // Cloud sync (from isolated context to prevent re-renders)
  const {
    syncExpenses,
    syncSettings,
    loadExpenses,
    loadBudgetPeriods,
    immediateSyncExpenses,
    immediateSyncBudgetPeriods,
    isOnline,
  } = useSyncContext();

  const { alert, showAlert } = useAlert();

  // Memoize expensive calculations to prevent chart re-renders
  // Use monthlyPayments array if available, otherwise fallback to single monthlyPayment
  const summary = useMemo(() => {
    const paymentValue = settings.monthlyPayments || settings.monthlyPayment;
    return calculateSummary(expenses, paymentValue, settings.previousBalance);
  }, [
    expenses,
    settings.monthlyPayment,
    settings.monthlyPayments,
    settings.previousBalance,
  ]);

  // Load settings from active budget period
  useEffect(() => {
    if (activePeriod && !periodsLoading) {
      startTransition(() => {
        dispatchSettings({
          type: 'SET_ALL',
          payload: {
            monthlyPayment:
              activePeriod.monthlyPayment || DEFAULT_SETTINGS.monthlyPayment,
            previousBalance:
              activePeriod.previousBalance || DEFAULT_SETTINGS.previousBalance,
            monthlyPayments: activePeriod.monthlyPayments || null,
          },
        });
      });
    }
  }, [activePeriod, periodsLoading]);

  // Load data from cloud when user logs in (OPTIMIZED: batched updates prevent multiple re-renders)
  useEffect(() => {
    console.log('📊 Data loading check:', {
      hasUser: !!user,
      hasActivePeriod: !!activePeriod,
      isInitialized,
      willLoad: user && activePeriod && !isInitialized,
    });

    if (user && activePeriod && !isInitialized) {
      const loadData = async () => {
        logger.info('🔄 Starting data initialization...');
        setIsLoadingData(true);

        // Create timeout promise (10 seconds)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Initialization timeout after 10 seconds')),
            10000
          )
        );

        try {
          // Race between data loading and timeout
          await Promise.race([
            (async () => {
              logger.info('📊 Loading expenses and budget periods...');

              // Load expenses and budget periods in PARALLEL to reduce load time
              const [expensesResult, periodsResult] = await Promise.all([
                loadExpenses().catch(err => {
                  logger.error('Error loading expenses:', err);
                  return { success: false, data: [] };
                }),
                loadBudgetPeriods().catch(err => {
                  logger.error('Error loading budget periods:', err);
                  return { success: false, data: [] };
                }),
              ]);

              logger.info(
                `📦 Loaded ${expensesResult?.data?.length || 0} expenses, ${periodsResult?.data?.length || 0} periods`
              );

              // CRITICAL: Sync local budget periods to cloud BEFORE syncing expenses
              // This prevents foreign key constraint violations when expenses reference
              // budget_period_id that doesn't exist in cloud yet
              if (fetchPeriodsFromDB && immediateSyncBudgetPeriods) {
                try {
                  const localPeriods = await fetchPeriodsFromDB();
                  if (localPeriods && localPeriods.length > 0) {
                    logger.info(
                      `🔄 Syncing ${localPeriods.length} budget periods to cloud before expense sync...`
                    );
                    await immediateSyncBudgetPeriods(localPeriods);
                    logger.info('✅ Budget periods synced successfully');
                  }
                } catch (syncError) {
                  logger.error(
                    '❌ Error syncing budget periods during initialization:',
                    syncError
                  );
                  // Continue anyway - expense sync will handle validation
                }
              }

              // ATOMIC UPDATE: Use startTransition to batch ALL state updates into a single render
              // This prevents charts from re-rendering multiple times during initialization
              startTransition(() => {
                // Update expenses first (if available)
                if (
                  expensesResult &&
                  expensesResult.success &&
                  expensesResult.data &&
                  expensesResult.data.length > 0
                ) {
                  logger.info(
                    `✅ Setting ${expensesResult.data.length} expenses in state`
                  );
                  setAllExpenses(expensesResult.data);
                }

                // Settings are loaded from activePeriod (handled by separate useEffect)

                // Mark initial load as complete BEFORE enabling sync
                isInitialLoadRef.current = false;
                setIsLoadingData(false);
                setIsInitialized(true);
                logger.info('✅ Initialization complete!');
              });
            })(),
            timeoutPromise,
          ]);
        } catch (error) {
          logger.error('❌ Error loading initial data:', error);
          showAlert(
            `Fejl ved indlæsning: ${error.message}. Genindlæs venligst siden.`,
            'error'
          );

          // Even on error, ensure loading state is cleared
          startTransition(() => {
            isInitialLoadRef.current = false;
            setIsLoadingData(false);
            setIsInitialized(true);
          });
        } finally {
          // SAFETY NET: Always ensure loading state is cleared
          // This handles edge cases where neither success nor catch blocks execute
          setTimeout(() => {
            setIsLoadingData(false);
          }, 100);
        }
      };

      loadData();
    }
  }, [
    user,
    activePeriod,
    isInitialized,
    loadExpenses,
    loadBudgetPeriods,
    setAllExpenses,
    fetchPeriodsFromDB,
    immediateSyncBudgetPeriods,
    showAlert,
  ]);

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

  // Sync settings whenever they change (ONLY after initialization AND initial load complete)
  // OPTIMIZATION: Only sync if settings actually changed to prevent cascading syncs
  useEffect(() => {
    if (user && isInitialized && !isLoadingData && !isInitialLoadRef.current) {
      // Compare with last synced state to avoid redundant syncs
      const monthlyPaymentsChanged =
        JSON.stringify(settings.monthlyPayments) !==
        JSON.stringify(lastSyncedSettingsRef.current.monthlyPayments);
      const settingsChanged =
        settings.monthlyPayment !==
          lastSyncedSettingsRef.current.monthlyPayment ||
        settings.previousBalance !==
          lastSyncedSettingsRef.current.previousBalance ||
        monthlyPaymentsChanged;

      if (settingsChanged) {
        lastSyncedSettingsRef.current = { ...settings };
        syncSettings(
          settings.monthlyPayment,
          settings.previousBalance,
          settings.monthlyPayments
        );
      }
    }
  }, [
    settings.monthlyPayment,
    settings.previousBalance,
    settings.monthlyPayments,
    settings,
    user,
    isInitialized,
    isLoadingData,
    syncSettings,
  ]);

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

  // Keyboard shortcuts
  const handleKeyPress = e => {
    // Ctrl/Cmd + N for new expense
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      setShowAddModal(true);
      return;
    }
    // Ctrl/Cmd + Z for undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      if (canUndo && undo()) {
        showAlert('Handling fortrudt', 'info');
      }
    }
    // Ctrl/Cmd + Shift + Z for redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      if (canRedo && redo()) {
        showAlert('Handling gentaget', 'info');
      }
    }
  };

  // Add expense handler - receives form data from modal
  const handleAddExpense = formData => {
    addExpense(formData);
    showAlert('Ny udgift tilføjet!', 'success');
  };

  // Open delete confirmation modal for single expense
  const handleDeleteExpense = id => {
    const expense = expenses.find(e => e.id === id);
    if (!expense) return;

    setDeleteConfirmation({
      isOpen: true,
      expenseId: id,
      expenseName: expense.name,
      count: 0,
    });
  };

  // Open delete confirmation modal for multiple expenses
  const handleDeleteSelected = () => {
    if (selectedExpenses.length === 0) {
      showAlert('⚠️ Vælg venligst udgifter at slette først', 'warning');
      return;
    }

    setDeleteConfirmation({
      isOpen: true,
      expenseId: null,
      expenseName: null,
      count: selectedExpenses.length,
    });
  };

  // Confirm and execute deletion
  const confirmDelete = async () => {
    try {
      if (deleteConfirmation.count > 0) {
        // Bulk delete
        const count = deleteConfirmation.count;
        const result = deleteSelected();

        // Immediately sync to cloud (bypass debounce for critical operations)
        if (user && isOnline && result.success) {
          const updatedExpenses = expenses.filter(
            e => !selectedExpenses.includes(e.id)
          );
          await immediateSyncExpenses(updatedExpenses);
        }

        showAlert(`✅ ${count} udgift(er) slettet`, 'success');
      } else {
        // Single delete
        const expense = expenses.find(
          e => e.id === deleteConfirmation.expenseId
        );

        // Calculate updated expenses BEFORE deleting
        const updatedExpenses = expenses.filter(
          e => e.id !== deleteConfirmation.expenseId
        );

        // Delete from local state
        deleteExpense(deleteConfirmation.expenseId);

        // Immediately sync to cloud (bypass debounce for critical operations)
        if (user && isOnline) {
          logger.log(
            `🗑️ Immediately syncing delete: ${updatedExpenses.length} expenses remaining`
          );
          await immediateSyncExpenses(updatedExpenses);
        }

        showAlert(`✅ "${expense?.name}" blev slettet`, 'success');
      }

      setDeleteConfirmation({
        isOpen: false,
        expenseId: null,
        expenseName: null,
        count: 0,
      });
    } catch (error) {
      showAlert('❌ Fejl ved sletning: ' + error.message, 'error');
      setDeleteConfirmation({
        isOpen: false,
        expenseId: null,
        expenseName: null,
        count: 0,
      });
    }
  };

  // Cancel deletion
  const cancelDelete = () => {
    setDeleteConfirmation({
      isOpen: false,
      expenseId: null,
      expenseName: null,
      count: 0,
    });
  };

  // Export to CSV
  const handleExport = () => {
    try {
      const paymentValue = settings.monthlyPayments || settings.monthlyPayment;
      const csvContent = generateCSV(
        expenses,
        paymentValue,
        settings.previousBalance
      );
      // Include year in filename if available
      const year = activePeriod?.year || new Date().getFullYear();
      const filename = `budget_${year}_${new Date().toISOString().split('T')[0]}.csv`;
      downloadCSV(csvContent, filename);
      showAlert('CSV fil downloadet!', 'success');
    } catch (error) {
      logger.error('Export error:', error);
      showAlert('Kunne ikke eksportere CSV', 'error');
    }
  };

  // Import from CSV
  const handleImport = async file => {
    try {
      const text = await file.text();
      const result = parseCSV(text);

      if (!result.success) {
        showAlert(`Import fejl: ${result.errors.join(', ')}`, 'error');
        return;
      }

      if (result.expenses.length === 0) {
        showAlert('Ingen gyldige udgifter fundet i CSV filen', 'info');
        return;
      }

      // Add imported expenses
      result.expenses.forEach(expense => {
        addExpense(expense);
      });

      showAlert(`${result.expenses.length} udgift(er) importeret!`, 'success');
    } catch (error) {
      logger.error('Import error:', error);
      showAlert('Kunne ikke importere CSV fil', 'error');
    }
  };

  // Create new budget year
  const handleCreateYear = async yearData => {
    try {
      // Check if creating from template
      if (yearData.templateId) {
        // Create period from template
        await createFromTemplate({
          templateId: yearData.templateId,
          year: yearData.year,
          previousBalance: yearData.previousBalance,
        });
        showAlert(
          `✅ Budget for år ${yearData.year} oprettet fra skabelon!`,
          'success'
        );
      } else {
        // Create regular period (with optional expense copying)
        await createPeriod(yearData);
        showAlert(`✅ Budget for år ${yearData.year} oprettet!`, 'success');
      }
      setShowCreateYearModal(false);
    } catch (error) {
      logger.error('Create year error:', error);
      showAlert(`❌ Kunne ikke oprette år: ${error.message}`, 'error');
    }
  };

  // Select budget period (year)
  const handleSelectPeriod = period => {
    // Period selection is handled automatically by useBudgetPeriods
    // This is just for UI feedback
    const status = period.status === 'archived' ? '📦 Arkiveret' : '';
    showAlert(`Skiftet til budget ${period.year} ${status}`, 'info');
  };

  // Check if current period is archived (read-only mode)
  const isReadOnly = activePeriod?.status === 'archived';

  // Tab content components
  const OverviewTab = () => (
    <div className="tab-content-wrapper">
      <SummaryCards summary={summary} />
      <div className="charts-container">
        <BalanceChart
          expenses={expenses}
          monthlyPaymentOrArray={
            settings.monthlyPayments || settings.monthlyPayment
          }
          previousBalance={settings.previousBalance}
        />
        <ExpenseDistribution expenses={expenses} />
      </div>
    </div>
  );

  const ExpensesTab = () => (
    <div className="tab-content-wrapper">
      {isReadOnly && (
        <div className="read-only-banner">
          <span className="read-only-icon">📦</span>
          <span className="read-only-text">
            Dette er et arkiveret budgetår. Du kan se data, men ikke redigere.
          </span>
        </div>
      )}
      <div className="expenses-header">
        <h2>📋 Dine udgifter</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
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
        readOnly={isReadOnly}
      />

      <button
        className="btn btn-danger"
        onClick={handleDeleteSelected}
        disabled={isReadOnly || selectedExpenses.length === 0}
      >
        🗑️ Slet valgte
      </button>
    </div>
  );

  const MonthlyTab = () => (
    <div className="tab-content-wrapper">
      <MonthlyOverview expenses={expenses} totalAnnual={summary.totalAnnual} />
    </div>
  );

  const ComparisonTab = () => (
    <div className="tab-content-wrapper">
      <YearComparison
        periods={periods}
        getExpensesForPeriod={getExpensesForPeriod}
      />
    </div>
  );

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
            onCreateYear={() => setShowCreateYearModal(true)}
            disabled={periodsLoading}
          />
          <Header
            user={user}
            onOpenSettings={() => setShowSettingsModal(true)}
          />
        </div>

        <DeleteConfirmation
          isOpen={deleteConfirmation.isOpen}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          expenseName={deleteConfirmation.expenseName}
          count={deleteConfirmation.count}
        />

        <div className="container">
          <TabView
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabs={[
              {
                icon: '📊',
                label: 'Oversigt',
                content: <OverviewTab />,
              },
              {
                icon: '📝',
                label: 'Udgifter',
                content: <ExpensesTab />,
              },
              {
                icon: '📅',
                label: 'Månedlig oversigt',
                content: <MonthlyTab />,
              },
              {
                icon: '📈',
                label: 'Sammenligning',
                content: <ComparisonTab />,
              },
            ]}
          />
        </div>

        {/* Add Expense Modal */}
        <AddExpenseModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddExpense}
        />

        {/* Settings Modal */}
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          monthlyPayment={settings.monthlyPayment}
          previousBalance={settings.previousBalance}
          monthlyPayments={settings.monthlyPayments}
          useVariablePayments={settings.useVariablePayments}
          onMonthlyPaymentChange={value =>
            dispatchSettings({ type: 'SET_MONTHLY_PAYMENT', payload: value })
          }
          onPreviousBalanceChange={value =>
            dispatchSettings({ type: 'SET_PREVIOUS_BALANCE', payload: value })
          }
          onMonthlyPaymentsChange={paymentsArray =>
            dispatchSettings({
              type: 'SET_MONTHLY_PAYMENTS',
              payload: paymentsArray,
            })
          }
          onTogglePaymentMode={useVariable =>
            dispatchSettings({ type: 'SET_PAYMENT_MODE', payload: useVariable })
          }
          onExport={handleExport}
          onImport={handleImport}
          activePeriod={activePeriod}
          onArchivePeriod={async periodId => {
            try {
              await archivePeriod(periodId);
              showAlert(
                `✅ År ${activePeriod.year} er nu arkiveret`,
                'success'
              );
            } catch (error) {
              logger.error('Archive period error:', error);
              showAlert(`❌ Kunne ikke arkivere år: ${error.message}`, 'error');
            }
          }}
          onOpenTemplateManager={() => setShowTemplateManagerModal(true)}
        />

        {/* Template Manager Modal */}
        <TemplateManagerModal
          isOpen={showTemplateManagerModal}
          onClose={() => setShowTemplateManagerModal(false)}
          activePeriod={activePeriod}
        />

        {/* Create Year Modal */}
        <CreateYearModal
          isOpen={showCreateYearModal}
          onClose={() => setShowCreateYearModal(false)}
          onCreate={handleCreateYear}
          periods={periods}
          calculateEndingBalance={calculateEndingBalance}
        />

        {/* Floating Action Button (FAB) */}
        <button
          className="fab"
          onClick={() => setShowAddModal(true)}
          title="Tilføj ny udgift (Ctrl+N)"
          aria-label="Tilføj ny udgift"
        >
          ➕
        </button>
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

  console.log('🔐 App wrapper render:', { hasUser: !!user, authLoading });

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

  // Wrap AppContent with SyncProvider to isolate sync state
  return (
    <SyncProvider user={user}>
      <AppContent />
    </SyncProvider>
  );
}

export default App;
