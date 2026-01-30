/**
 * Tests for YearSelector component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import YearSelector from './YearSelector';

describe('YearSelector', () => {
  const mockPeriods = [
    { id: 1, year: 2024, status: 'active' },
    { id: 2, year: 2023, status: 'archived' },
    { id: 3, year: 2022, status: 'archived' },
  ];

  const mockActivePeriod = mockPeriods[0];
  const mockOnSelectPeriod = vi.fn();
  const mockOnCreateYear = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with active year displayed', () => {
    render(
      <YearSelector
        periods={mockPeriods}
        activePeriod={mockActivePeriod}
        onSelectPeriod={mockOnSelectPeriod}
        onCreateYear={mockOnCreateYear}
      />
    );

    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it('opens dropdown when button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <YearSelector
        periods={mockPeriods}
        activePeriod={mockActivePeriod}
        onSelectPeriod={mockOnSelectPeriod}
        onCreateYear={mockOnCreateYear}
      />
    );

    const button = screen.getByRole('button', { expanded: false });
    await user.click(button);

    expect(screen.getByRole('button', { expanded: true })).toBeInTheDocument();
  });

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <YearSelector
          periods={mockPeriods}
          activePeriod={mockActivePeriod}
          onSelectPeriod={mockOnSelectPeriod}
          onCreateYear={mockOnCreateYear}
        />
        <div data-testid="outside">Outside</div>
      </div>
    );

    const button = screen.getByRole('button');
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByTestId('outside'));
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes dropdown when Escape key is pressed', async () => {
    const user = userEvent.setup();
    render(
      <YearSelector
        periods={mockPeriods}
        activePeriod={mockActivePeriod}
        onSelectPeriod={mockOnSelectPeriod}
        onCreateYear={mockOnCreateYear}
      />
    );

    const button = screen.getByRole('button');
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('calls onSelectPeriod when a period is selected', async () => {
    const user = userEvent.setup();
    render(
      <YearSelector
        periods={mockPeriods}
        activePeriod={mockActivePeriod}
        onSelectPeriod={mockOnSelectPeriod}
        onCreateYear={mockOnCreateYear}
      />
    );

    await user.click(screen.getByRole('button'));
    const periodButton = screen.getByText(/2023/);
    await user.click(periodButton);

    expect(mockOnSelectPeriod).toHaveBeenCalledWith(mockPeriods[1]);
  });

  it('closes dropdown after selecting a period', async () => {
    const user = userEvent.setup();
    render(
      <YearSelector
        periods={mockPeriods}
        activePeriod={mockActivePeriod}
        onSelectPeriod={mockOnSelectPeriod}
        onCreateYear={mockOnCreateYear}
      />
    );

    const button = screen.getByRole('button');
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');

    const periodButton = screen.getByText(/2023/);
    await user.click(periodButton);

    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('calls onCreateYear when create year button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <YearSelector
        periods={mockPeriods}
        activePeriod={mockActivePeriod}
        onSelectPeriod={mockOnSelectPeriod}
        onCreateYear={mockOnCreateYear}
      />
    );

    await user.click(screen.getByRole('button'));
    const createButton = screen.getByText(/Opret nyt år/i);
    await user.click(createButton);

    expect(mockOnCreateYear).toHaveBeenCalledTimes(1);
  });

  it('closes dropdown after clicking create year', async () => {
    const user = userEvent.setup();
    render(
      <YearSelector
        periods={mockPeriods}
        activePeriod={mockActivePeriod}
        onSelectPeriod={mockOnSelectPeriod}
        onCreateYear={mockOnCreateYear}
      />
    );

    const button = screen.getByRole('button');
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');

    const createButton = screen.getByText(/Opret nyt år/i);
    await user.click(createButton);

    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <YearSelector
        periods={mockPeriods}
        activePeriod={mockActivePeriod}
        onSelectPeriod={mockOnSelectPeriod}
        onCreateYear={mockOnCreateYear}
        disabled={true}
      />
    );

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not open dropdown when disabled', async () => {
    const user = userEvent.setup();
    render(
      <YearSelector
        periods={mockPeriods}
        activePeriod={mockActivePeriod}
        onSelectPeriod={mockOnSelectPeriod}
        onCreateYear={mockOnCreateYear}
        disabled={true}
      />
    );

    const button = screen.getByRole('button');
    await user.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('handles empty periods array', () => {
    render(
      <YearSelector
        periods={[]}
        activePeriod={null}
        onSelectPeriod={mockOnSelectPeriod}
        onCreateYear={mockOnCreateYear}
      />
    );

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('groups active and archived periods separately', async () => {
    const user = userEvent.setup();
    const mixedPeriods = [
      { id: 1, year: 2024, status: 'active' },
      { id: 2, year: 2025, status: 'active' },
      { id: 3, year: 2023, status: 'archived' },
      { id: 4, year: 2022, status: 'archived' },
    ];

    render(
      <YearSelector
        periods={mixedPeriods}
        activePeriod={mixedPeriods[0]}
        onSelectPeriod={mockOnSelectPeriod}
        onCreateYear={mockOnCreateYear}
      />
    );

    await user.click(screen.getByRole('button'));

    // Active periods should be displayed (using getAllByText since years appear multiple times)
    expect(screen.getAllByText(/2024/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/2025/)[0]).toBeInTheDocument();

    // Archived periods should be displayed
    expect(screen.getAllByText(/2023/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/2022/)[0]).toBeInTheDocument();
  });

  it('toggles dropdown open/closed on repeated clicks', async () => {
    const user = userEvent.setup();
    render(
      <YearSelector
        periods={mockPeriods}
        activePeriod={mockActivePeriod}
        onSelectPeriod={mockOnSelectPeriod}
        onCreateYear={mockOnCreateYear}
      />
    );

    const button = screen.getByRole('button');

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });
});
