import { useState } from 'react'
import { useExpenses } from '../hooks/useExpenses'
import { calculateAnnualAmount } from '../utils/calculations'
import './ExpenseManager.css'

const months = ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"]

export default function ExpenseManager({ userId }) {
  const { expenses, loading, addExpense, updateExpense, deleteExpense, deleteExpenses } = useExpenses(userId)
  const [selectedIds, setSelectedIds] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

  if (loading) {
    return <div className="loading">Indlæser udgifter...</div>
  }

  const filteredExpenses = expenses.filter(expense =>
    expense.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddNew = async () => {
    try {
      await addExpense({
        name: "Ny udgift",
        amount: 100,
        frequency: "monthly",
        startMonth: 1,
        endMonth: 12
      })
    } catch (error) {
      alert('Fejl ved tilføjelse: ' + error.message)
    }
  }

  const handleUpdate = async (id, field, value) => {
    try {
      const updates = { [field]: value }
      await updateExpense(id, updates)
    } catch (error) {
      alert('Fejl ved opdatering: ' + error.message)
    }
  }

  const handleDelete = async (id, name) => {
    if (window.confirm(`Er du sikker på at du vil slette "${name}"?`)) {
      try {
        await deleteExpense(id)
      } catch (error) {
        alert('Fejl ved sletning: ' + error.message)
      }
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      alert('Vælg venligst udgifter at slette')
      return
    }

    if (window.confirm(`Er du sikker på at du vil slette ${selectedIds.length} udgift(er)?`)) {
      try {
        await deleteExpenses(selectedIds)
        setSelectedIds([])
      } catch (error) {
        alert('Fejl ved sletning: ' + error.message)
      }
    }
  }

  const toggleSelection = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    setSelectedIds(prev =>
      prev.length === filteredExpenses.length ? [] : filteredExpenses.map(e => e.id)
    )
  }

  return (
    <div className="expense-manager">
      <div className="manager-header">
        <h2>💰 Dine udgifter</h2>
        <div className="manager-actions">
          <input
            type="text"
            placeholder="Søg udgifter..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button onClick={handleAddNew} className="btn btn-primary">
            ➕ Tilføj ny udgift
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="expenses-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedIds.length === filteredExpenses.length && filteredExpenses.length > 0}
                  onChange={toggleSelectAll}
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
            {filteredExpenses.map(expense => (
              <tr key={expense.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(expense.id)}
                    onChange={() => toggleSelection(expense.id)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={expense.name}
                    onChange={(e) => handleUpdate(expense.id, 'name', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={expense.amount}
                    onChange={(e) => handleUpdate(expense.id, 'amount', parseInt(e.target.value) || 0)}
                  />
                </td>
                <td>
                  <select
                    value={expense.frequency}
                    onChange={(e) => handleUpdate(expense.id, 'frequency', e.target.value)}
                  >
                    <option value="monthly">Månedlig</option>
                    <option value="quarterly">Kvartalsvis</option>
                    <option value="yearly">Årlig</option>
                  </select>
                </td>
                <td>
                  <select
                    value={expense.startMonth}
                    onChange={(e) => handleUpdate(expense.id, 'startMonth', parseInt(e.target.value))}
                  >
                    {months.map((month, index) => (
                      <option key={index} value={index + 1}>{month}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={expense.endMonth}
                    onChange={(e) => handleUpdate(expense.id, 'endMonth', parseInt(e.target.value))}
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
                    onClick={() => handleDelete(expense.id, expense.name)}
                  >
                    Slet
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedIds.length > 0 && (
        <button className="btn btn-danger" onClick={handleDeleteSelected}>
          🗑️ Slet {selectedIds.length} valgte
        </button>
      )}

      {filteredExpenses.length === 0 && searchTerm && (
        <div className="empty-state">
          <p>Ingen udgifter matcher "{searchTerm}"</p>
        </div>
      )}

      {expenses.length === 0 && !searchTerm && (
        <div className="empty-state">
          <p>Ingen udgifter endnu. Klik "Tilføj ny udgift" for at komme i gang!</p>
        </div>
      )}
    </div>
  )
}
