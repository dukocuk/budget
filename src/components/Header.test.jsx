/**
 * Tests for Header component
 * Tests sync status display, user profile, and logout functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from './Header';

// Mock useAuth hook
const mockSignOut = vi.fn();

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    signOut: mockSignOut,
  }),
}));

// Mock useSyncContext hook
let mockSyncState = {
  syncStatus: 'idle',
  isOnline: true,
};

vi.mock('../hooks/useSyncContext', () => ({
  useSyncContext: () => mockSyncState,
}));

describe('Header', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/avatar.jpg',
  };

  const mockOnOpenSettings = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset sync state to default
    mockSyncState = {
      syncStatus: 'idle',
      isOnline: true,
    };
  });

  describe('Basic Rendering', () => {
    it('should render app title', () => {
      render(<Header user={null} onOpenSettings={mockOnOpenSettings} />);

      expect(screen.getByText('💰 Budget Tracker')).toBeInTheDocument();
    });

    it('should render subtitle', () => {
      render(<Header user={null} onOpenSettings={mockOnOpenSettings} />);

      expect(
        screen.getByText('Administrer dine faste udgifter i DKK')
      ).toBeInTheDocument();
    });

    it('should not render user section when no user', () => {
      render(<Header user={null} onOpenSettings={mockOnOpenSettings} />);

      expect(screen.queryByText('Log ud')).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /indstillinger/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('User Profile', () => {
    it('should display user name when authenticated', () => {
      render(<Header user={mockUser} onOpenSettings={mockOnOpenSettings} />);

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('should display user email as name when name not available', () => {
      const userWithoutName = {
        id: 'user-123',
        email: 'test@example.com',
      };

      render(
        <Header user={userWithoutName} onOpenSettings={mockOnOpenSettings} />
      );

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should display user avatar when available', () => {
      render(<Header user={mockUser} onOpenSettings={mockOnOpenSettings} />);

      const avatar = screen.getByAltText('Test User');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      expect(avatar).toHaveClass('user-avatar');
    });

    it('should set correct attributes on avatar image', () => {
      render(<Header user={mockUser} onOpenSettings={mockOnOpenSettings} />);

      const avatar = screen.getByAltText('Test User');
      expect(avatar).toHaveAttribute('crossOrigin', 'anonymous');
      expect(avatar).toHaveAttribute('referrerPolicy', 'no-referrer');
      expect(avatar).toHaveAttribute('loading', 'lazy');
    });

    it('should display fallback avatar when no picture', () => {
      const userWithoutAvatar = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      render(
        <Header user={userWithoutAvatar} onOpenSettings={mockOnOpenSettings} />
      );

      const fallback = document.querySelector('.user-avatar-fallback');
      expect(fallback).toBeInTheDocument();
      expect(fallback).toHaveTextContent('T'); // First letter of "Test User"
    });

    it('should display fallback avatar on image error', () => {
      render(<Header user={mockUser} onOpenSettings={mockOnOpenSettings} />);

      const avatar = screen.getByAltText('Test User');

      // Trigger image error
      fireEvent.error(avatar);

      // Avatar should be replaced with fallback
      const fallback = document.querySelector('.user-avatar-fallback');
      expect(fallback).toBeInTheDocument();
      expect(fallback).toHaveTextContent('T');
    });

    it('should use email first letter for fallback when no name', () => {
      const userWithoutName = {
        id: 'user-123',
        email: 'test@example.com',
      };

      render(
        <Header user={userWithoutName} onOpenSettings={mockOnOpenSettings} />
      );

      const fallback = document.querySelector('.user-avatar-fallback');
      expect(fallback).toBeInTheDocument();
      expect(fallback).toHaveTextContent('T'); // First letter of "test@example.com"
    });
  });

  describe('Connection Status', () => {
    it('should display online status by default', () => {
      render(<Header user={mockUser} onOpenSettings={mockOnOpenSettings} />);

      expect(screen.getByText('☁️')).toBeInTheDocument();
      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('should display offline status when not online', () => {
      mockSyncState.isOnline = false;

      render(<Header user={mockUser} onOpenSettings={mockOnOpenSettings} />);

      expect(screen.getByText('📴')).toBeInTheDocument();
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('should display syncing status', () => {
      mockSyncState.syncStatus = 'syncing';

      render(<Header user={mockUser} onOpenSettings={mockOnOpenSettings} />);

      expect(screen.getByText('🔄')).toBeInTheDocument();
      expect(screen.getByText('Synkroniserer')).toBeInTheDocument();
    });

    it('should display synced status', () => {
      mockSyncState.syncStatus = 'synced';

      render(<Header user={mockUser} onOpenSettings={mockOnOpenSettings} />);

      expect(screen.getByText('✅')).toBeInTheDocument();
      expect(screen.getByText('Synkroniseret')).toBeInTheDocument();
    });

    it('should display error status', () => {
      mockSyncState.syncStatus = 'error';

      render(<Header user={mockUser} onOpenSettings={mockOnOpenSettings} />);

      expect(screen.getByText('❌')).toBeInTheDocument();
      expect(screen.getByText('Fejl')).toBeInTheDocument();
    });

    it('should prioritize offline over other statuses', () => {
      mockSyncState.isOnline = false;
      mockSyncState.syncStatus = 'synced';

      render(<Header user={mockUser} onOpenSettings={mockOnOpenSettings} />);

      expect(screen.getByText('📴')).toBeInTheDocument();
      expect(screen.getByText('Offline')).toBeInTheDocument();
      expect(screen.queryByText('Synkroniseret')).not.toBeInTheDocument();
    });

    it('should apply correct CSS class for online status', () => {
      render(<Header user={mockUser} onOpenSettings={mockOnOpenSettings} />);

      const statusElement = document.querySelector('.connection-status');
      expect(statusElement).toHaveClass('status-online');
    });

    it('should apply correct CSS class for offline status', () => {
      mockSyncState.isOnline = false;

      render(<Header user={mockUser} onOpenSettings={mockOnOpenSettings} />);

      const statusElement = document.querySelector('.connection-status');
      expect(statusElement).toHaveClass('status-offline');
    });

    it('should apply correct CSS class for syncing status', () => {
      mockSyncState.syncStatus = 'syncing';

      render(<Header user={mockUser} onOpenSettings={mockOnOpenSettings} />);

      const statusElement = document.querySelector('.connection-status');
      expect(statusElement).toHaveClass('status-syncing');
    });

    it('should apply correct CSS class for synced status', () => {
      mockSyncState.syncStatus = 'synced';

      render(<Header user={mockUser} onOpenSettings={mockOnOpenSettings} />);

      const statusElement = document.querySelector('.connection-status');
      expect(statusElement).toHaveClass('status-synced');
    });

    it('should apply correct CSS class for error status', () => {
      mockSyncState.syncStatus = 'error';

      render(<Header user={mockUser} onOpenSettings={mockOnOpenSettings} />);

      const statusElement = document.querySelector('.connection-status');
      expect(statusElement).toHaveClass('status-error');
    });

    it('should not display connection status when no user', () => {
      render(<Header user={null} onOpenSettings={mockOnOpenSettings} />);

      expect(screen.queryByText('Online')).not.toBeInTheDocument();
      expect(screen.queryByText('Offline')).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should display settings button when user authenticated', () => {
      render(<Header user={mockUser} onOpenSettings={mockOnOpenSettings} />);

      const settingsButton = screen.getByTitle('Indstillinger');
      expect(settingsButton).toBeInTheDocument();
      expect(settingsButton).toHaveTextContent('⚙️');
    });

    it('should call onOpenSettings when settings button clicked', async () => {
      const user = userEvent.setup();
      render(<Header user={mockUser} onOpenSettings={mockOnOpenSettings} />);

      const settingsButton = screen.getByTitle('Indstillinger');
      await user.click(settingsButton);

      expect(mockOnOpenSettings).toHaveBeenCalledTimes(1);
    });

    it('should display logout button when user authenticated', () => {
      render(<Header user={mockUser} onOpenSettings={mockOnOpenSettings} />);

      const logoutButton = screen.getByTitle('Log ud');
      expect(logoutButton).toBeInTheDocument();
      expect(logoutButton).toHaveTextContent('↪️ Log ud');
    });

    it('should call signOut when logout button clicked', async () => {
      const user = userEvent.setup();
      render(<Header user={mockUser} onOpenSettings={mockOnOpenSettings} />);

      const logoutButton = screen.getByTitle('Log ud');
      await user.click(logoutButton);

      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it('should not display action buttons when no user', () => {
      render(<Header user={null} onOpenSettings={mockOnOpenSettings} />);

      expect(screen.queryByTitle('Indstillinger')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Log ud')).not.toBeInTheDocument();
    });
  });

  describe('UI Structure', () => {
    it('should have correct header structure', () => {
      render(<Header user={mockUser} onOpenSettings={mockOnOpenSettings} />);

      expect(document.querySelector('.header')).toBeInTheDocument();
      expect(document.querySelector('.header-content')).toBeInTheDocument();
      expect(document.querySelector('.header-title')).toBeInTheDocument();
    });

    it('should have user section when authenticated', () => {
      render(<Header user={mockUser} onOpenSettings={mockOnOpenSettings} />);

      expect(document.querySelector('.header-user')).toBeInTheDocument();
      expect(document.querySelector('.user-info')).toBeInTheDocument();
      expect(document.querySelector('.user-details')).toBeInTheDocument();
    });

    it('should have correct button classes', () => {
      render(<Header user={mockUser} onOpenSettings={mockOnOpenSettings} />);

      const settingsButton = screen.getByTitle('Indstillinger');
      const logoutButton = screen.getByTitle('Log ud');

      expect(settingsButton).toHaveClass('btn-settings');
      expect(logoutButton).toHaveClass('btn-logout');
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with minimal metadata', () => {
      const minimalUser = {
        id: 'user-123',
        email: 'minimal@example.com',
      };

      render(<Header user={minimalUser} onOpenSettings={mockOnOpenSettings} />);

      expect(screen.getByText('minimal@example.com')).toBeInTheDocument();
    });

    it('should handle undefined name property', () => {
      const userWithoutMetadata = {
        id: 'user-123',
        email: 'test@example.com',
      };

      render(
        <Header
          user={userWithoutMetadata}
          onOpenSettings={mockOnOpenSettings}
        />
      );

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should capitalize fallback avatar letter', () => {
      const userLowerCase = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'test user', // lowercase
      };

      render(
        <Header user={userLowerCase} onOpenSettings={mockOnOpenSettings} />
      );

      const fallback = document.querySelector('.user-avatar-fallback');
      expect(fallback).toHaveTextContent('T'); // Should be uppercase
    });
  });
});
