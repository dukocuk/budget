/**
 * Tests for TemplateManager component
 *
 * Tests template list loading, create form validation, save + reload,
 * delete with confirmation, expense preview, empty state, and loading state.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TemplateManager from './TemplateManager';

// Mock dependencies
vi.mock('../../hooks/useBudgetPeriodContext', () => ({
  useBudgetPeriodContext: vi.fn(),
}));

vi.mock('../../lib/pglite', () => ({
  localDB: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
  },
}));

import { useBudgetPeriodContext } from '../../hooks/useBudgetPeriodContext';
import { localDB } from '../../lib/pglite';

describe('TemplateManager', () => {
  const mockTemplates = [
    {
      id: 'template-1',
      templateName: 'Standard Budget',
      templateDescription: 'Monthly bills',
      monthlyPayment: 5000,
      createdAt: '2025-01-01T00:00:00Z',
    },
    {
      id: 'template-2',
      templateName: 'Minimal Budget',
      templateDescription: null,
      monthlyPayment: 3000,
      createdAt: '2025-06-15T00:00:00Z',
    },
  ];

  let mockContextValues;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContextValues = {
      activePeriod: { id: 'period-2025', year: 2025 },
      getTemplates: vi.fn().mockResolvedValue(mockTemplates),
      saveAsTemplate: vi.fn().mockResolvedValue(undefined),
      deleteTemplate: vi.fn().mockResolvedValue(undefined),
    };

    useBudgetPeriodContext.mockReturnValue(mockContextValues);
  });

  it('shows loading state initially', () => {
    // Make getTemplates never resolve to keep loading state
    mockContextValues.getTemplates = vi.fn(() => new Promise(() => {}));
    useBudgetPeriodContext.mockReturnValue(mockContextValues);

    render(<TemplateManager />);
    expect(screen.getByText('Indlæser skabeloner...')).toBeInTheDocument();
  });

  it('renders template list after loading', async () => {
    render(<TemplateManager />);

    await waitFor(() => {
      expect(screen.getByText('Standard Budget')).toBeInTheDocument();
      expect(screen.getByText('Minimal Budget')).toBeInTheDocument();
    });
  });

  it('shows empty state when no templates exist', async () => {
    mockContextValues.getTemplates = vi.fn().mockResolvedValue([]);
    useBudgetPeriodContext.mockReturnValue(mockContextValues);

    render(<TemplateManager />);

    await waitFor(() => {
      expect(
        screen.getByText(/du har ingen gemte skabeloner/i)
      ).toBeInTheDocument();
    });
  });

  it('shows create template button when activePeriod exists', async () => {
    render(<TemplateManager />);

    await waitFor(() => {
      expect(
        screen.getByText(/gem aktuelle budget som skabelon/i)
      ).toBeInTheDocument();
    });
  });

  it('opens create form when button is clicked', async () => {
    const user = userEvent.setup();
    render(<TemplateManager />);

    await waitFor(() => {
      expect(
        screen.getByText(/gem aktuelle budget som skabelon/i)
      ).toBeInTheDocument();
    });

    await user.click(screen.getByText(/gem aktuelle budget som skabelon/i));

    expect(screen.getByLabelText(/skabelonnavn/i)).toBeInTheDocument();
  });

  it('saves template and reloads list', async () => {
    const user = userEvent.setup();
    const onTemplateCreated = vi.fn();

    render(<TemplateManager onTemplateCreated={onTemplateCreated} />);

    // Wait for templates to load
    await waitFor(() => {
      expect(
        screen.getByText(/gem aktuelle budget som skabelon/i)
      ).toBeInTheDocument();
    });

    // Open create form
    await user.click(screen.getByText(/gem aktuelle budget som skabelon/i));

    // Fill in the form
    await user.type(screen.getByLabelText(/skabelonnavn/i), 'New Template');

    // Submit
    await user.click(screen.getByText(/gem skabelon/i));

    await waitFor(() => {
      expect(mockContextValues.saveAsTemplate).toHaveBeenCalledWith(
        'period-2025',
        'New Template',
        ''
      );
      expect(onTemplateCreated).toHaveBeenCalled();
      // Templates should be reloaded
      expect(mockContextValues.getTemplates).toHaveBeenCalledTimes(2);
    });
  });

  it('cancels create form and clears inputs', async () => {
    const user = userEvent.setup();

    render(<TemplateManager />);

    await waitFor(() => {
      expect(
        screen.getByText(/gem aktuelle budget som skabelon/i)
      ).toBeInTheDocument();
    });

    await user.click(screen.getByText(/gem aktuelle budget som skabelon/i));
    await user.type(screen.getByLabelText(/skabelonnavn/i), 'Draft');
    await user.click(screen.getByText('Annuller'));

    // Form should be closed, create button visible again
    await waitFor(() => {
      expect(
        screen.getByText(/gem aktuelle budget som skabelon/i)
      ).toBeInTheDocument();
    });
    expect(screen.queryByLabelText(/skabelonnavn/i)).not.toBeInTheDocument();
  });

  it('deletes template with confirmation', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<TemplateManager />);

    await waitFor(() => {
      expect(screen.getByText('Standard Budget')).toBeInTheDocument();
    });

    // Click delete button on first template
    const deleteButtons = screen.getAllByTitle('Slet skabelon');
    await user.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockContextValues.deleteTemplate).toHaveBeenCalledWith('template-1');

    window.confirm.mockRestore();
  });

  it('does not delete when confirmation is cancelled', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<TemplateManager />);

    await waitFor(() => {
      expect(screen.getByText('Standard Budget')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Slet skabelon');
    await user.click(deleteButtons[0]);

    expect(mockContextValues.deleteTemplate).not.toHaveBeenCalled();

    window.confirm.mockRestore();
  });

  it('shows expense preview when template is clicked', async () => {
    const user = userEvent.setup();
    localDB.query.mockResolvedValue({
      rows: [
        { name: 'Netflix', amount: 79, frequency: 'monthly' },
        { name: 'Spotify', amount: 99, frequency: 'monthly' },
      ],
    });

    render(<TemplateManager />);

    await waitFor(() => {
      expect(screen.getByText('Standard Budget')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Standard Budget'));

    await waitFor(() => {
      expect(screen.getByText('Netflix')).toBeInTheDocument();
      expect(screen.getByText('Spotify')).toBeInTheDocument();
      expect(screen.getByText('Total: 2 udgifter')).toBeInTheDocument();
    });
  });

  it('shows empty expense preview for template with no expenses', async () => {
    const user = userEvent.setup();
    localDB.query.mockResolvedValue({ rows: [] });

    render(<TemplateManager />);

    await waitFor(() => {
      expect(screen.getByText('Standard Budget')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Standard Budget'));

    await waitFor(() => {
      expect(
        screen.getByText('Ingen udgifter i denne skabelon')
      ).toBeInTheDocument();
    });
  });

  it('shows template description when available', async () => {
    render(<TemplateManager />);

    await waitFor(() => {
      expect(screen.getByText('Monthly bills')).toBeInTheDocument();
    });
  });
});
