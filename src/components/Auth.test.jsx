/**
 * Tests for Auth component
 * Tests login/logout UI and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Auth from './Auth';

// Mock handlers
const mockHandleGoogleSignIn = vi.fn();
const mockSignOut = vi.fn();
const mockRetryAuth = vi.fn();

// Default props for Auth component
const defaultProps = {
  user: null,
  loadingState: { isLoading: false, stage: null },
  error: null,
  handleGoogleSignIn: mockHandleGoogleSignIn,
  signOut: mockSignOut,
  retryAuth: mockRetryAuth,
};

describe('Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should display loading message when loading', () => {
      render(
        <Auth
          {...defaultProps}
          loadingState={{
            isLoading: true,
            stage: 'verifying',
            message: 'Verificerer din session...',
            progress: 35,
          }}
        />
      );

      expect(screen.getByText(/Verificerer din session/)).toBeInTheDocument();
    });

    it('should not display login button when loading', () => {
      render(
        <Auth
          {...defaultProps}
          loadingState={{ isLoading: true, stage: 'authenticating' }}
        />
      );

      expect(screen.queryByText('Log ind med Google')).not.toBeInTheDocument();
    });
  });

  describe('Not Authenticated', () => {
    it('should display login button when not authenticated', () => {
      render(<Auth {...defaultProps} />);

      expect(screen.getByText('Log ind med Google')).toBeInTheDocument();
    });

    it('should display app title and description', () => {
      render(<Auth {...defaultProps} />);

      expect(screen.getByText('💰 Budget Tracker')).toBeInTheDocument();
      expect(
        screen.getByText(/Log ind med Google for at synkronisere/)
      ).toBeInTheDocument();
    });

    it('should display features list', () => {
      render(<Auth {...defaultProps} />);

      expect(screen.getByText(/Automatisk synkronisering/)).toBeInTheDocument();
      expect(screen.getByText(/Virker offline/)).toBeInTheDocument();
      expect(
        screen.getByText(/Dine data er kun synlige for dig/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Data gemt i din egen Google Drive/)
      ).toBeInTheDocument();
    });

    it('should have login button that triggers OAuth redirect', async () => {
      // The login button triggers an OAuth redirect flow via window.location.href
      // We can't easily test the redirect, but we can verify the button exists and is clickable
      render(<Auth {...defaultProps} />);

      const loginButton = screen.getByText('Log ind med Google');
      expect(loginButton).toBeInTheDocument();
      expect(loginButton).toHaveClass('google-login-button');
    });

    it('should display Google logo in login button', () => {
      render(<Auth {...defaultProps} />);

      const loginButton = screen.getByText('Log ind med Google');
      const svg = loginButton.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('google-icon');
    });
  });

  describe('Authenticated', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
    };

    // Note: When user is authenticated and not loading, Auth component returns null
    // (the authenticated UI is handled by the parent App component)
    it('should return null when authenticated and not loading', () => {
      const { container } = render(<Auth {...defaultProps} user={mockUser} />);

      // Component returns null, so container should be empty
      expect(container.firstChild).toBeNull();
    });

    it('should not display login UI when authenticated', () => {
      render(<Auth {...defaultProps} user={mockUser} />);

      expect(screen.queryByText('Log ind med Google')).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Automatisk synkronisering/)
      ).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when error exists', () => {
      render(<Auth {...defaultProps} error="Authentication failed" />);

      expect(screen.getByText('❌ Authentication failed')).toBeInTheDocument();
    });

    it('should display error with login button', () => {
      render(<Auth {...defaultProps} error="Network error" />);

      expect(screen.getByText('❌ Network error')).toBeInTheDocument();
      expect(screen.getByText('Log ind med Google')).toBeInTheDocument();
    });

    it('should not display error when no error', () => {
      render(<Auth {...defaultProps} />);

      expect(screen.queryByText(/❌/)).not.toBeInTheDocument();
    });
  });

  describe('UI Structure', () => {
    it('should have correct class names for styling', () => {
      render(<Auth {...defaultProps} />);

      expect(document.querySelector('.auth-container')).toBeInTheDocument();
      expect(document.querySelector('.auth-card')).toBeInTheDocument();
      expect(document.querySelector('.auth-header')).toBeInTheDocument();
    });

    it('should have Google button with correct classes', () => {
      render(<Auth {...defaultProps} />);

      const loginButton = screen.getByText('Log ind med Google');
      expect(loginButton).toHaveClass('google-login-button');
    });

    it('should have loading card with correct classes when loading', () => {
      render(
        <Auth
          {...defaultProps}
          loadingState={{
            isLoading: true,
            stage: 'authenticating',
            progress: 50,
          }}
        />
      );

      expect(document.querySelector('.auth-container')).toBeInTheDocument();
      expect(document.querySelector('.auth-loading-card')).toBeInTheDocument();
    });
  });
});
