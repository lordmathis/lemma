import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAdminData } from './useAdminData';
import * as adminApi from '@/api/admin';
import {
  UserRole,
  type SystemStats,
  type User,
  type WorkspaceStats,
} from '@/types/models';

// Mock dependencies
vi.mock('@/api/admin');
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

// Import notifications for assertions
import { notifications } from '@mantine/notifications';

// Mock data
const mockSystemStats: SystemStats = {
  totalUsers: 10,
  activeUsers: 8,
  totalWorkspaces: 15,
  totalFiles: 150,
  totalSize: 1024000,
};

const mockUsers: User[] = [
  {
    id: 1,
    email: 'admin@example.com',
    displayName: 'Admin User',
    role: UserRole.Admin,
    createdAt: '2024-01-01T00:00:00Z',
    lastWorkspaceId: 1,
  },
  {
    id: 2,
    email: 'editor@example.com',
    displayName: 'Editor User',
    role: UserRole.Editor,
    createdAt: '2024-01-02T00:00:00Z',
    lastWorkspaceId: 2,
  },
];

const mockWorkspaceStats: WorkspaceStats[] = [
  {
    userID: 1,
    userEmail: 'admin@example.com',
    workspaceID: 1,
    workspaceName: 'admin-workspace',
    workspaceCreatedAt: '2024-01-01T00:00:00Z',
    fileCountStats: {
      totalFiles: 10,
      totalSize: 204800,
    },
  },
  {
    userID: 2,
    userEmail: 'editor@example.com',
    workspaceID: 2,
    workspaceName: 'editor-workspace',
    workspaceCreatedAt: '2024-01-02T00:00:00Z',
    fileCountStats: {
      totalFiles: 15,
      totalSize: 307200,
    },
  },
];

