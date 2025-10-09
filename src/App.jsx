/**
 * Main Application Component - Refactored with modular architecture
 */

import { useState } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Header } from './components/Header'
import { Alert } from './components/Alert'
import { Settings } from './components/Settings'
import { SummaryCards } from './components/SummaryCards'
import { ExpensesTable } from './components/ExpensesTable'
import { MonthlyOverview } from './components/MonthlyOverview'
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

  return (
    <ErrorBoundary>
      <div className="app" onKeyDown={handleKeyPress}>
        <Alert message={alert?.message} type={alert?.type} />
        <Header />

        <div className="container">
          <Settings
            monthlyPayment={monthlyPayment}
            previousBalance={previousBalance}
            onMonthlyPaymentChange={setMonthlyPayment}
            onPreviousBalanceChange={setPreviousBalance}
          />

          <SummaryCards summary={summary} />

          <section className="controls">
            <button className="btn btn-primary" onClick={handleAddExpense}>
              ➕ Tilføj ny udgift
            </button>
            <button className="btn btn-success" onClick={handleExport}>
              📊 Eksporter til CSV
            </button>
            <button className="btn btn-secondary" onClick={handleSave}>
              💾 Gem lokalt
            </button>
            <button className="btn btn-secondary" onClick={handleLoad}>
              📁 Hent gemt data
            </button>
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

          <section>
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
          </section>

          <MonthlyOverview expenses={expenses} totalAnnual={summary.totalAnnual} />
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default App
