/**
 * Main Application Component - Refactored with modular architecture + Cloud Sync
 * OPTIMIZATION: Uses React.startTransition for batched state updates to prevent chart re-renders
 */

import { useState, useEffect, useMemo, useReducer, useRef, startTransition } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Header } from './components/Header'
import { Alert } from './components/Alert'
import { Settings } from './components/Settings'
import { SummaryCards } from './components/SummaryCards'
import { ExpensesTable } from './components/ExpensesTable'
import { MonthlyOverview } from './components/MonthlyOverview'
import { TabView } from './components/TabView'
import { BalanceChart } from './components/BalanceChart'
import { ExpenseDistribution } from './components/ExpenseDistribution'
import { AddExpenseModal } from './components/AddExpenseModal'
import { DeleteConfirmation } from './components/DeleteConfirmation'
import Auth from './components/Auth'
import { useExpenses } from './hooks/useExpenses'
import { useAlert } from './hooks/useAlert'
import { useAuth } from './hooks/useAuth'
import { SyncProvider } from './contexts/SyncContext'
import { useSyncContext } from './hooks/useSyncContext'
import { calculateSummary } from './utils/calculations'
import { generateCSV, downloadCSV } from './utils/exportHelpers'
import { parseCSV } from './utils/importHelpers'
import { DEFAULT_SETTINGS } from './utils/constants'
import './App.css'

/**
 * Settings reducer - Batches monthlyPayment, previousBalance, and monthlyPayments array updates
 */
const settingsReducer = (state, action) => {
  switch (action.type) {
    case 'SET_MONTHLY_PAYMENT':
      return { ...state, monthlyPayment: action.payload }
    case 'SET_PREVIOUS_BALANCE':
      return { ...state, previousBalance: action.payload }
    case 'SET_MONTHLY_PAYMENTS':
      return { ...state, monthlyPayments: action.payload, useVariablePayments: action.payload !== null }
    case 'SET_PAYMENT_MODE':
      return { ...state, useVariablePayments: action.payload, monthlyPayments: action.payload ? state.monthlyPayments : null }
    case 'SET_BOTH':
      return {
        monthlyPayment: action.payload.monthlyPayment,
        previousBalance: action.payload.previousBalance
      }
    case 'SET_ALL':
      return {
        monthlyPayment: action.payload.monthlyPayment,
        previousBalance: action.payload.previousBalance,
        monthlyPayments: action.payload.monthlyPayments || null,
        useVariablePayments: action.payload.monthlyPayments !== null && action.payload.monthlyPayments !== undefined
      }
    default:
      return state
  }
}

/**
 * AppContent - The main application logic (wrapped by SyncProvider)
 */
