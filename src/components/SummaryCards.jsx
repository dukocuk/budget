/**
 * Summary cards component
 */

import { memo } from 'react'
import './SummaryCards.css'

export const SummaryCards = memo(({ summary }) => {
  const { totalAnnual, avgMonthly, monthlyBalance, annualReserve } = summary

  return (
    <section className="summary-grid">
      <div className="summary-card">
        <h3>Årlige udgifter</h3>
        <div className="value">
          {totalAnnual.toLocaleString('da-DK')} kr.
        </div>
      </div>
      <div className="summary-card">
        <h3>Gennemsnitlig månedlig udgift</h3>
        <div className="value">
          {avgMonthly.toLocaleString('da-DK')} kr.
        </div>
      </div>
      <div className="summary-card">
        <h3>Månedlig balance</h3>
        <div className={`value ${monthlyBalance >= 0 ? 'positive' : 'negative'}`}>
          {monthlyBalance >= 0 ? '+' : ''}
          {monthlyBalance.toLocaleString('da-DK')} kr.
        </div>
      </div>
      <div className="summary-card">
        <h3>Årlig reserve</h3>
        <div className={`value ${annualReserve >= 0 ? 'positive' : 'negative'}`}>
          {annualReserve.toLocaleString('da-DK')} kr.
        </div>
      </div>
    </section>
  )
})
