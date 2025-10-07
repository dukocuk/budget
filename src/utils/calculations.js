/**
 * Calculate annual amount for an expense based on frequency
 */
export function calculateAnnualAmount(expense) {
  if (!expense.amount || expense.amount <= 0) return 0

  if (expense.frequency === 'yearly') {
    return expense.amount
  } else if (expense.frequency === 'quarterly') {
    let quarterCount = 0
    for (let month = expense.start_month || expense.startMonth; month <= (expense.end_month || expense.endMonth); month++) {
      if ([1, 4, 7, 10].includes(month)) {
        quarterCount++
      }
    }
    return expense.amount * quarterCount
  } else {
    // monthly
    const months = Math.max(0, (expense.end_month || expense.endMonth) - (expense.start_month || expense.startMonth) + 1)
    return expense.amount * months
  }
}

/**
 * Get monthly amount for an expense in a specific month
 */
export function getMonthlyAmount(expense, month) {
  if (!expense.amount || expense.amount <= 0) return 0

  const startMonth = expense.start_month || expense.startMonth
  const endMonth = expense.end_month || expense.endMonth

  if (month < startMonth || month > endMonth) return 0

  if (expense.frequency === 'yearly') {
    return month === startMonth ? expense.amount : 0
  } else if (expense.frequency === 'quarterly') {
    return [1, 4, 7, 10].includes(month) ? expense.amount : 0
  } else {
    // monthly
    return expense.amount
  }
}

/**
 * Calculate budget summary
 */
export function calculateSummary(expenses, monthlyPayment, previousBalance) {
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

/**
 * Calculate monthly totals for all expenses
 */
export function calculateMonthlyTotals(expenses) {
  const monthlyTotals = Array(12).fill(0)

  expenses.forEach(expense => {
    for (let month = 1; month <= 12; month++) {
      monthlyTotals[month - 1] += getMonthlyAmount(expense, month)
    }
  })

  return monthlyTotals
}

/**
 * Calculate balance projection for each month
 */
export function calculateBalanceProjection(expenses, monthlyPayment, previousBalance) {
  const balances = []
  let runningBalance = previousBalance

  for (let month = 1; month <= 12; month++) {
    const monthlyExpenses = expenses.reduce((sum, expense) =>
      sum + getMonthlyAmount(expense, month), 0
    )

    runningBalance = runningBalance + monthlyPayment - monthlyExpenses
    balances.push({
      month,
      balance: Math.round(runningBalance),
      income: monthlyPayment,
      expenses: Math.round(monthlyExpenses)
    })
  }

  return balances
}

/**
 * Group expenses by frequency for pie chart
 */
export function groupExpensesByFrequency(expenses) {
  const groups = {
    monthly: 0,
    quarterly: 0,
    yearly: 0
  }

  expenses.forEach(expense => {
    groups[expense.frequency] += calculateAnnualAmount(expense)
  })

  return [
    { name: 'Månedlig', value: groups.monthly },
    { name: 'Kvartalsvis', value: groups.quarterly },
    { name: 'Årlig', value: groups.yearly }
  ].filter(item => item.value > 0)
}

/**
 * Validate expense data
 */
export function validateExpense(expense) {
  const errors = []

  if (!expense.name || expense.name.trim() === '') {
    errors.push('Navn er påkrævet')
  }

  if (!expense.amount || expense.amount <= 0) {
    errors.push('Beløb skal være større end 0')
  }

  if (!expense.frequency || !['monthly', 'quarterly', 'yearly'].includes(expense.frequency)) {
    errors.push('Ugyldig frekvens')
  }

  const startMonth = expense.start_month || expense.startMonth
  const endMonth = expense.end_month || expense.endMonth

  if (!startMonth || startMonth < 1 || startMonth > 12) {
    errors.push('Start måned skal være mellem 1 og 12')
  }

  if (!endMonth || endMonth < 1 || endMonth > 12) {
    errors.push('Slut måned skal være mellem 1 og 12')
  }

  if (startMonth && endMonth && endMonth < startMonth) {
    errors.push('Slut måned skal være efter eller lig med start måned')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}
