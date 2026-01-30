/**
 * Tests for BottomTabBar component
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BottomTabBar from './BottomTabBar';

describe('BottomTabBar', () => {
  const mockOnTabChange = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders all four tabs', () => {
    render(<BottomTabBar activeTab={0} onTabChange={mockOnTabChange} />);

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
  });

  it('renders correct tab labels', () => {
    render(<BottomTabBar activeTab={0} onTabChange={mockOnTabChange} />);

    expect(screen.getByLabelText('Oversigt')).toBeInTheDocument();
    expect(screen.getByLabelText('Udgifter')).toBeInTheDocument();
    expect(screen.getByLabelText('Månedlig oversigt')).toBeInTheDocument();
    expect(screen.getByLabelText('Sammenligning')).toBeInTheDocument();
  });

  it('renders correct tab icons', () => {
    render(<BottomTabBar activeTab={0} onTabChange={mockOnTabChange} />);

    expect(screen.getByText('📊')).toBeInTheDocument();
    expect(screen.getByText('📝')).toBeInTheDocument();
    expect(screen.getByText('📅')).toBeInTheDocument();
    expect(screen.getByText('📈')).toBeInTheDocument();
  });

  it('marks the active tab correctly', () => {
    render(<BottomTabBar activeTab={1} onTabChange={mockOnTabChange} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).not.toHaveClass('active');
    expect(tabs[1]).toHaveClass('active');
    expect(tabs[2]).not.toHaveClass('active');
    expect(tabs[3]).not.toHaveClass('active');
  });

  it('sets aria-selected on active tab', () => {
    render(<BottomTabBar activeTab={2} onTabChange={mockOnTabChange} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[3]).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onTabChange when tab is clicked', async () => {
    const user = userEvent.setup();
    render(<BottomTabBar activeTab={0} onTabChange={mockOnTabChange} />);

    const secondTab = screen.getByLabelText('Udgifter');
    await user.click(secondTab);

    expect(mockOnTabChange).toHaveBeenCalledTimes(1);
    expect(mockOnTabChange).toHaveBeenCalledWith(1);
  });

  it('calls onTabChange with correct index for each tab', async () => {
    const user = userEvent.setup();
    render(<BottomTabBar activeTab={0} onTabChange={mockOnTabChange} />);

    await user.click(screen.getByLabelText('Oversigt'));
    expect(mockOnTabChange).toHaveBeenCalledWith(0);

    await user.click(screen.getByLabelText('Udgifter'));
    expect(mockOnTabChange).toHaveBeenCalledWith(1);

    await user.click(screen.getByLabelText('Månedlig oversigt'));
    expect(mockOnTabChange).toHaveBeenCalledWith(2);

    await user.click(screen.getByLabelText('Sammenligning'));
    expect(mockOnTabChange).toHaveBeenCalledWith(3);
  });

  it('allows clicking on already active tab', async () => {
    const user = userEvent.setup();
    render(<BottomTabBar activeTab={0} onTabChange={mockOnTabChange} />);

    const firstTab = screen.getByLabelText('Oversigt');
    await user.click(firstTab);

    expect(mockOnTabChange).toHaveBeenCalledWith(0);
  });

  it('updates active state when activeTab prop changes', () => {
    const { rerender } = render(
      <BottomTabBar activeTab={0} onTabChange={mockOnTabChange} />
    );

    let tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveClass('active');
    expect(tabs[3]).not.toHaveClass('active');

    rerender(<BottomTabBar activeTab={3} onTabChange={mockOnTabChange} />);

    tabs = screen.getAllByRole('tab');
    expect(tabs[0]).not.toHaveClass('active');
    expect(tabs[3]).toHaveClass('active');
  });

  it('renders as a nav element with tablist role', () => {
    render(<BottomTabBar activeTab={0} onTabChange={mockOnTabChange} />);

    const nav = screen.getByRole('tablist');
    expect(nav.tagName).toBe('NAV');
    expect(nav).toHaveClass('bottom-tab-bar');
  });
});
