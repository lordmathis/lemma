import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { UserRole, type User } from '@/types/models';

// Set up mocks before imports are used
vi.mock('@/api/auth', () => {
  return {
    login: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    getCurrentUser: vi.fn(),
  };
});

vi.mock('@mantine/notifications', () => {
  return {
    notifications: {
      show: vi.fn(),
    },
  };
});

// Import the mocks after they've been defined
import {
  login as mockLogin,
  logout as mockLogout,
  refreshToken as mockRefreshToken,
  getCurrentUser as mockGetCurrentUser,
} from '@/api/auth';
import { notifications } from '@mantine/notifications';

// Get reference to the mocked notifications.show function
const mockNotificationsShow = notifications.show as unknown as ReturnType<
  typeof vi.fn
>;

// Mock user data
const mockUser: User = {
  id: 1,
  email: 'test@example.com',
  displayName: 'Test User',
  role: UserRole.Editor,
  createdAt: '2024-01-01T00:00:00Z',
  lastWorkspaceId: 1,
};

// Helper wrapper component for testing
const createWrapper = () => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );
  Wrapper.displayName = 'AuthProviderTestWrapper';
  return Wrapper;
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AuthProvider initialization', () => {
    it('initializes with null user and loading state', () => {
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Not authenticated')
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toBeNull();
      expect(result.current.loading).toBe(true);
      expect(result.current.initialized).toBe(false);
    });

    it('provides all expected functions', () => {
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Not authenticated')
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(typeof result.current.login).toBe('function');
      expect(typeof result.current.logout).toBe('function');
      expect(typeof result.current.refreshToken).toBe('function');
      expect(typeof result.current.refreshUser).toBe('function');
    });

    it('loads current user on mount when authenticated', async () => {
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockUser
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.loading).toBe(false);
      expect(mockGetCurrentUser).toHaveBeenCalledTimes(1);
    });

    it('handles initialization error gracefully', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to initialize auth:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('useAuth hook', () => {
    it('throws error when used outside AuthProvider', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });

    it('returns auth context when used within provider', async () => {
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Not authenticated')
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      expect(result.current).toBeDefined();
      expect(typeof result.current).toBe('object');
    });

    it('maintains function stability across re-renders', async () => {
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Not authenticated')
      );

      const wrapper = createWrapper();
      const { result, rerender } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      const initialFunctions = {
        login: result.current.login,
        logout: result.current.logout,
        refreshToken: result.current.refreshToken,
        refreshUser: result.current.refreshUser,
      };

      rerender();

      expect(result.current.login).toBe(initialFunctions.login);
      expect(result.current.logout).toBe(initialFunctions.logout);
      expect(result.current.refreshToken).toBe(initialFunctions.refreshToken);
      expect(result.current.refreshUser).toBe(initialFunctions.refreshUser);
    });
  });

  describe('login functionality', () => {
    beforeEach(() => {
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Not authenticated')
      );
    });

    it('logs in user successfully', async () => {
      (mockLogin as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      let loginResult: boolean | undefined;
      await act(async () => {
        loginResult = await result.current.login(
          'test@example.com',
          'password123'
        );
      });

      expect(loginResult).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockNotificationsShow).toHaveBeenCalledWith({
        title: 'Success',
        message: 'Logged in successfully',
        color: 'green',
      });
    });

    it('handles login failure with error message', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      (mockLogin as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Invalid credentials')
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      let loginResult: boolean | undefined;
      await act(async () => {
        loginResult = await result.current.login(
          'test@example.com',
          'wrongpassword'
        );
      });

      expect(loginResult).toBe(false);
      expect(result.current.user).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Login failed:',
        expect.any(Error)
      );
      expect(mockNotificationsShow).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Invalid credentials',
        color: 'red',
      });

      consoleSpy.mockRestore();
    });

    it('handles login failure with generic message', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      (mockLogin as ReturnType<typeof vi.fn>).mockRejectedValue(
        'Network error'
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      let loginResult: boolean | undefined;
      await act(async () => {
        loginResult = await result.current.login(
          'test@example.com',
          'password123'
        );
      });

      expect(loginResult).toBe(false);
      expect(mockNotificationsShow).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Login failed',
        color: 'red',
      });

      consoleSpy.mockRestore();
    });

    it('handles multiple login attempts', async () => {
      (mockLogin as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce(mockUser);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      // First attempt fails
      let firstResult: boolean | undefined;
      await act(async () => {
        firstResult = await result.current.login(
          'test@example.com',
          'wrongpassword'
        );
      });

      expect(firstResult).toBe(false);
      expect(result.current.user).toBeNull();

      // Second attempt succeeds
      let secondResult: boolean | undefined;
      await act(async () => {
        secondResult = await result.current.login(
          'test@example.com',
          'correctpassword'
        );
      });

      expect(secondResult).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });
  });

  describe('logout functionality', () => {
    it('logs out user successfully', async () => {
      // Start with authenticated user
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockUser
      );
      (mockLogout as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('clears user state even when logout API fails', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      // Start with authenticated user
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockUser
      );
      (mockLogout as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Logout failed')
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Logout failed:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('handles logout when user is already null', async () => {
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Not authenticated')
      );
      (mockLogout as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('refreshToken functionality', () => {
    it('refreshes token successfully', async () => {
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Not authenticated')
      );
      (mockRefreshToken as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      let refreshResult: boolean | undefined;
      await act(async () => {
        refreshResult = await result.current.refreshToken();
      });

      expect(refreshResult).toBe(true);
      expect(mockRefreshToken).toHaveBeenCalledTimes(1);
    });

    it('handles token refresh failure and logs out user', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      // Start with authenticated user
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockUser
      );
      (mockRefreshToken as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      (mockLogout as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      let refreshResult: boolean | undefined;
      await act(async () => {
        refreshResult = await result.current.refreshToken();
      });

      expect(refreshResult).toBe(false);
      expect(result.current.user).toBeNull();
      expect(mockLogout).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });

    it('handles token refresh API error and logs out user', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      // Start with authenticated user
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockUser
      );
      (mockRefreshToken as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Refresh failed')
      );
      (mockLogout as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      let refreshResult: boolean | undefined;
      await act(async () => {
        refreshResult = await result.current.refreshToken();
      });

      expect(refreshResult).toBe(false);
      expect(result.current.user).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Token refresh failed:',
        expect.any(Error)
      );
      expect(mockLogout).toHaveBeenCalledTimes(1);

      consoleSpy.mockRestore();
    });
  });

  describe('refreshUser functionality', () => {
    it('refreshes user data successfully', async () => {
      // Start with authenticated user
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockUser
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      // Mock updated user data
      const updatedUser = { ...mockUser, displayName: 'Updated User' };
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(
        updatedUser
      );

      await act(async () => {
        await result.current.refreshUser();
      });

      expect(result.current.user).toEqual(updatedUser);
      expect(mockGetCurrentUser).toHaveBeenCalledTimes(2); // Once on init, once on refresh
    });

    it('handles user refresh failure', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      // Start with authenticated user
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockUser
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      // Mock refresh failure
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Refresh user failed')
      );

      await act(async () => {
        await result.current.refreshUser();
      });

      // User should remain the same after failed refresh
      expect(result.current.user).toEqual(mockUser);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to refresh user data:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('authentication state transitions', () => {
    it('transitions from unauthenticated to authenticated', async () => {
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Not authenticated')
      );
      (mockLogin as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      expect(result.current.user).toBeNull();

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(result.current.user).toEqual(mockUser);
    });

    it('transitions from authenticated to unauthenticated', async () => {
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockUser
      );
      (mockLogout as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
    });

    it('handles user data updates while authenticated', async () => {
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockUser
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      // Simulate user profile update
      const updatedUser = { ...mockUser, displayName: 'Updated Name' };
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(
        updatedUser
      );

      await act(async () => {
        await result.current.refreshUser();
      });

      expect(result.current.user).toEqual(updatedUser);
    });
  });

  describe('context value structure', () => {
    it('provides expected context interface', async () => {
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Not authenticated')
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      // Check boolean and object values
      expect(result.current.user).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.initialized).toBe(true);

      // Check function types
      expect(typeof result.current.login).toBe('function');
      expect(typeof result.current.logout).toBe('function');
      expect(typeof result.current.refreshToken).toBe('function');
      expect(typeof result.current.refreshUser).toBe('function');
    });

    it('provides correct context when authenticated', async () => {
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockUser
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      // Check boolean and object values
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.loading).toBe(false);
      expect(result.current.initialized).toBe(true);

      // Check function types
      expect(typeof result.current.login).toBe('function');
      expect(typeof result.current.logout).toBe('function');
      expect(typeof result.current.refreshToken).toBe('function');
      expect(typeof result.current.refreshUser).toBe('function');
    });
  });

  describe('loading states', () => {
    it('shows loading during initialization', () => {
      let resolveGetCurrentUser: (value: User) => void;
      const pendingPromise = new Promise<User>((resolve) => {
        resolveGetCurrentUser = resolve;
      });
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockReturnValue(
        pendingPromise
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.initialized).toBe(false);

      act(() => {
        resolveGetCurrentUser!(mockUser);
      });
    });

    it('clears loading after initialization completes', async () => {
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockUser
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.initialized).toBe(true);
      });
    });

    it('clears loading after initialization fails', async () => {
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Init failed')
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.initialized).toBe(true);
      });
    });
  });

  describe('error handling', () => {
    it('handles network errors during login', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Not authenticated')
      );
      (mockLogin as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network unavailable')
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      await act(async () => {
        const success = await result.current.login(
          'test@example.com',
          'password123'
        );
        expect(success).toBe(false);
      });

      expect(mockNotificationsShow).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Network unavailable',
        color: 'red',
      });

      consoleSpy.mockRestore();
    });

    it('handles invalid user data during initialization', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      // Use a more precise type for testing
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        invalid: 'user',
      } as unknown as User);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      expect(result.current.user).toEqual({ invalid: 'user' });

      consoleSpy.mockRestore();
    });
  });

  describe('concurrent operations', () => {
    it('handles concurrent login attempts', async () => {
      (mockGetCurrentUser as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Not authenticated')
      );
      (mockLogin as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      // Make concurrent login calls
      const [result1, result2] = await act(async () => {
        return Promise.all([
          result.current.login('test@example.com', 'password123'),
          result.current.login('test@example.com', 'password123'),
        ]);
      });

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(mockLogin).toHaveBeenCalledTimes(2);
    });
  });
});
