/**
 * Tests for TabView component
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TabView } from './TabView'

describe('TabView', () => {
  const mockTabs = [
    {
      icon: '📊',
      label: 'Overview',
      content: <div>Overview Content</div>
    },
    {
      icon: '📝',
      label: 'Expenses',
      content: <div>Expenses Content</div>
    },
    {
      icon: '⚙️',
      label: 'Settings',
      content: <div>Settings Content</div>
    }
  ]

  describe('Basic Rendering', () => {
    it('should render all tab buttons', () => {
      render(<TabView tabs={mockTabs} activeTab={0} onTabChange={vi.fn()} />)

      expect(screen.getByLabelText('Overview')).toBeInTheDocument()
      expect(screen.getByLabelText('Expenses')).toBeInTheDocument()
      expect(screen.getByLabelText('Settings')).toBeInTheDocument()
    })

    it('should show tab icons', () => {
      render(<TabView tabs={mockTabs} activeTab={0} onTabChange={vi.fn()} />)

      expect(screen.getByText('📊')).toBeInTheDocument()
      expect(screen.getByText('📝')).toBeInTheDocument()
      expect(screen.getByText('⚙️')).toBeInTheDocument()
    })

    it('should show tab labels', () => {
      render(<TabView tabs={mockTabs} activeTab={0} onTabChange={vi.fn()} />)

      expect(screen.getByText('Overview')).toBeInTheDocument()
      expect(screen.getByText('Expenses')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('should display content for active tab', () => {
      render(<TabView tabs={mockTabs} activeTab={0} onTabChange={vi.fn()} />)

      expect(screen.getByText('Overview Content')).toBeInTheDocument()
      expect(screen.queryByText('Expenses Content')).not.toBeInTheDocument()
      expect(screen.queryByText('Settings Content')).not.toBeInTheDocument()
    })
  })

  describe('Active Tab State', () => {
    it('should mark first tab as active by default', () => {
      render(<TabView tabs={mockTabs} activeTab={0} onTabChange={vi.fn()} />)

      const overviewTab = screen.getByLabelText('Overview')
      expect(overviewTab).toHaveClass('active')
      expect(overviewTab).toHaveAttribute('aria-selected', 'true')
    })

    it('should mark specified tab as active', () => {
      render(<TabView tabs={mockTabs} activeTab={1} onTabChange={vi.fn()} />)

      const expensesTab = screen.getByLabelText('Expenses')
      expect(expensesTab).toHaveClass('active')
      expect(expensesTab).toHaveAttribute('aria-selected', 'true')
    })

    it('should not mark inactive tabs as active', () => {
      render(<TabView tabs={mockTabs} activeTab={0} onTabChange={vi.fn()} />)

      const expensesTab = screen.getByLabelText('Expenses')
      expect(expensesTab).not.toHaveClass('active')
      expect(expensesTab).toHaveAttribute('aria-selected', 'false')
    })

    it('should display correct content for active tab', () => {
      const { rerender } = render(<TabView tabs={mockTabs} activeTab={0} onTabChange={vi.fn()} />)
      expect(screen.getByText('Overview Content')).toBeInTheDocument()

      rerender(<TabView tabs={mockTabs} activeTab={1} onTabChange={vi.fn()} />)
      expect(screen.getByText('Expenses Content')).toBeInTheDocument()
      expect(screen.queryByText('Overview Content')).not.toBeInTheDocument()
    })
  })

  describe('Tab Interaction', () => {
    it('should call onTabChange when tab is clicked', () => {
      const handleTabChange = vi.fn()
      render(<TabView tabs={mockTabs} activeTab={0} onTabChange={handleTabChange} />)

      const expensesTab = screen.getByLabelText('Expenses')
      fireEvent.click(expensesTab)

      expect(handleTabChange).toHaveBeenCalledWith(1)
    })

    it('should call onTabChange with correct index for each tab', () => {
      const handleTabChange = vi.fn()
      render(<TabView tabs={mockTabs} activeTab={0} onTabChange={handleTabChange} />)

      fireEvent.click(screen.getByLabelText('Overview'))
      expect(handleTabChange).toHaveBeenCalledWith(0)

      fireEvent.click(screen.getByLabelText('Expenses'))
      expect(handleTabChange).toHaveBeenCalledWith(1)

      fireEvent.click(screen.getByLabelText('Settings'))
      expect(handleTabChange).toHaveBeenCalledWith(2)
    })

    it('should allow clicking active tab again', () => {
      const handleTabChange = vi.fn()
      render(<TabView tabs={mockTabs} activeTab={0} onTabChange={handleTabChange} />)

      fireEvent.click(screen.getByLabelText('Overview'))
      expect(handleTabChange).toHaveBeenCalledWith(0)
    })
  })

  describe('Dropdown Tabs', () => {
    const dropdownTabs = [
      {
        icon: '📊',
        label: 'Charts',
        dropdownItems: [
          { icon: '📈', label: 'Line Chart', content: <div>Line Chart</div> },
          { icon: '🥧', label: 'Pie Chart', content: <div>Pie Chart</div> }
        ]
      },
      {
        icon: '📝',
        label: 'Data',
        content: <div>Data Content</div>
      }
    ]

    it('should show dropdown arrow for tabs with dropdown items', () => {
      render(<TabView tabs={dropdownTabs} activeTab={0} onTabChange={vi.fn()} />)

      const chartsTab = screen.getByLabelText('Charts')
      expect(chartsTab.textContent).toContain('▼')
    })

    it('should not show dropdown arrow for regular tabs', () => {
      render(<TabView tabs={dropdownTabs} activeTab={1} onTabChange={vi.fn()} />)

      const dataTab = screen.getByLabelText('Data')
      expect(dataTab.textContent).not.toContain('▼')
    })

    it('should show dropdown on mouse enter', () => {
      render(<TabView tabs={dropdownTabs} activeTab={0} onTabChange={vi.fn()} />)

      const chartsTab = screen.getByLabelText('Charts')
      fireEvent.mouseEnter(chartsTab.closest('.tab-wrapper'))

      expect(screen.getByText('Line Chart', { selector: '.dropdown-label' })).toBeInTheDocument()
      expect(screen.getByText('Pie Chart', { selector: '.dropdown-label' })).toBeInTheDocument()
    })

    it('should hide dropdown on mouse leave', () => {
      render(<TabView tabs={dropdownTabs} activeTab={0} onTabChange={vi.fn()} />)

      const wrapper = screen.getByLabelText('Charts').closest('.tab-wrapper')
      fireEvent.mouseEnter(wrapper)
      expect(screen.getByText('Line Chart', { selector: '.dropdown-label' })).toBeInTheDocument()

      fireEvent.mouseLeave(wrapper)
      expect(screen.queryByText('Line Chart', { selector: '.dropdown-label' })).not.toBeInTheDocument()
    })

    it('should show first dropdown item content by default', () => {
      render(<TabView tabs={dropdownTabs} activeTab={0} onTabChange={vi.fn()} />)

      expect(screen.getByText('Line Chart', { selector: 'div' })).toBeInTheDocument()
    })

    it('should change dropdown item when clicked', () => {
      render(<TabView tabs={dropdownTabs} activeTab={0} onTabChange={vi.fn()} />)

      const wrapper = screen.getByLabelText('Charts').closest('.tab-wrapper')
      fireEvent.mouseEnter(wrapper)

      const pieChartItem = screen.getByText('Pie Chart', { selector: '.dropdown-label' })
      fireEvent.click(pieChartItem.closest('button'))

      expect(screen.getByText('Pie Chart', { selector: 'div' })).toBeInTheDocument()
      expect(screen.queryByText('Line Chart', { selector: 'div' })).not.toBeInTheDocument()
    })

    it('should mark selected dropdown item', () => {
      render(<TabView tabs={dropdownTabs} activeTab={0} onTabChange={vi.fn()} />)

      const wrapper = screen.getByLabelText('Charts').closest('.tab-wrapper')
      fireEvent.mouseEnter(wrapper)

      // First item should have base class but not selected (until clicked or tab is activated)
      const lineChartItem = screen.getByText('Line Chart', { selector: '.dropdown-label' }).closest('button')
      expect(lineChartItem).toHaveClass('dropdown-item')

      // After clicking, it should be selected
      fireEvent.click(lineChartItem)
      fireEvent.mouseEnter(wrapper) // Re-open dropdown

      const lineChartItemAfter = screen.getByText('Line Chart', { selector: '.dropdown-label' }).closest('button')
      expect(lineChartItemAfter).toHaveClass('selected')

      // Click Pie Chart
      fireEvent.click(screen.getByText('Pie Chart', { selector: '.dropdown-label' }).closest('button'))
      fireEvent.mouseEnter(wrapper) // Re-open dropdown

      const pieChartItem = screen.getByText('Pie Chart', { selector: '.dropdown-label' }).closest('button')
      expect(pieChartItem).toHaveClass('selected')
    })

    it('should close dropdown when item is clicked', () => {
      render(<TabView tabs={dropdownTabs} activeTab={0} onTabChange={vi.fn()} />)

      const wrapper = screen.getByLabelText('Charts').closest('.tab-wrapper')
      fireEvent.mouseEnter(wrapper)

      const pieChartItem = screen.getByText('Pie Chart', { selector: '.dropdown-label' })
      fireEvent.click(pieChartItem.closest('button'))

      expect(screen.queryByText('Pie Chart', { selector: '.dropdown-label' })).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA roles', () => {
      render(<TabView tabs={mockTabs} activeTab={0} onTabChange={vi.fn()} />)

      const tabs = screen.getAllByRole('tab')
      expect(tabs).toHaveLength(3)
    })

    it('should have aria-selected attribute', () => {
      render(<TabView tabs={mockTabs} activeTab={0} onTabChange={vi.fn()} />)

      expect(screen.getByLabelText('Overview')).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByLabelText('Expenses')).toHaveAttribute('aria-selected', 'false')
      expect(screen.getByLabelText('Settings')).toHaveAttribute('aria-selected', 'false')
    })

    it('should have aria-label for each tab', () => {
      render(<TabView tabs={mockTabs} activeTab={0} onTabChange={vi.fn()} />)

      expect(screen.getByLabelText('Overview')).toBeInTheDocument()
      expect(screen.getByLabelText('Expenses')).toBeInTheDocument()
      expect(screen.getByLabelText('Settings')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty tabs array', () => {
      render(<TabView tabs={[]} activeTab={0} onTabChange={vi.fn()} />)

      const tabButtons = screen.queryAllByRole('tab')
      expect(tabButtons).toHaveLength(0)
    })

    it('should handle single tab', () => {
      const singleTab = [mockTabs[0]]
      render(<TabView tabs={singleTab} activeTab={0} onTabChange={vi.fn()} />)

      expect(screen.getByLabelText('Overview')).toBeInTheDocument()
      expect(screen.getByText('Overview Content')).toBeInTheDocument()
    })

    it('should handle invalid activeTab index gracefully', () => {
      render(<TabView tabs={mockTabs} activeTab={99} onTabChange={vi.fn()} />)

      // Should not crash, but won't show valid content
      const tabs = screen.getAllByRole('tab')
      expect(tabs).toHaveLength(3)
    })

    it('should handle missing onTabChange callback', () => {
      expect(() => {
        render(<TabView tabs={mockTabs} activeTab={0} />)
      }).not.toThrow()
    })
  })
})