describe('useAdminData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('stats data type', () => {
    it('initializes with empty stats and loading state', async () => {
      const { result } = renderHook(() => useAdminData('stats'));

      expect(result.current.data).toEqual({});
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.reload).toBe('function');

      // Wait for the hook to complete its async initialization
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('loads system stats successfully', async () => {
      const mockGetSystemStats = vi.mocked(adminApi.getSystemStats);
      mockGetSystemStats.mockResolvedValue(mockSystemStats);

      const { result } = renderHook(() => useAdminData('stats'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockSystemStats);
      expect(result.current.error).toBeNull();
      expect(mockGetSystemStats).toHaveBeenCalledTimes(1);
    });

    it('handles stats loading errors', async () => {
      const mockGetSystemStats = vi.mocked(adminApi.getSystemStats);
      mockGetSystemStats.mockRejectedValue(new Error('Failed to load stats'));

      const { result } = renderHook(() => useAdminData('stats'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual({});
      expect(result.current.error).toBe('Failed to load stats');
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to load stats: Failed to load stats',
        color: 'red',
      });
    });

    it('reloads stats data', async () => {
      const mockGetSystemStats = vi.mocked(adminApi.getSystemStats);
      mockGetSystemStats.mockResolvedValue(mockSystemStats);

      const { result } = renderHook(() => useAdminData('stats'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetSystemStats).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.reload();
      });

      expect(mockGetSystemStats).toHaveBeenCalledTimes(2);
      expect(result.current.data).toEqual(mockSystemStats);
    });
  });

  describe('users data type', () => {
    it('initializes with empty users array and loading state', async () => {
      const { result } = renderHook(() => useAdminData('users'));

      expect(result.current.data).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.reload).toBe('function');

      // Wait for the hook to complete its async initialization
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('loads users successfully', async () => {
      const mockGetUsers = vi.mocked(adminApi.getUsers);
      mockGetUsers.mockResolvedValue(mockUsers);

      const { result } = renderHook(() => useAdminData('users'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockUsers);
      expect(result.current.error).toBeNull();
      expect(mockGetUsers).toHaveBeenCalledTimes(1);
    });

    it('handles users loading errors', async () => {
      const mockGetUsers = vi.mocked(adminApi.getUsers);
      mockGetUsers.mockRejectedValue(new Error('Failed to load users'));

      const { result } = renderHook(() => useAdminData('users'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.error).toBe('Failed to load users');
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to load users: Failed to load users',
        color: 'red',
      });
    });

    it('reloads users data', async () => {
      const mockGetUsers = vi.mocked(adminApi.getUsers);
      mockGetUsers.mockResolvedValue(mockUsers);

      const { result } = renderHook(() => useAdminData('users'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetUsers).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.reload();
      });

      expect(mockGetUsers).toHaveBeenCalledTimes(2);
      expect(result.current.data).toEqual(mockUsers);
    });

    it('handles empty users array', async () => {
      const mockGetUsers = vi.mocked(adminApi.getUsers);
      mockGetUsers.mockResolvedValue([]);

      const { result } = renderHook(() => useAdminData('users'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('workspaces data type', () => {
    it('initializes with empty workspaces array and loading state', async () => {
      const { result } = renderHook(() => useAdminData('workspaces'));

      expect(result.current.data).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.reload).toBe('function');

      // Wait for the hook to complete its async initialization
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('loads workspaces successfully', async () => {
      const mockGetWorkspaces = vi.mocked(adminApi.getWorkspaces);
      mockGetWorkspaces.mockResolvedValue(mockWorkspaceStats);

      const { result } = renderHook(() => useAdminData('workspaces'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockWorkspaceStats);
      expect(result.current.error).toBeNull();
      expect(mockGetWorkspaces).toHaveBeenCalledTimes(1);
    });

    it('handles workspaces loading errors', async () => {
      const mockGetWorkspaces = vi.mocked(adminApi.getWorkspaces);
      mockGetWorkspaces.mockRejectedValue(
        new Error('Failed to load workspaces')
      );

      const { result } = renderHook(() => useAdminData('workspaces'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.error).toBe('Failed to load workspaces');
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to load workspaces: Failed to load workspaces',
        color: 'red',
      });
    });

    it('reloads workspaces data', async () => {
      const mockGetWorkspaces = vi.mocked(adminApi.getWorkspaces);
      mockGetWorkspaces.mockResolvedValue(mockWorkspaceStats);

      const { result } = renderHook(() => useAdminData('workspaces'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockGetWorkspaces).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.reload();
      });

      expect(mockGetWorkspaces).toHaveBeenCalledTimes(2);
      expect(result.current.data).toEqual(mockWorkspaceStats);
    });

    it('handles workspaces with minimal configuration', async () => {
      const minimalWorkspaceStats: WorkspaceStats[] = [
        {
          userID: 3,
          userEmail: 'minimal@example.com',
          workspaceID: 3,
          workspaceName: 'minimal-workspace',
          workspaceCreatedAt: '2024-01-03T00:00:00Z',
        },
      ];

      const mockGetWorkspaces = vi.mocked(adminApi.getWorkspaces);
      mockGetWorkspaces.mockResolvedValue(minimalWorkspaceStats);

      const { result } = renderHook(() => useAdminData('workspaces'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(minimalWorkspaceStats);
      expect(result.current.error).toBeNull();
    });
  });

  describe('error handling', () => {
    it('handles API errors with error response object', async () => {
      const mockGetSystemStats = vi.mocked(adminApi.getSystemStats);
      // Create a properly typed error object to simulate API error response
      const errorWithResponse = new Error('Request failed');
      type ErrorWithResponse = Error & {
        response: {
          data: {
            error: string;
          };
        };
      };
      (errorWithResponse as ErrorWithResponse).response = {
        data: {
          error: 'Custom API error message',
        },
      };
      mockGetSystemStats.mockRejectedValue(errorWithResponse);

      const { result } = renderHook(() => useAdminData('stats'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Custom API error message');
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to load stats: Custom API error message',
        color: 'red',
      });
    });

    it('clears error on successful reload', async () => {
      const mockGetSystemStats = vi.mocked(adminApi.getSystemStats);
      mockGetSystemStats
        .mockRejectedValueOnce(new Error('Initial error'))
        .mockResolvedValueOnce(mockSystemStats);

      const { result } = renderHook(() => useAdminData('stats'));

      // Wait for initial error
      await waitFor(() => {
        expect(result.current.error).toBe('Initial error');
      });

      // Reload successfully
      await act(async () => {
        await result.current.reload();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.data).toEqual(mockSystemStats);
      });
    });
  });

  describe('loading state management', () => {
    it('manages loading state correctly through full lifecycle', async () => {
      const mockGetSystemStats = vi.mocked(adminApi.getSystemStats);
      let resolvePromise: (value: SystemStats) => void;
      const pendingPromise = new Promise<SystemStats>((resolve) => {
        resolvePromise = resolve;
      });
      mockGetSystemStats.mockReturnValue(pendingPromise);

      const { result } = renderHook(() => useAdminData('stats'));

      // Initial load should be loading
      expect(result.current.loading).toBe(true);

      // Resolve initial load
      await act(async () => {
        resolvePromise!(mockSystemStats);
        await pendingPromise;
      });

      expect(result.current.loading).toBe(false);

      // Test reload loading state
      let resolveReload: (value: SystemStats) => void;
      const reloadPromise = new Promise<SystemStats>((resolve) => {
        resolveReload = resolve;
      });
      mockGetSystemStats.mockReturnValueOnce(reloadPromise);

      act(() => {
        void result.current.reload();
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolveReload!(mockSystemStats);
        await reloadPromise;
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('data consistency', () => {
    it('handles data type parameter changes', async () => {
      const mockGetSystemStats = vi.mocked(adminApi.getSystemStats);
      const mockGetUsers = vi.mocked(adminApi.getUsers);

      mockGetSystemStats.mockResolvedValue(mockSystemStats);
      mockGetUsers.mockResolvedValue(mockUsers);

      const { result, rerender } = renderHook(
        ({ type }) => useAdminData(type),
        {
          initialProps: { type: 'stats' as const } as {
            type: 'stats' | 'users' | 'workspaces';
          },
        }
      );

      // Wait for stats to load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockSystemStats);

      // Change to users type
      rerender({ type: 'users' as const });

      // Should reset to loading and empty array for users
      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockUsers);
      expect(mockGetUsers).toHaveBeenCalledTimes(1);
    });
    it('handles data type changes correctly with different initial values', async () => {
      const mockGetSystemStats = vi.mocked(adminApi.getSystemStats);
      const mockGetUsers = vi.mocked(adminApi.getUsers);
      const mockGetWorkspaces = vi.mocked(adminApi.getWorkspaces);

      mockGetSystemStats.mockResolvedValue(mockSystemStats);
      mockGetUsers.mockResolvedValue(mockUsers);
      mockGetWorkspaces.mockResolvedValue(mockWorkspaceStats);

      const { result, rerender } = renderHook(
        ({ type }) => useAdminData(type),
        {
          initialProps: { type: 'stats' as const } as {
            type: 'stats' | 'users' | 'workspaces';
          },
        }
      );

      // Wait for stats to load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      expect(result.current.data).toEqual(mockSystemStats);

      // Change to users type - should reset to empty array and reload
      act(() => {
        rerender({ type: 'users' as const });
      });

      // Data should reset to empty array immediately when type changes
      expect(result.current.data).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      expect(result.current.data).toEqual(mockUsers);

      // Change to workspaces type - should reset to empty array and reload
      act(() => {
        rerender({ type: 'workspaces' as const });
      });

      // Data should reset to empty array immediately when type changes
      expect(result.current.data).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      expect(result.current.data).toEqual(mockWorkspaceStats);

      // Verify correct API calls were made
      expect(mockGetSystemStats).toHaveBeenCalledTimes(1);
      expect(mockGetUsers).toHaveBeenCalledTimes(1);
      expect(mockGetWorkspaces).toHaveBeenCalledTimes(1);
    });
  });

  describe('function stability', () => {
    it('maintains stable reload function reference', async () => {
      const { result, rerender } = renderHook(() => useAdminData('stats'));

      const initialReload = result.current.reload;

      rerender();

      expect(result.current.reload).toBe(initialReload);

      // Wait for the hook to complete its async initialization
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('concurrent operations', () => {
    it('handles multiple concurrent reloads', async () => {
      const mockGetSystemStats = vi.mocked(adminApi.getSystemStats);
      mockGetSystemStats.mockResolvedValue(mockSystemStats);

      const { result } = renderHook(() => useAdminData('stats'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Trigger multiple reloads
      await act(async () => {
        await Promise.all([
          result.current.reload(),
          result.current.reload(),
          result.current.reload(),
        ]);
      });

      expect(mockGetSystemStats).toHaveBeenCalledTimes(4); // 1 initial + 3 reloads
      expect(result.current.data).toEqual(mockSystemStats);
      expect(result.current.loading).toBe(false);
    });
  });
});
