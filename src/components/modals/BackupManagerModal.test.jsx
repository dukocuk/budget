/**
 * Tests for BackupManagerModal component
 *
 * Tests backup list loading, preview on restore click, confirmation dialog,
 * restore calls API, error/retry states, empty state, and loading indicators.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BackupManagerModal } from './BackupManagerModal';

describe('BackupManagerModal', () => {
  const mockBackups = [
    {
      fileId: 'backup-1',
      date: '2025-06-15T10:30:00Z',
      filename: 'budget-backup-2025-06-15.json',
      sizeKB: 42,
    },
    {
      fileId: 'backup-2',
      date: '2025-06-01T08:00:00Z',
      filename: 'budget-backup-2025-06-01.json',
      sizeKB: 38,
    },
  ];

  const mockPreview = {
    years: [2024, 2025],
    expenseCount: 15,
    periodCount: 2,
  };

  let defaultProps;

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps = {
      isOpen: true,
      onClose: vi.fn(),
      listBackups: vi.fn().mockResolvedValue(mockBackups),
      getPreview: vi.fn().mockResolvedValue(mockPreview),
      restoreBackup: vi.fn().mockResolvedValue({ success: true }),
    };
    // Mock window.location.reload
    delete window.location;
    window.location = { reload: vi.fn() };
  });

  it('returns null when not open', () => {
    const { container } = render(
      <BackupManagerModal {...defaultProps} isOpen={false} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows loading indicator while fetching backups', () => {
    defaultProps.listBackups = vi.fn(() => new Promise(() => {}));

    render(<BackupManagerModal {...defaultProps} />);
    expect(screen.getByText(/henter backups/i)).toBeInTheDocument();
  });

  it('renders backup list after loading', async () => {
    render(<BackupManagerModal {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText('budget-backup-2025-06-15.json')
      ).toBeInTheDocument();
      expect(
        screen.getByText('budget-backup-2025-06-01.json')
      ).toBeInTheDocument();
    });
  });

  it('displays backup sizes', async () => {
    render(<BackupManagerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('42 KB')).toBeInTheDocument();
      expect(screen.getByText('38 KB')).toBeInTheDocument();
    });
  });

  it('shows empty state when no backups exist', async () => {
    defaultProps.listBackups = vi.fn().mockResolvedValue([]);

    render(<BackupManagerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/ingen backups fundet/i)).toBeInTheDocument();
    });
  });

  it('shows error message when loading fails', async () => {
    defaultProps.listBackups = vi
      .fn()
      .mockRejectedValue(new Error('Network error'));

    render(<BackupManagerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/kunne ikke hente backups/i)).toBeInTheDocument();
    });
  });

  it('shows retry button on error', async () => {
    defaultProps.listBackups = vi
      .fn()
      .mockRejectedValue(new Error('Network error'));

    render(<BackupManagerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/prøv igen/i)).toBeInTheDocument();
    });
  });

  it('retries loading when retry button is clicked', async () => {
    const user = userEvent.setup();
    defaultProps.listBackups = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockBackups);

    render(<BackupManagerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/prøv igen/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/prøv igen/i));

    await waitFor(() => {
      expect(defaultProps.listBackups).toHaveBeenCalledTimes(2);
    });
  });

  it('shows preview and confirmation when restore is clicked', async () => {
    const user = userEvent.setup();

    render(<BackupManagerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getAllByText('Gendan')).toHaveLength(2);
    });

    await user.click(screen.getAllByText('Gendan')[0]);

    await waitFor(() => {
      expect(defaultProps.getPreview).toHaveBeenCalledWith('backup-1');
      expect(screen.getByText(/bekræft gendannelse/i)).toBeInTheDocument();
      expect(screen.getByText('15 stk')).toBeInTheDocument(); // expense count
      expect(screen.getByText('2 stk')).toBeInTheDocument(); // period count
    });
  });

  it('restores backup on confirmation', async () => {
    const user = userEvent.setup();

    render(<BackupManagerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getAllByText('Gendan')).toHaveLength(2);
    });

    // Click restore on first backup
    await user.click(screen.getAllByText('Gendan')[0]);

    await waitFor(() => {
      expect(screen.getByText(/bekræft gendannelse/i)).toBeInTheDocument();
    });

    // Confirm restore
    await user.click(screen.getByText('Gendan backup'));

    await waitFor(() => {
      expect(defaultProps.restoreBackup).toHaveBeenCalledWith('backup-1');
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('cancels restore confirmation', async () => {
    const user = userEvent.setup();

    render(<BackupManagerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getAllByText('Gendan')).toHaveLength(2);
    });

    await user.click(screen.getAllByText('Gendan')[0]);

    await waitFor(() => {
      expect(screen.getByText(/bekræft gendannelse/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText('Annuller'));

    await waitFor(() => {
      expect(
        screen.queryByText(/bekræft gendannelse/i)
      ).not.toBeInTheDocument();
    });
    expect(defaultProps.restoreBackup).not.toHaveBeenCalled();
  });

  it('shows error when restore fails', async () => {
    const user = userEvent.setup();
    defaultProps.restoreBackup = vi
      .fn()
      .mockResolvedValue({ success: false, error: 'Restore failed' });

    render(<BackupManagerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getAllByText('Gendan')).toHaveLength(2);
    });

    await user.click(screen.getAllByText('Gendan')[0]);

    await waitFor(() => {
      expect(screen.getByText(/bekræft gendannelse/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText('Gendan backup'));

    await waitFor(() => {
      expect(screen.getByText(/gendannelse fejlede/i)).toBeInTheDocument();
    });
  });

  it('shows error when preview fetch fails', async () => {
    const user = userEvent.setup();
    defaultProps.getPreview = vi
      .fn()
      .mockRejectedValue(new Error('Preview failed'));

    render(<BackupManagerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getAllByText('Gendan')).toHaveLength(2);
    });

    await user.click(screen.getAllByText('Gendan')[0]);

    await waitFor(() => {
      expect(
        screen.getByText(/kunne ikke hente backup preview/i)
      ).toBeInTheDocument();
    });
  });

  it('closes modal when close button is clicked', async () => {
    const user = userEvent.setup();

    render(<BackupManagerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Luk')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('Luk'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('closes modal when backdrop is clicked', async () => {
    const user = userEvent.setup();

    render(<BackupManagerModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/administrer backups/i)).toBeInTheDocument();
    });

    // Click backdrop
    const backdrop = document.querySelector('.modal-backdrop');
    await user.click(backdrop);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
