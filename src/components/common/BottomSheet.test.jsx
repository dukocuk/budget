/**
 * Tests for BottomSheet component
 *
 * Tests open/close rendering, Escape key closes, backdrop click closes,
 * body scroll lock, focus management.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BottomSheet from './BottomSheet';

// Mock useViewportSize
vi.mock('../../hooks/useViewportSize', () => ({
  useViewportSize: vi.fn(() => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    width: 1024,
    height: 768,
    isTouchDevice: false,
  })),
}));

import { useViewportSize } from '../../hooks/useViewportSize';

describe('BottomSheet', () => {
  let defaultProps;

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps = {
      isOpen: true,
      onClose: vi.fn(),
      title: 'Test Sheet',
      children: <div>Sheet content</div>,
    };
  });

  afterEach(() => {
    // Reset body overflow
    document.body.style.overflow = '';
  });

  it('returns null when not open', () => {
    const { container } = render(
      <BottomSheet {...defaultProps} isOpen={false} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders content when open', () => {
    render(<BottomSheet {...defaultProps} />);
    expect(screen.getByText('Sheet content')).toBeInTheDocument();
  });

  it('renders title', () => {
    render(<BottomSheet {...defaultProps} />);
    expect(screen.getByText('Test Sheet')).toBeInTheDocument();
  });

  it('renders close button by default', () => {
    render(<BottomSheet {...defaultProps} />);
    expect(screen.getByLabelText('Luk')).toBeInTheDocument();
  });

  it('hides close button when showCloseButton is false', () => {
    render(<BottomSheet {...defaultProps} showCloseButton={false} />);
    expect(screen.queryByLabelText('Luk')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<BottomSheet {...defaultProps} />);

    await user.click(screen.getByLabelText('Luk'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    render(<BottomSheet {...defaultProps} />);

    const backdrop = document.querySelector('.bottom-sheet-backdrop');
    await user.click(backdrop);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('does not call onClose when sheet content is clicked', async () => {
    const user = userEvent.setup();
    render(<BottomSheet {...defaultProps} />);

    const sheet = document.querySelector('.bottom-sheet');
    await user.click(sheet);
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('calls onClose on Escape key', () => {
    render(<BottomSheet {...defaultProps} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('locks body scroll when open', () => {
    render(<BottomSheet {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body scroll when closed', () => {
    const { unmount } = render(<BottomSheet {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('has dialog role and aria-modal', () => {
    render(<BottomSheet {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('has aria-labelledby referencing the title', () => {
    render(<BottomSheet {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'bottom-sheet-title');
    expect(screen.getByText('Test Sheet')).toHaveAttribute(
      'id',
      'bottom-sheet-title'
    );
  });

  it('renders desktop variant by default', () => {
    render(<BottomSheet {...defaultProps} />);

    const backdrop = document.querySelector('.bottom-sheet-backdrop');
    expect(backdrop.className).toContain('desktop');
  });

  it('renders mobile variant when isMobile is true', () => {
    useViewportSize.mockReturnValue({
      isMobile: true,
      isDesktop: false,
      isTablet: false,
      width: 375,
      height: 667,
      isTouchDevice: true,
    });

    render(<BottomSheet {...defaultProps} />);

    const backdrop = document.querySelector('.bottom-sheet-backdrop');
    expect(backdrop.className).toContain('mobile');
  });

  it('shows drag handle on mobile', () => {
    useViewportSize.mockReturnValue({
      isMobile: true,
      isDesktop: false,
      isTablet: false,
      width: 375,
      height: 667,
      isTouchDevice: true,
    });

    render(<BottomSheet {...defaultProps} />);
    expect(document.querySelector('.drag-handle')).toBeInTheDocument();
  });

  it('does not show drag handle on desktop', () => {
    // Ensure desktop mode
    useViewportSize.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      width: 1024,
      height: 768,
      isTouchDevice: false,
    });

    render(<BottomSheet {...defaultProps} />);
    expect(
      document.querySelector('.drag-handle-container')
    ).not.toBeInTheDocument();
  });

  it('applies size class', () => {
    render(<BottomSheet {...defaultProps} size="lg" />);
    const sheet = document.querySelector('.bottom-sheet');
    expect(sheet.className).toContain('size-lg');
  });
});
