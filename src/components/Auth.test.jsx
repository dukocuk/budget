/**
 * Tests for Auth component
 * Tests login/logout UI and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Auth from './Auth';

// Mock useAuth hook
const mockSignInWithGoogle = vi.fn();
const mockSignOut = vi.fn();

let mockAuthState = {
  user: null,
  loading: false,
  error: null,
  signInWithGoogle: mockSignInWithGoogle,
  signOut: mockSignOut,
};

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockAuthState,
}));

describe('Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default state
    mockAuthState = {
      user: null,
      loading: false,
      error: null,
      signInWithGoogle: mockSignInWithGoogle,
      signOut: mockSignOut,
    };
  });

  describe('Loading State', () => {
    it('should display loading spinner when loading', () => {
      mockAuthState.loading = true;

      render(<Auth />);

      expect(screen.getByText('Indlæser...')).toBeInTheDocument();
      expect(document.querySelector('.spinner')).toBeInTheDocument();
    });

    it('should not display login button when loading', () => {
      mockAuthState.loading = true;

      render(<Auth />);

      expect(screen.queryByText('Log ind med Google')).not.toBeInTheDocument();
    });
  });

  describe('Not Authenticated', () => {
    it('should display login button when not authenticated', () => {
      render(<Auth />);

      expect(screen.getByText('Log ind med Google')).toBeInTheDocument();
    });

    it('should display app title and description', () => {
      render(<Auth />);

      expect(screen.getByText('💰 Budget Tracker')).toBeInTheDocument();
      expect(
        screen.getByText(/Log ind for at synkronisere/)
      ).toBeInTheDocument();
    });

    it('should display features list', () => {
      render(<Auth />);

      expect(screen.getByText(/Automatisk synkronisering/)).toBeInTheDocument();
      expect(screen.getByText(/Virker offline/)).toBeInTheDocument();
      expect(
        screen.getByText(/Dine data er kun synlige for dig/)
      ).toBeInTheDocument();
      expect(screen.getByText(/Gratis for altid/)).toBeInTheDocument();
    });

    it('should call signInWithGoogle when login button clicked', async () => {
      const user = userEvent.setup();
      render(<Auth />);

      const loginButton = screen.getByText('Log ind med Google');
      await user.click(loginButton);

      expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
    });

    it('should display Google logo in login button', () => {
      render(<Auth />);

      const loginButton = screen.getByText('Log ind med Google');
      const svg = loginButton.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('width', '18');
      expect(svg).toHaveAttribute('height', '18');
    });
  });

  describe('Authenticated', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
      },
    };

    beforeEach(() => {
      mockAuthState.user = mockUser;
    });

    it('should display user profile when authenticated', () => {
      render(<Auth />);

      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should display user avatar when available', () => {
      render(<Auth />);

      const avatar = screen.getByAltText('Test User');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      expect(avatar).toHaveClass('user-avatar');
    });

    it('should display email as alt text when name not available', () => {
      mockAuthState.user = {
        ...mockUser,
        user_metadata: {
          avatar_url: 'https://example.com/avatar.jpg',
        },
      };

      render(<Auth />);

      const avatar = screen.getByAltText('test@example.com');
      expect(avatar).toBeInTheDocument();
    });

    it('should display email as name when full_name not available', () => {
      mockAuthState.user = {
        ...mockUser,
        user_metadata: {},
      };

      render(<Auth />);

      const nameElements = screen.getAllByText('test@example.com');
      expect(nameElements.length).toBeGreaterThan(0);
    });

    it('should not display avatar when not available', () => {
      mockAuthState.user = {
        ...mockUser,
        user_metadata: {
          full_name: 'Test User',
        },
      };

      render(<Auth />);

      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('should display logout button', () => {
      render(<Auth />);

      expect(screen.getByText('Log ud')).toBeInTheDocument();
    });

    it('should call signOut when logout button clicked', async () => {
      const user = userEvent.setup();
      render(<Auth />);

      const logoutButton = screen.getByText('Log ud');
      await user.click(logoutButton);

      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it('should not display login UI when authenticated', () => {
      render(<Auth />);

      expect(screen.queryByText('Log ind med Google')).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Automatisk synkronisering/)
      ).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when error exists', () => {
      mockAuthState.error = 'Authentication failed';

      render(<Auth />);

      expect(screen.getByText('❌ Authentication failed')).toBeInTheDocument();
    });

    it('should display error with login button', () => {
      mockAuthState.error = 'Network error';

      render(<Auth />);

      expect(screen.getByText('❌ Network error')).toBeInTheDocument();
      expect(screen.getByText('Log ind med Google')).toBeInTheDocument();
    });

    it('should not display error when no error', () => {
      render(<Auth />);

      expect(screen.queryByText(/❌/)).not.toBeInTheDocument();
    });
  });

  describe('UI Structure', () => {
    it('should have correct class names for styling', () => {
      render(<Auth />);

      expect(document.querySelector('.auth-container')).toBeInTheDocument();
      expect(document.querySelector('.auth-card')).toBeInTheDocument();
      expect(document.querySelector('.auth-header')).toBeInTheDocument();
    });

    it('should have Google button with correct classes', () => {
      render(<Auth />);

      const loginButton = screen.getByText('Log ind med Google');
      expect(loginButton).toHaveClass('btn', 'btn-google');
    });

    it('should have logout button with correct classes when authenticated', () => {
      mockAuthState.user = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {},
      };

      render(<Auth />);

      const logoutButton = screen.getByText('Log ud');
      expect(logoutButton).toHaveClass('btn', 'btn-secondary', 'btn-sm');
    });

    it('should set crossOrigin attribute on avatar image', () => {
      mockAuthState.user = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {
          full_name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg',
        },
      };

      render(<Auth />);

      const avatar = screen.getByAltText('Test User');
      expect(avatar).toHaveAttribute('crossOrigin', 'anonymous');
    });
  });
});