function AppContent() {
  // Use reducer to batch settings updates (prevents multiple re-renders)
  const [settings, dispatchSettings] = useReducer(settingsReducer, {
    monthlyPayment: DEFAULT_SETTINGS.monthlyPayment,
    previousBalance: DEFAULT_SETTINGS.previousBalance,
    monthlyPayments: null,
    useVariablePayments: false
  })

  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [activeTab, setActiveTab] = useState(0)
  const [showAddModal, setShowAddModal] = useState(false)

  // Delete confirmation state
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    expenseId: null,
    expenseName: null,
    count: 0
  })

  // Track if we're in initial data load to prevent sync triggers
  const isInitialLoadRef = useRef(true)

  // Track last synced values to prevent cascading syncs
  const lastSyncedExpensesRef = useRef(null)
  const lastSyncedSettingsRef = useRef({ monthlyPayment: 0, previousBalance: 0, monthlyPayments: null })

  // Authentication
  const { user } = useAuth()

  // Expenses management (pass user ID for PGlite filtering)
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
    canRedo
  } = useExpenses(user?.id)

  // Cloud sync (from isolated context to prevent re-renders)
  const {
    syncExpenses,
    syncSettings,
    loadExpenses,
    loadSettings,
    immediateSyncExpenses,
    isOnline
  } = useSyncContext()

  const { alert, showAlert } = useAlert()

  // Memoize expensive calculations to prevent chart re-renders
  // Use monthlyPayments array if available, otherwise fallback to single monthlyPayment
  const summary = useMemo(() => {
    const paymentValue = settings.monthlyPayments || settings.monthlyPayment
    return calculateSummary(expenses, paymentValue, settings.previousBalance)
  }, [expenses, settings.monthlyPayment, settings.monthlyPayments, settings.previousBalance])

  // Load data from cloud when user logs in (OPTIMIZED: batched updates prevent multiple re-renders)
  useEffect(() => {
    if (user && !isInitialized) {
      const loadData = async () => {
        setIsLoadingData(true)

        try {
          // Load expenses and settings in PARALLEL to reduce load time
          const [expensesResult, settingsResult] = await Promise.all([
            loadExpenses(),
            loadSettings()
          ])

          // ATOMIC UPDATE: Use startTransition to batch ALL state updates into a single render
          // This prevents charts from re-rendering multiple times during initialization
          startTransition(() => {
            // Update expenses first (if available)
            if (expensesResult.success && expensesResult.data.length > 0) {
              setAllExpenses(expensesResult.data)
            }

            // Update settings using reducer (batches all values in single state update)
            if (settingsResult.success && settingsResult.data) {
              dispatchSettings({
                type: 'SET_ALL',
                payload: {
                  monthlyPayment: settingsResult.data.monthlyPayment,
                  previousBalance: settingsResult.data.previousBalance,
                  monthlyPayments: settingsResult.data.monthlyPayments || null
                }
              })
            }

            // Mark initial load as complete BEFORE enabling sync
            isInitialLoadRef.current = false
            setIsLoadingData(false)
            setIsInitialized(true)
          })
        } catch (error) {
          console.error('❌ Error loading initial data:', error)
          // Even on error, ensure loading state is cleared
          startTransition(() => {
            isInitialLoadRef.current = false
            setIsLoadingData(false)
            setIsInitialized(true)
          })
        }
      }

      loadData()
    }
  }, [user, isInitialized, loadExpenses, loadSettings, setAllExpenses])

  // Sync expenses whenever they change (ONLY after initialization AND initial load complete)
  // OPTIMIZATION: Only sync if expenses actually changed to prevent cascading syncs
  useEffect(() => {
    if (user && isInitialized && !isLoadingData && !isInitialLoadRef.current) {
      // Compare with last synced state to avoid redundant syncs
      const expensesChanged = JSON.stringify(expenses) !== JSON.stringify(lastSyncedExpensesRef.current)

      if (expensesChanged) {
        lastSyncedExpensesRef.current = expenses
        syncExpenses(expenses)
      }
    }
  }, [expenses, user, isInitialized, isLoadingData, syncExpenses])

  // Sync settings whenever they change (ONLY after initialization AND initial load complete)
  // OPTIMIZATION: Only sync if settings actually changed to prevent cascading syncs
  useEffect(() => {
    if (user && isInitialized && !isLoadingData && !isInitialLoadRef.current) {
      // Compare with last synced state to avoid redundant syncs
      const monthlyPaymentsChanged = JSON.stringify(settings.monthlyPayments) !== JSON.stringify(lastSyncedSettingsRef.current.monthlyPayments)
      const settingsChanged =
        settings.monthlyPayment !== lastSyncedSettingsRef.current.monthlyPayment ||
        settings.previousBalance !== lastSyncedSettingsRef.current.previousBalance ||
        monthlyPaymentsChanged

      if (settingsChanged) {
        lastSyncedSettingsRef.current = { ...settings }
        syncSettings(settings.monthlyPayment, settings.previousBalance, settings.monthlyPayments)
      }
    }
  }, [settings.monthlyPayment, settings.previousBalance, settings.monthlyPayments, settings, user, isInitialized, isLoadingData, syncSettings])

  // Show loading screen while fetching cloud data
  if (isLoadingData) {
    return (
      <div className="auth-loading-container">
        <div className="spinner"></div>
        <p>Henter dine data...</p>
      </div>
    )
  }

  // Keyboard shortcuts
  const handleKeyPress = (e) => {
    // Ctrl/Cmd + N for new expense
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault()
      setShowAddModal(true)
      return
    }
    // Ctrl/Cmd + Z for undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      if (canUndo && undo()) {
        showAlert('Handling fortrudt', 'info')
      }
    }
    // Ctrl/Cmd + Shift + Z for redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
      e.preventDefault()
      if (canRedo && redo()) {
        showAlert('Handling gentaget', 'info')
      }
    }
  }

  // Add expense handler - receives form data from modal
  const handleAddExpense = (formData) => {
    addExpense(formData)
    showAlert('Ny udgift tilføjet!', 'success')
  }

  // Open delete confirmation modal for single expense
  const handleDeleteExpense = (id) => {
    const expense = expenses.find(e => e.id === id)
    if (!expense) return

    setDeleteConfirmation({
      isOpen: true,
      expenseId: id,
      expenseName: expense.name,
      count: 0
    })
  }

  // Open delete confirmation modal for multiple expenses
  const handleDeleteSelected = () => {
    if (selectedExpenses.length === 0) {
      showAlert('⚠️ Vælg venligst udgifter at slette først', 'warning')
      return
    }

    setDeleteConfirmation({
      isOpen: true,
      expenseId: null,
      expenseName: null,
      count: selectedExpenses.length
    })
  }

  // Confirm and execute deletion
  const confirmDelete = async () => {
    try {
      if (deleteConfirmation.count > 0) {
        // Bulk delete
        const count = deleteConfirmation.count
        const result = deleteSelected()

        // Immediately sync to cloud (bypass debounce for critical operations)
        if (user && isOnline && result.success) {
          const updatedExpenses = expenses.filter(e => !selectedExpenses.includes(e.id))
          await immediateSyncExpenses(updatedExpenses)
        }

        showAlert(`✅ ${count} udgift(er) slettet`, 'success')
      } else {
        // Single delete
        const expense = expenses.find(e => e.id === deleteConfirmation.expenseId)

        // Calculate updated expenses BEFORE deleting
        const updatedExpenses = expenses.filter(e => e.id !== deleteConfirmation.expenseId)

        // Delete from local state
        deleteExpense(deleteConfirmation.expenseId)

        // Immediately sync to cloud (bypass debounce for critical operations)
        if (user && isOnline) {
          console.log(`🗑️ Immediately syncing delete: ${updatedExpenses.length} expenses remaining`)
          await immediateSyncExpenses(updatedExpenses)
        }

        showAlert(`✅ "${expense?.name}" blev slettet`, 'success')
      }

      setDeleteConfirmation({ isOpen: false, expenseId: null, expenseName: null, count: 0 })
    } catch (error) {
      showAlert('❌ Fejl ved sletning: ' + error.message, 'error')
      setDeleteConfirmation({ isOpen: false, expenseId: null, expenseName: null, count: 0 })
    }
  }

  // Cancel deletion
  const cancelDelete = () => {
    setDeleteConfirmation({ isOpen: false, expenseId: null, expenseName: null, count: 0 })
  }

  // Export to CSV
  const handleExport = () => {
    try {
      const paymentValue = settings.monthlyPayments || settings.monthlyPayment
      const csvContent = generateCSV(expenses, paymentValue, settings.previousBalance)
      downloadCSV(csvContent)
      showAlert('CSV fil downloadet!', 'success')
    } catch (error) {
      console.error('Export error:', error)
      showAlert('Kunne ikke eksportere CSV', 'error')
    }
  }

  // Import from CSV
  const handleImport = async (file) => {
    try {
      const text = await file.text()
      const result = parseCSV(text)

      if (!result.success) {
        showAlert(`Import fejl: ${result.errors.join(', ')}`, 'error')
        return
      }

      if (result.expenses.length === 0) {
        showAlert('Ingen gyldige udgifter fundet i CSV filen', 'info')
        return
      }

      // Add imported expenses
      result.expenses.forEach(expense => {
        addExpense(expense)
      })

      showAlert(`${result.expenses.length} udgift(er) importeret!`, 'success')
    } catch (error) {
      console.error('Import error:', error)
      showAlert('Kunne ikke importere CSV fil', 'error')
    }
  }

  // Tab content components
  const OverviewTab = () => (
    <div className="tab-content-wrapper">
      <SummaryCards summary={summary} />
      <div className="charts-container">
        <BalanceChart
          expenses={expenses}
          monthlyPaymentOrArray={settings.monthlyPayments || settings.monthlyPayment}
          previousBalance={settings.previousBalance}
        />
        <ExpenseDistribution expenses={expenses} />
      </div>
    </div>
  )

  const ExpensesTab = () => (
    <div className="tab-content-wrapper">
      <div className="expenses-header">
        <h2>📋 Dine udgifter</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
          title="Tilføj ny udgift (Ctrl+N)"
        >
          ➕ Tilføj udgift
        </button>
      </div>

      <ExpensesTable
        expenses={expenses}
        selectedExpenses={selectedExpenses}
        onToggleSelection={toggleExpenseSelection}
        onToggleSelectAll={toggleSelectAll}
        onUpdate={updateExpense}
        onDelete={handleDeleteExpense}
      />

      <button className="btn btn-danger" onClick={handleDeleteSelected}>
        🗑️ Slet valgte
      </button>
    </div>
  )

  const MonthlyTab = () => (
    <div className="tab-content-wrapper">
      <MonthlyOverview expenses={expenses} totalAnnual={summary.totalAnnual} />
    </div>
  )

  const SettingsTab = () => (
    <div className="tab-content-wrapper">
      <Settings
        monthlyPayment={settings.monthlyPayment}
        previousBalance={settings.previousBalance}
        monthlyPayments={settings.monthlyPayments}
        useVariablePayments={settings.useVariablePayments}
        onMonthlyPaymentChange={(value) => dispatchSettings({ type: 'SET_MONTHLY_PAYMENT', payload: value })}
        onPreviousBalanceChange={(value) => dispatchSettings({ type: 'SET_PREVIOUS_BALANCE', payload: value })}
        onMonthlyPaymentsChange={(paymentsArray) => dispatchSettings({ type: 'SET_MONTHLY_PAYMENTS', payload: paymentsArray })}
        onTogglePaymentMode={(useVariable) => dispatchSettings({ type: 'SET_PAYMENT_MODE', payload: useVariable })}
        onExport={handleExport}
        onImport={handleImport}
      />
    </div>
  )

  return (
    <ErrorBoundary>
      <div className="app" onKeyDown={handleKeyPress}>
        <Alert message={alert?.message} type={alert?.type} />
        <Header user={user} />

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
                content: <OverviewTab />
              },
              {
                icon: '📝',
                label: 'Udgifter',
                content: <ExpensesTab />
              },
              {
                icon: '📅',
                label: 'Månedlig oversigt',
                content: <MonthlyTab />
              },
              {
                icon: '⚙️',
                label: 'Indstillinger',
                content: <SettingsTab />
              }
            ]}
          />
        </div>

        {/* Add Expense Modal */}
        <AddExpenseModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddExpense}
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
  )
}

/**
 * App - Wrapper component that provides SyncContext
 */
function App() {
  const { user, loading: authLoading } = useAuth()

  // Show auth screen if not logged in
  if (authLoading) {
    return (
      <div className="auth-loading-container">
        <div className="spinner"></div>
        <p>Indlæser...</p>
      </div>
    )
  }

  if (!user) {
    return <Auth />
  }

  // Wrap AppContent with SyncProvider to isolate sync state
  return (
    <SyncProvider user={user}>
      <AppContent />
    </SyncProvider>
  )
}

export default App
