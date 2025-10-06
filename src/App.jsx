import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const initialExpenses = [
    {id: 1, name: "Sats Danmark", amount: 360, frequency: "monthly", startMonth: 1, endMonth: 12},
    {id: 2, name: "3 Danmark", amount: 160, frequency: "monthly", startMonth: 5, endMonth: 12},
    {id: 3, name: "IDA Fagforening", amount: 3460, frequency: "yearly", startMonth: 2, endMonth: 2},
    {id: 4, name: "Akademikernes A-kasse", amount: 1497, frequency: "quarterly", startMonth: 1, endMonth: 12},
    {id: 5, name: "Ulykkeforsikring", amount: 1395, frequency: "yearly", startMonth: 5, endMonth: 5},
    {id: 6, name: "Sygeforsikring Danmark", amount: 1676, frequency: "yearly", startMonth: 1, endMonth: 1},
    {id: 7, name: "Domea Bolig", amount: 190, frequency: "yearly", startMonth: 5, endMonth: 5},
    {id: 8, name: "Baba", amount: 1000, frequency: "monthly", startMonth: 1, endMonth: 12},
    {id: 9, name: "Aldersopsparing", amount: 118, frequency: "monthly", startMonth: 1, endMonth: 12},
    {id: 10, name: "Bitwarden", amount: 72, frequency: "yearly", startMonth: 7, endMonth: 7},
    {id: 11, name: "OpenAI", amount: 186, frequency: "yearly", startMonth: 1, endMonth: 1},
    {id: 12, name: "Kortgebyr", amount: 200, frequency: "yearly", startMonth: 12, endMonth: 12},
    {id: 13, name: "Gæld", amount: 1710, frequency: "monthly", startMonth: 1, endMonth: 12},
    {id: 14, name: "Rejsekort", amount: 1440, frequency: "monthly", startMonth: 5, endMonth: 12}
  ]

  const months = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"]
  
  const [expenses, setExpenses] = useState(initialExpenses)
  const [monthlyPayment, setMonthlyPayment] = useState(5700)
  const [previousBalance, setPreviousBalance] = useState(4831)
  const [selectedExpenses, setSelectedExpenses] = useState([])
  const [alert, setAlert] = useState(null)
  const [nextId, setNextId] = useState(15)

  // Show alert message
  const showAlert = (message, type = 'info') => {
    setAlert({ message, type })
    setTimeout(() => setAlert(null), 3000)
  }

  // Calculate annual amount for an expense
  const calculateAnnualAmount = (expense) => {
    if (!expense.amount || expense.amount <= 0) return 0
    
    if (expense.frequency === 'yearly') {
      return expense.amount
    } else if (expense.frequency === 'quarterly') {
      let quarterCount = 0
      for (let month = expense.startMonth; month <= expense.endMonth; month++) {
        if ([1, 4, 7, 10].includes(month)) {
          quarterCount++
        }
      }
      return expense.amount * quarterCount
    } else {
      const months = Math.max(0, expense.endMonth - expense.startMonth + 1)
      return expense.amount * months
    }
  }

  // Get monthly amount for an expense
  const getMonthlyAmount = (expense, month) => {
    if (!expense.amount || expense.amount <= 0) return 0
    if (month < expense.startMonth || month > expense.endMonth) return 0
    
    if (expense.frequency === 'yearly') {
      return month === expense.startMonth ? expense.amount : 0
    } else if (expense.frequency === 'quarterly') {
      return [1, 4, 7, 10].includes(month) ? expense.amount : 0
    } else {
      return expense.amount
    }
  }

  // Calculate summary values
  const calculateSummary = () => {
    const totalAnnual = expenses.reduce((sum, expense) => 
      sum + calculateAnnualAmount(expense), 0
    )
    const avgMonthly = totalAnnual / 12
    const monthlyBalance = monthlyPayment - avgMonthly
    const annualReserve = (monthlyBalance * 12) + previousBalance

    return {
      totalAnnual: Math.round(totalAnnual),
      avgMonthly: Math.round(avgMonthly),
      monthlyBalance: Math.round(monthlyBalance),
      annualReserve: Math.round(annualReserve)
    }
  }

  // Add new expense
  const addExpense = () => {
    const newExpense = {
      id: nextId,
      name: "Ny udgift",
      amount: 100,
      frequency: "monthly",
      startMonth: 1,
      endMonth: 12
    }
    setExpenses([...expenses, newExpense])
    setNextId(nextId + 1)
    showAlert('Ny udgift tilføjet!', 'success')
    
    // Scroll to bottom
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    }, 100)
  }

  // Update expense
  const updateExpense = (id, field, value) => {
    setExpenses(expenses.map(expense => {
      if (expense.id === id) {
        const updated = { ...expense }
        
        if (field === 'amount') {
          value = Math.max(0, parseFloat(value) || 0)
        } else if (field === 'startMonth' || field === 'endMonth') {
          value = parseInt(value)
          if (field === 'endMonth' && value < expense.startMonth) {
            value = expense.startMonth
          }
          if (field === 'startMonth' && value > expense.endMonth) {
            updated.endMonth = value
          }
        }
        
        updated[field] = value
        return updated
      }
      return expense
    }))
  }

  // Delete expense
  const deleteExpense = (id) => {
    const expense = expenses.find(e => e.id === id)
    if (window.confirm(`Er du sikker på at du vil slette "${expense.name}"?`)) {
      setExpenses(expenses.filter(e => e.id !== id))
      showAlert(`"${expense.name}" blev slettet`, 'success')
    }
  }

  // Toggle expense selection
  const toggleExpenseSelection = (id) => {
    if (selectedExpenses.includes(id)) {
      setSelectedExpenses(selectedExpenses.filter(expId => expId !== id))
    } else {
      setSelectedExpenses([...selectedExpenses, id])
    }
  }

  // Toggle select all
  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedExpenses(expenses.map(e => e.id))
    } else {
      setSelectedExpenses([])
    }
  }

  // Delete selected expenses
  const deleteSelected = () => {
    if (selectedExpenses.length === 0) {
      showAlert('Vælg venligst udgifter at slette først', 'error')
      return
    }
    
    if (window.confirm(`Er du sikker på at du vil slette ${selectedExpenses.length} udgift(er)?`)) {
      setExpenses(expenses.filter(e => !selectedExpenses.includes(e.id)))
      setSelectedExpenses([])
      showAlert(`${selectedExpenses.length} udgift(er) slettet!`, 'success')
    }
  }

  // Save to localStorage
  const saveToLocal = () => {
    try {
      const data = {
        expenses,
        monthlyPayment,
        previousBalance,
        savedDate: new Date().toISOString()
      }
      localStorage.setItem('budgetData2025', JSON.stringify(data))
      showAlert('Data gemt lokalt i din browser!', 'success')
    } catch (error) {
      console.error('Save error:', error)
      showAlert('Kunne ikke gemme data', 'error')
    }
  }

  // Load from localStorage
  const loadFromLocal = () => {
    try {
      const saved = localStorage.getItem('budgetData2025')
      if (saved) {
        const data = JSON.parse(saved)
        setExpenses(data.expenses || initialExpenses)
        setMonthlyPayment(data.monthlyPayment || 5700)
        setPreviousBalance(data.previousBalance || 0)
        
        const savedDate = data.savedDate ? 
          new Date(data.savedDate).toLocaleDateString('da-DK') : 
          'ukendt dato'
        
        showAlert(`Data hentet! (Gemt ${savedDate})`, 'success')
      } else {
        showAlert('Ingen gemt data fundet', 'info')
      }
    } catch (error) {
      console.error('Load error:', error)
      showAlert('Kunne ikke hente data', 'error')
    }
  }

  // Export to CSV
  const exportToCSV = () => {
    try {
      let csv = '\ufeff'
      csv += 'Udgift,Beløb,Frekvens,Start Måned,Slut Måned,Årlig Total\n'
      
      expenses.forEach(expense => {
        const annual = calculateAnnualAmount(expense)
        csv += `"${expense.name}",${expense.amount},"${expense.frequency}",`
        csv += `${months[expense.startMonth-1]},${months[expense.endMonth-1]},${annual}\n`
      })
      
      csv += '\n\nMånedlig Oversigt\n'
      csv += 'Udgift,' + months.join(',') + ',Total\n'
      
      expenses.forEach(expense => {
        let row = `"${expense.name}"`
        let total = 0
        for (let month = 1; month <= 12; month++) {
          const amount = getMonthlyAmount(expense, month)
          total += amount
          row += `,${amount}`
        }
        row += `,${total}`
        csv += row + '\n'
      })
      
      // Add totals row
      csv += 'TOTAL'
      let grandTotal = 0
      for (let month = 1; month <= 12; month++) {
        let monthTotal = 0
        expenses.forEach(expense => {
          monthTotal += getMonthlyAmount(expense, month)
        })
        grandTotal += monthTotal
        csv += `,${monthTotal}`
      }
      csv += `,${grandTotal}\n`
      
      // Add summary
      const summary = calculateSummary()
      csv += '\n\nOpsummering\n'
      csv += `Årlige udgifter,${summary.totalAnnual}\n`
      csv += `Månedlig indbetaling,${monthlyPayment}\n`
      csv += `Overført fra sidste år,${previousBalance}\n`
      
      // Create and download file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `budget_2025_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(link.href)
      
      showAlert('CSV fil downloadet!', 'success')
    } catch (error) {
      console.error('Export error:', error)
      showAlert('Kunne ikke eksportere CSV', 'error')
    }
  }

  const summary = calculateSummary()

  return (
    <div className="app">
      {/* Alert Messages */}
      {alert && (
        <div className={`alert alert-${alert.type}`}>
          {alert.message}
        </div>
      )}

      {/* Header */}
      <header className="header">
        <h1>💰 Budget Tracker 2025</h1>
        <p>Administrer dine faste udgifter i DKK</p>
      </header>

      <div className="container">
        {/* Settings Section */}
        <section className="settings-section">
          <h2>⚙️ Indstillinger</h2>
          <div className="settings-grid">
            <div className="settings-item">
              <label htmlFor="monthlyPayment">
                Månedlig indbetaling til budgetkonto:
              </label>
              <input
                type="number"
                id="monthlyPayment"
                value={monthlyPayment}
                onChange={(e) => setMonthlyPayment(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="settings-item">
              <label htmlFor="previousBalance">
                Overført fra sidste år:
              </label>
              <input
                type="number"
                id="previousBalance"
                value={previousBalance}
                onChange={(e) => setPreviousBalance(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </section>

        {/* Summary Cards */}
        <section className="summary-grid">
          <div className="summary-card">
            <h3>Årlige udgifter</h3>
            <div className="value">
              {summary.totalAnnual.toLocaleString('da-DK')} kr.
            </div>
          </div>
          <div className="summary-card">
            <h3>Gennemsnitlig månedlig udgift</h3>
            <div className="value">
              {summary.avgMonthly.toLocaleString('da-DK')} kr.
            </div>
          </div>
          <div className="summary-card">
            <h3>Månedlig balance</h3>
            <div className={`value ${summary.monthlyBalance >= 0 ? 'positive' : 'negative'}`}>
              {summary.monthlyBalance >= 0 ? '+' : ''}
              {summary.monthlyBalance.toLocaleString('da-DK')} kr.
            </div>
          </div>
          <div className="summary-card">
            <h3>Årlig reserve</h3>
            <div className={`value ${summary.annualReserve >= 0 ? 'positive' : 'negative'}`}>
              {summary.annualReserve.toLocaleString('da-DK')} kr.
            </div>
          </div>
        </section>

        {/* Control Buttons */}
        <section className="controls">
          <button className="btn btn-primary" onClick={addExpense}>
            ➕ Tilføj ny udgift
          </button>
          <button className="btn btn-success" onClick={exportToCSV}>
            📊 Eksporter til CSV
          </button>
          <button className="btn btn-secondary" onClick={saveToLocal}>
            💾 Gem lokalt
          </button>
          <button className="btn btn-secondary" onClick={loadFromLocal}>
            📁 Hent gemt data
          </button>
        </section>

        {/* Expenses Table */}
        <section>
          <h2>📋 Dine udgifter</h2>
          <div className="table-container">
            <table className="expenses-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedExpenses.length === expenses.length && expenses.length > 0}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th>Udgift</th>
                  <th>Beløb (kr.)</th>
                  <th>Frekvens</th>
                  <th>Start måned</th>
                  <th>Slut måned</th>
                  <th>Årlig total</th>
                  <th>Handling</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(expense => (
                  <tr key={expense.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedExpenses.includes(expense.id)}
                        onChange={() => toggleExpenseSelection(expense.id)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={expense.name}
                        onChange={(e) => updateExpense(expense.id, 'name', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={expense.amount}
                        onChange={(e) => updateExpense(expense.id, 'amount', e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        value={expense.frequency}
                        onChange={(e) => updateExpense(expense.id, 'frequency', e.target.value)}
                      >
                        <option value="monthly">Månedlig</option>
                        <option value="quarterly">Kvartalsvis</option>
                        <option value="yearly">Årlig</option>
                      </select>
                    </td>
                    <td>
                      <select
                        value={expense.startMonth}
                        onChange={(e) => updateExpense(expense.id, 'startMonth', e.target.value)}
                      >
                        {months.map((month, index) => (
                          <option key={index} value={index + 1}>{month}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={expense.endMonth}
                        onChange={(e) => updateExpense(expense.id, 'endMonth', e.target.value)}
                      >
                        {months.map((month, index) => (
                          <option key={index} value={index + 1}>{month}</option>
                        ))}
                      </select>
                    </td>
                    <td className="annual-total">
                      {calculateAnnualAmount(expense).toLocaleString('da-DK')} kr.
                    </td>
                    <td>
                      <button 
                        className="btn-delete"
                        onClick={() => deleteExpense(expense.id)}
                      >
                        Slet
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <button className="btn btn-danger" onClick={deleteSelected}>
            🗑️ Slet valgte
          </button>
        </section>

        {/* Monthly Overview */}
        <section className="monthly-view">
          <h2>📅 Månedlig oversigt</h2>
          <div className="table-container">
            <table className="monthly-table">
              <thead>
                <tr>
                  <th>Udgift</th>
                  {months.map(month => (
                    <th key={month}>{month}</th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(expense => {
                  let total = 0
                  return (
                    <tr key={expense.id}>
                      <td className="expense-name">{expense.name}</td>
                      {months.map((_, index) => {
                        const amount = getMonthlyAmount(expense, index + 1)
                        total += amount
                        return (
                          <td key={index}>
                            {amount > 0 ? amount.toLocaleString('da-DK') : '-'}
                          </td>
                        )
                      })}
                      <td className="total-cell">
                        {total.toLocaleString('da-DK')}
                      </td>
                    </tr>
                  )
                })}
                <tr className="total-row">
                  <td className="expense-name">TOTAL</td>
                  {months.map((_, index) => {
                    let monthTotal = 0
                    expenses.forEach(expense => {
                      monthTotal += getMonthlyAmount(expense, index + 1)
                    })
                    return (
                      <td key={index}>
                        {monthTotal.toLocaleString('da-DK')}
                      </td>
                    )
                  })}
                  <td className="total-cell">
                    {summary.totalAnnual.toLocaleString('da-DK')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

export default App