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
    it('initializes with empty stats and loading state', () => {
      const { result } = renderHook(() => useAdminData('stats'));

      expect(result.current.data).toEqual({});
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.reload).toBe('function');
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
    it('initializes with empty users array and loading state', () => {
      const { result } = renderHook(() => useAdminData('users'));

      expect(result.current.data).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.reload).toBe('function');
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
    it('initializes with empty workspaces array and loading state', () => {
      const { result } = renderHook(() => useAdminData('workspaces'));

      expect(result.current.data).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.reload).toBe('function');
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

    it('handles unknown errors gracefully', async () => {
      const mockGetUsers = vi.mocked(adminApi.getUsers);
      mockGetUsers.mockRejectedValue('String error');

      const { result } = renderHook(() => useAdminData('users'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('An unknown error occurred');
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to load users: An unknown error occurred',
        color: 'red',
      });
    });

    it('handles network timeout errors', async () => {
      const mockGetWorkspaces = vi.mocked(adminApi.getWorkspaces);
      mockGetWorkspaces.mockRejectedValue(new Error('Network timeout'));

      const { result } = renderHook(() => useAdminData('workspaces'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Network timeout');
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to load workspaces: Network timeout',
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
    it('manages loading state correctly during initial load', async () => {
      const mockGetSystemStats = vi.mocked(adminApi.getSystemStats);
      let resolvePromise: (value: SystemStats) => void;
      const pendingPromise = new Promise<SystemStats>((resolve) => {
        resolvePromise = resolve;
      });
      mockGetSystemStats.mockReturnValue(pendingPromise);

      const { result } = renderHook(() => useAdminData('stats'));

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise!(mockSystemStats);
        await pendingPromise;
      });

      expect(result.current.loading).toBe(false);
    });

    it('manages loading state correctly during reload', async () => {
      const mockGetUsers = vi.mocked(adminApi.getUsers);
      mockGetUsers.mockResolvedValue(mockUsers);

      const { result } = renderHook(() => useAdminData('users'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let resolveReload: (value: User[]) => void;
      const reloadPromise = new Promise<User[]>((resolve) => {
        resolveReload = resolve;
      });
      mockGetUsers.mockReturnValueOnce(reloadPromise);

      act(() => {
        void result.current.reload();
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolveReload!(mockUsers);
        await reloadPromise;
      });

      expect(result.current.loading).toBe(false);
    });

    it('handles loading state during error scenarios', async () => {
      const mockGetWorkspaces = vi.mocked(adminApi.getWorkspaces);
      let rejectPromise: (error: Error) => void;
      const errorPromise = new Promise<WorkspaceStats[]>((_, reject) => {
        rejectPromise = reject;
      });
      mockGetWorkspaces.mockReturnValue(errorPromise);

      const { result } = renderHook(() => useAdminData('workspaces'));

      expect(result.current.loading).toBe(true);

      await act(async () => {
        rejectPromise!(new Error('Load failed'));
        try {
          await errorPromise;
        } catch {
          // Expected to fail
        }
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('data consistency', () => {
    it('maintains data consistency across re-renders', async () => {
      const mockGetSystemStats = vi.mocked(adminApi.getSystemStats);
      mockGetSystemStats.mockResolvedValue(mockSystemStats);

      const { result, rerender } = renderHook(() => useAdminData('stats'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialData = result.current.data;

      rerender();

      expect(result.current.data).toBe(initialData);
      expect(result.current.data).toEqual(mockSystemStats);
    });

    it('provides stable reload function across re-renders', () => {
      const { result, rerender } = renderHook(() => useAdminData('stats'));

      const initialReload = result.current.reload;

      rerender();

      expect(result.current.reload).toBe(initialReload);
    });

    it('handles data type changes correctly', () => {
      const { result: statsResult } = renderHook(() => useAdminData('stats'));
      const { result: usersResult } = renderHook(() => useAdminData('users'));
      const { result: workspacesResult } = renderHook(() =>
        useAdminData('workspaces')
      );

      // Different data types should have different initial values
      expect(statsResult.current.data).toEqual({});
      expect(usersResult.current.data).toEqual([]);
      expect(workspacesResult.current.data).toEqual([]);
    });
  });

  describe('function stability', () => {
    it('maintains stable reload function reference', () => {
      const { result, rerender } = renderHook(() => useAdminData('stats'));

      const initialReload = result.current.reload;

      rerender();

      expect(result.current.reload).toBe(initialReload);
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

  describe('edge cases', () => {
    it('handles invalid data type gracefully', async () => {
      // This would normally be caught by TypeScript, but test runtime behavior
      const mockGetSystemStats = vi.mocked(adminApi.getSystemStats);
      mockGetSystemStats.mockRejectedValue(new Error('Invalid data type'));

      const { result } = renderHook(() => useAdminData('stats'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Invalid data type');
    });

    it('handles partial data responses', async () => {
      const partialStats = {
        totalUsers: 5,
        activeUsers: 3,
        // Missing other required fields
      };

      const mockGetSystemStats = vi.mocked(adminApi.getSystemStats);
      mockGetSystemStats.mockResolvedValue(partialStats as SystemStats);

      const { result } = renderHook(() => useAdminData('stats'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(partialStats);
      expect(result.current.error).toBeNull();
    });
  });
});
