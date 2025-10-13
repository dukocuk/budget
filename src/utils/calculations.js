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
 * Get monthly payment for a specific month
 * Handles both fixed (single value) and variable (array) payment modes
 * @param {number} defaultPayment - Default monthly payment (fallback)
 * @param {number[]|null} monthlyPayments - Array of 12 monthly payments
 * @param {number} month - Month number (1-12)
 * @returns {number} Payment for that month
 */
export function getMonthlyPayment(defaultPayment, monthlyPayments, month) {
  if (month < 1 || month > 12) {
    throw new Error('Month must be between 1 and 12')
  }

  // Use monthly payments array if available and valid
  if (monthlyPayments && Array.isArray(monthlyPayments) && monthlyPayments.length === 12) {
    return monthlyPayments[month - 1] || 0
  }

  // Fallback to default payment
  return defaultPayment
}

/**
 * Calculate budget summary
 * Supports both fixed monthly payment and variable monthly payments array
 */
export function calculateSummary(expenses, monthlyPaymentOrArray, previousBalance) {
  const totalAnnual = expenses.reduce((sum, expense) =>
    sum + calculateAnnualAmount(expense), 0
  )

  // Calculate total annual income (handle both fixed and variable)
  let totalAnnualIncome
  if (Array.isArray(monthlyPaymentOrArray)) {
    totalAnnualIncome = monthlyPaymentOrArray.reduce((sum, val) => sum + (val || 0), 0)
  } else {
    totalAnnualIncome = monthlyPaymentOrArray * 12
  }

  const avgMonthly = totalAnnual / 12
  const avgMonthlyIncome = totalAnnualIncome / 12
  const monthlyBalance = avgMonthlyIncome - avgMonthly
  const annualReserve = (monthlyBalance * 12) + previousBalance

  return {
    totalAnnual: Math.round(totalAnnual),
    avgMonthly: Math.round(avgMonthly),
    avgMonthlyIncome: Math.round(avgMonthlyIncome),
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
 * Supports both fixed monthly payment and variable monthly payments array
 */
export function calculateBalanceProjection(expenses, monthlyPaymentOrArray, previousBalance) {
  const balances = []
  let runningBalance = previousBalance

  // Convert to array for consistent handling
  const payments = Array.isArray(monthlyPaymentOrArray)
    ? monthlyPaymentOrArray
    : Array(12).fill(monthlyPaymentOrArray)

  for (let month = 1; month <= 12; month++) {
    const monthlyExpenses = expenses.reduce((sum, expense) =>
      sum + getMonthlyAmount(expense, month), 0
    )

    const monthlyIncome = payments[month - 1] || 0

    runningBalance = runningBalance + monthlyIncome - monthlyExpenses
    balances.push({
      month,
      balance: Math.round(runningBalance),
      income: monthlyIncome,
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
 * Calculate monthly breakdown by frequency type for stacked bar chart
 * Returns array of 12 months with expenses grouped by frequency
 */
export function calculateMonthlyBreakdownByFrequency(expenses) {
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']

  return MONTH_NAMES.map((monthName, index) => {
    const month = index + 1
    const breakdown = {
      month: monthName,
      monthly: 0,
      quarterly: 0,
      yearly: 0,
      total: 0
    }

    expenses.forEach(expense => {
      const amount = getMonthlyAmount(expense, month)
      if (amount > 0) {
        breakdown[expense.frequency] += amount
        breakdown.total += amount
      }
    })

    return {
      ...breakdown,
      monthly: Math.round(breakdown.monthly),
      quarterly: Math.round(breakdown.quarterly),
      yearly: Math.round(breakdown.yearly),
      total: Math.round(breakdown.total)
    }
  })
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
    valid: errors.length === 0,
    errors
  }
}
