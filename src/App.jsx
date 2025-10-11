/**
 * Main Application Component - Refactored with modular architecture + Cloud Sync
 */

import { useState, useEffect } from 'react'
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
import Auth from './components/Auth'
import { useExpenses } from './hooks/useExpenses'
import { useAlert } from './hooks/useAlert'
import { useAuth } from './hooks/useAuth'
import { useSupabaseSync } from './hooks/useSupabaseSync'
import { useTheme } from './hooks/useTheme'
import { calculateSummary } from './utils/calculations'
import { generateCSV, downloadCSV } from './utils/exportHelpers'
import { parseCSV } from './utils/importHelpers'
import { DEFAULT_SETTINGS } from './utils/constants'
import './App.css'

function App() {
  const [monthlyPayment, setMonthlyPayment] = useState(DEFAULT_SETTINGS.monthlyPayment)
  const [previousBalance, setPreviousBalance] = useState(DEFAULT_SETTINGS.previousBalance)
  const [isInitialized, setIsInitialized] = useState(false)
  const [hasLoadedFromCloud, setHasLoadedFromCloud] = useState(false)
  const [activeTab, setActiveTab] = useState(0)

  // Authentication
  const { user, loading: authLoading } = useAuth()

  // Expenses management
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
  } = useExpenses()

  // Cloud sync
  const {
    syncStatus,
    lastSyncTime,
    syncError,
    isOnline,
    syncExpenses,
    syncSettings,
    loadExpenses,
    loadSettings
  } = useSupabaseSync(user)

  const { alert, showAlert } = useAlert()
  const { theme, toggleTheme } = useTheme()

  const summary = calculateSummary(expenses, monthlyPayment, previousBalance)

  // Load data from cloud when user logs in
  useEffect(() => {
    if (user && !isInitialized) {
      console.log('🔄 Initializing user data...')

      const loadData = async () => {
        try {
          // Load expenses FIRST - critical to prevent data loss
          const expensesResult = await loadExpenses()
          if (expensesResult.success) {
            if (expensesResult.data.length > 0) {
              setAllExpenses(expensesResult.data)
              console.log(`✅ Loaded ${expensesResult.data.length} expenses from cloud`)
            } else {
              console.log('ℹ️ No expenses found in cloud (new user or empty state)')
            }
          }

          // Load settings
          const settingsResult = await loadSettings()
          if (settingsResult.success && settingsResult.data) {
            setMonthlyPayment(settingsResult.data.monthlyPayment)
            setPreviousBalance(settingsResult.data.previousBalance)
            console.log('✅ Loaded settings from cloud')
          }

          // Mark as loaded from cloud - this MUST happen before sync enables
          setHasLoadedFromCloud(true)
          setIsInitialized(true)
          console.log('✅ Initial cloud load complete - sync now enabled')
        } catch (error) {
          console.error('❌ Error loading initial data:', error)
          // Still mark as initialized to allow app to function
          setHasLoadedFromCloud(true)
          setIsInitialized(true)
        }
      }

      loadData()
    }
  }, [user, isInitialized, loadExpenses, loadSettings, setAllExpenses])

  // Sync expenses whenever they change (ONLY after initial cloud load)
  useEffect(() => {
    if (user && isInitialized && hasLoadedFromCloud) {
      console.log(`🔄 Syncing ${expenses.length} expenses to cloud...`)
      syncExpenses(expenses)
    }
  }, [expenses, user, isInitialized, hasLoadedFromCloud, syncExpenses])

  // Sync settings whenever they change (ONLY after initial cloud load)
  useEffect(() => {
    if (user && isInitialized && hasLoadedFromCloud) {
      console.log('🔄 Syncing settings to cloud...')
      syncSettings(monthlyPayment, previousBalance)
    }
  }, [monthlyPayment, previousBalance, user, isInitialized, hasLoadedFromCloud, syncSettings])

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

  // Keyboard shortcuts
  const handleKeyPress = (e) => {
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

  // Add expense handler
  const handleAddExpense = () => {
    addExpense()
    showAlert('Ny udgift tilføjet!', 'success')
  }

  // Delete expense handler
  const handleDeleteExpense = (id) => {
    const expense = expenses.find(e => e.id === id)
    if (window.confirm(`Er du sikker på at du vil slette "${expense.name}"?`)) {
      deleteExpense(id)
      showAlert(`"${expense.name}" blev slettet`, 'success')
    }
  }

  // Delete selected handler
  const handleDeleteSelected = () => {
    const result = deleteSelected()
    if (!result.success) {
      showAlert('Vælg venligst udgifter at slette først', 'error')
      return
    }

    if (window.confirm(`Er du sikker på at du vil slette ${result.count} udgift(er)?`)) {
      showAlert(`${result.count} udgift(er) slettet!`, 'success')
    }
  }

  // Export to CSV
  const handleExport = () => {
    try {
      const csvContent = generateCSV(expenses, monthlyPayment, previousBalance)
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
          monthlyPayment={monthlyPayment}
          previousBalance={previousBalance}
        />
        <ExpenseDistribution expenses={expenses} />
      </div>
    </div>
  )

  const ExpensesTab = () => (
    <div className="tab-content-wrapper">
      {(canUndo || canRedo) && (
        <section className="controls">
          {canUndo && (
            <button
              className="btn btn-info"
              onClick={() => {
                undo()
                showAlert('Handling fortrudt', 'info')
              }}
              title="Fortryd (Ctrl+Z)"
            >
              ↶ Fortryd
            </button>
          )}
          {canRedo && (
            <button
              className="btn btn-info"
              onClick={() => {
                redo()
                showAlert('Handling gentaget', 'info')
              }}
              title="Gentag (Ctrl+Shift+Z)"
            >
              ↷ Gentag
            </button>
          )}
        </section>
      )}

      <h2>📋 Dine udgifter</h2>
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
        monthlyPayment={monthlyPayment}
        previousBalance={previousBalance}
        onMonthlyPaymentChange={setMonthlyPayment}
        onPreviousBalanceChange={setPreviousBalance}
        onExport={handleExport}
        onImport={handleImport}
        theme={theme}
        onToggleTheme={toggleTheme}
        syncStatus={syncStatus}
        lastSyncTime={lastSyncTime}
        syncError={syncError}
        isOnline={isOnline}
      />
    </div>
  )

  return (
    <ErrorBoundary>
      <div className="app" onKeyDown={handleKeyPress}>
        <Alert message={alert?.message} type={alert?.type} />
        <Header
          user={user}
          syncStatus={syncStatus}
          isOnline={isOnline}
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
      </div>
    </ErrorBoundary>
  )
}

export default App
