/**
 * Tests for SummaryCards component
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SummaryCards } from './SummaryCards'

describe('SummaryCards', () => {
  const mockSummary = {
    totalAnnual: 45600,
    avgMonthly: 3800,
    monthlyBalance: 1900,
    annualReserve: 27631
  }

  it('renders all four summary cards', () => {
    render(<SummaryCards summary={mockSummary} />)

    expect(screen.getByText('Årlige udgifter')).toBeInTheDocument()
    expect(screen.getByText('Gennemsnitlig månedlig udgift')).toBeInTheDocument()
    expect(screen.getByText('Månedlig balance')).toBeInTheDocument()
    expect(screen.getByText('Årlig reserve')).toBeInTheDocument()
  })

  it('formats currency values with Danish locale', () => {
    render(<SummaryCards summary={mockSummary} />)

    // Danish format uses . as thousand separator
    expect(screen.getByText(/45\.600 kr\./)).toBeInTheDocument()
    expect(screen.getByText(/3\.800 kr\./)).toBeInTheDocument()
    expect(screen.getByText(/1\.900 kr\./)).toBeInTheDocument()
    expect(screen.getByText(/27\.631 kr\./)).toBeInTheDocument()
  })

  it('shows positive balance with + sign', () => {
    render(<SummaryCards summary={mockSummary} />)

    const monthlyBalanceElement = screen.getByText(/\+1\.900 kr\./)
    expect(monthlyBalanceElement).toBeInTheDocument()
    expect(monthlyBalanceElement).toHaveClass('positive')
  })

  it('shows negative balance without + sign', () => {
    const negativeSummary = {
      ...mockSummary,
      monthlyBalance: -500,
      annualReserve: -6000
    }

    render(<SummaryCards summary={negativeSummary} />)

    const monthlyBalanceElement = screen.getByText(/-500 kr\./)
    expect(monthlyBalanceElement).toBeInTheDocument()
    expect(monthlyBalanceElement).toHaveClass('negative')

    const annualReserveElement = screen.getByText(/-6\.000 kr\./)
    expect(annualReserveElement).toBeInTheDocument()
    expect(annualReserveElement).toHaveClass('negative')
  })

  it('handles zero values correctly', () => {
    const zeroSummary = {
      totalAnnual: 0,
      avgMonthly: 0,
      monthlyBalance: 0,
      annualReserve: 0
    }

    render(<SummaryCards summary={zeroSummary} />)

    // Zero should show + sign and positive class
    const monthlyBalanceElement = screen.getByText(/\+0 kr\./)
    expect(monthlyBalanceElement).toBeInTheDocument()
    expect(monthlyBalanceElement).toHaveClass('positive')
  })

  it('handles large numbers correctly', () => {
    const largeSummary = {
      totalAnnual: 1234567,
      avgMonthly: 102880,
      monthlyBalance: 50000,
      annualReserve: 600000
    }

    render(<SummaryCards summary={largeSummary} />)

    expect(screen.getByText(/1\.234\.567 kr\./)).toBeInTheDocument()
    expect(screen.getByText(/102\.880 kr\./)).toBeInTheDocument()
  })

  it('applies correct CSS classes', () => {
    const { container } = render(<SummaryCards summary={mockSummary} />)

    expect(container.querySelector('.summary-grid')).toBeInTheDocument()
    expect(container.querySelectorAll('.summary-card')).toHaveLength(4)
    expect(container.querySelectorAll('.value')).toHaveLength(4)
  })

  it('renders section with summary-grid class', () => {
    const { container } = render(<SummaryCards summary={mockSummary} />)

    const section = container.querySelector('section')
    expect(section).toBeInTheDocument()
    expect(section).toHaveClass('summary-grid')
  })
})
