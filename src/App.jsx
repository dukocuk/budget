/**
 * Main Application Component - Refactored with modular architecture
 */

import { useState, useEffect } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Header } from './components/Header'
import { Alert } from './components/Alert'
import { Settings } from './components/Settings'
import { SummaryCards } from './components/SummaryCards'
import { ExpensesTable } from './components/ExpensesTable'
import { MonthlyOverview } from './components/MonthlyOverview'
import { AddExpenseModal } from './components/AddExpenseModal'
import { DeleteConfirmation } from './components/DeleteConfirmation'
import { TabView } from './components/TabView'
import { BalanceChart } from './components/BalanceChart'
import { ExpenseDistribution } from './components/ExpenseDistribution'
import { useExpenses } from './hooks/useExpenses'
import { useAlert } from './hooks/useAlert'
import { useLocalStorage } from './hooks/useLocalStorage'
import { calculateSummary } from './utils/calculations'
import { generateCSV, downloadCSV } from './utils/exportHelpers'
import { DEFAULT_SETTINGS, STORAGE_KEY } from './utils/constants'
import './App.css'

function App() {
  const [monthlyPayment, setMonthlyPayment] = useState(DEFAULT_SETTINGS.monthlyPayment)
  const [previousBalance, setPreviousBalance] = useState(DEFAULT_SETTINGS.previousBalance)
  const [showAddModal, setShowAddModal] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    expenseName: '',
    expenseId: null,
    isBulk: false,
    count: 0
  })

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

  const { alert, showAlert } = useAlert()
  const { setValue, loadValue } = useLocalStorage(STORAGE_KEY)

  const summary = calculateSummary(expenses, monthlyPayment, previousBalance)

  // Keyboard shortcuts
  const handleKeyPress = (e) => {
    // Ctrl/Cmd + N for new expense modal
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault()
      setShowAddModal(true)
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

  // Add keyboard listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUndo, canRedo, showAddModal])

  // Close add expense modal
  const handleCloseAddModal = () => {
    setShowAddModal(false)
  }

  // Add expense from modal
  const handleAddExpenseFromModal = (formData) => {
    addExpense(formData)
    showAlert('Ny udgift tilføjet!', 'success')
    setActiveTab(1) // Switch to Udgifter tab
  }

  // Show delete confirmation
  const handleDeleteExpense = (id) => {
    const expense = expenses.find(e => e.id === id)
    setDeleteConfirmation({
      isOpen: true,
      expenseName: expense.name,
      expenseId: id,
      isBulk: false,
      count: 0
    })
  }

  // Confirm single delete
  const confirmDelete = () => {
    if (deleteConfirmation.isBulk) {
      deleteSelected()
      showAlert(`${deleteConfirmation.count} udgift(er) slettet!`, 'success')
    } else {
      const expenseName = deleteConfirmation.expenseName
      deleteExpense(deleteConfirmation.expenseId)
      showAlert(`"${expenseName}" blev slettet`, 'success')
    }
    setDeleteConfirmation({
      isOpen: false,
      expenseName: '',
      expenseId: null,
      isBulk: false,
      count: 0
    })
  }

  // Cancel delete
  const cancelDelete = () => {
    setDeleteConfirmation({
      isOpen: false,
      expenseName: '',
      expenseId: null,
      isBulk: false,
      count: 0
    })
  }

  // Show delete selected confirmation
  const handleDeleteSelected = () => {
    if (selectedExpenses.length === 0) {
      showAlert('Vælg venligst udgifter at slette først', 'error')
      return
    }

    setDeleteConfirmation({
      isOpen: true,
      expenseName: '',
      expenseId: null,
      isBulk: true,
      count: selectedExpenses.length
    })
  }

  // Save to localStorage
  const handleSave = () => {
    const data = {
      expenses,
      monthlyPayment,
      previousBalance,
      savedDate: new Date().toISOString()
    }

    const result = setValue(data)
    if (result.success) {
      showAlert('Data gemt lokalt i din browser!', 'success')
    } else {
      showAlert('Kunne ikke gemme data', 'error')
    }
  }

  // Load from localStorage
  const handleLoad = () => {
    const result = loadValue()
    if (result.success && result.data) {
      setAllExpenses(result.data.expenses || [])
      setMonthlyPayment(result.data.monthlyPayment || DEFAULT_SETTINGS.monthlyPayment)
      setPreviousBalance(result.data.previousBalance || DEFAULT_SETTINGS.previousBalance)

      const savedDate = result.data.savedDate
        ? new Date(result.data.savedDate).toLocaleDateString('da-DK')
        : 'ukendt dato'

      showAlert(`Data hentet! (Gemt ${savedDate})`, 'success')
    } else {
      showAlert('Ingen gemt data fundet', 'info')
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

  // Tab content definitions
  const tabs = [
    {
      icon: '📊',
      label: 'Oversigt',
      dropdownItems: [
        {
          icon: '📈',
          label: 'Balance udvikling',
          content: (
            <div className="overview-tab">
              <BalanceChart
                expenses={expenses}
                monthlyPayment={monthlyPayment}
                previousBalance={previousBalance}
              />
            </div>
          )
        },
        {
          icon: '🥧',
          label: 'Udgiftsfordeling',
          content: (
            <div className="overview-tab">
              <ExpenseDistribution expenses={expenses} />
            </div>
          )
        }
      ]
    },
    {
      icon: '📝',
      label: 'Udgifter',
      content: (
        <div className="expenses-tab">
          <ExpensesTable
            expenses={expenses}
            selectedExpenses={selectedExpenses}
            onToggleSelection={toggleExpenseSelection}
            onToggleSelectAll={toggleSelectAll}
            onUpdate={updateExpense}
            onDelete={handleDeleteExpense}
            onAdd={(data) => {
              addExpense(data)
              showAlert('Ny udgift tilføjet!', 'success')
            }}
          />
          <button className="btn btn-danger" onClick={handleDeleteSelected}>
            <span className="btn-icon">🗑️</span>
            <span>Slet valgte</span>
          </button>
        </div>
      )
    },
    {
      icon: '📅',
      label: 'Månedlig oversigt',
      content: (
        <div className="monthly-tab">
          <MonthlyOverview expenses={expenses} totalAnnual={summary.totalAnnual} />
        </div>
      )
    },
    {
      icon: '⚙️',
      label: 'Indstillinger',
      content: (
        <div className="settings-tab">
          <Settings
            monthlyPayment={monthlyPayment}
            previousBalance={previousBalance}
            onMonthlyPaymentChange={setMonthlyPayment}
            onPreviousBalanceChange={setPreviousBalance}
            onSave={handleSave}
            onLoad={handleLoad}
            onExport={handleExport}
          />
        </div>
      )
    }
  ]

  return (
    <ErrorBoundary>
      <div className="app">
        <Alert message={alert?.message} type={alert?.type} />
        <Header />

        <AddExpenseModal
          isOpen={showAddModal}
          onClose={handleCloseAddModal}
          onAdd={handleAddExpenseFromModal}
        />

        <DeleteConfirmation
          isOpen={deleteConfirmation.isOpen}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          expenseName={deleteConfirmation.expenseName}
          count={deleteConfirmation.count}
        />

        <div className="container">
          <SummaryCards summary={summary} />

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
                <span className="btn-icon">↶</span>
                <span>Fortryd</span>
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
                <span className="btn-icon">↷</span>
                <span>Gentag</span>
              </button>
            )}
          </section>

          <TabView tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default App
