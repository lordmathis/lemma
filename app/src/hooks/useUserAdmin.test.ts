import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUserAdmin } from './useUserAdmin';
import * as adminApi from '@/api/admin';
import type { CreateUserRequest, UpdateUserRequest } from '@/types/api';
import { UserRole, Theme, type User } from '@/types/models';

// Mock dependencies
vi.mock('@/api/admin');
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

// Mock useAdminData hook
const mockAdminData = {
  data: [] as User[],
  loading: false,
  error: null as string | null,
  reload: vi.fn(),
};

vi.mock('./useAdminData', () => ({
  useAdminData: () => mockAdminData,
}));

// Import notifications for assertions
import { notifications } from '@mantine/notifications';

// Mock user data
const mockUsers: User[] = [
  {
    id: 1,
    email: 'admin@example.com',
    displayName: 'Admin User',
    role: UserRole.Admin,
    theme: Theme.Dark,
    createdAt: '2024-01-01T00:00:00Z',
    lastWorkspaceId: 1,
  },
  {
    id: 2,
    email: 'editor@example.com',
    displayName: 'Editor User',
    role: UserRole.Editor,
    theme: Theme.Dark,
    createdAt: '2024-01-02T00:00:00Z',
    lastWorkspaceId: 1,
  },
];

// Helper function to get a user by index and ensure it's not undefined
const getUser = (index: number): User => {
  const user = mockUsers[index];
  if (!user) {
    throw new Error(`User at index ${index} is undefined`);
  }
  return user;
};

describe('useUserAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock data
    mockAdminData.data = [...mockUsers];
    mockAdminData.loading = false;
    mockAdminData.error = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('returns users data from useAdminData', () => {
      const { result } = renderHook(() => useUserAdmin());

      expect(result.current.users).toEqual(mockUsers);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('returns loading state from useAdminData', () => {
      mockAdminData.loading = true;

      const { result } = renderHook(() => useUserAdmin());

      expect(result.current.loading).toBe(true);
    });

    it('returns error state from useAdminData', () => {
      mockAdminData.error = 'Failed to load users';

      const { result } = renderHook(() => useUserAdmin());

      expect(result.current.error).toBe('Failed to load users');
    });

    it('provides CRUD functions', () => {
      const { result } = renderHook(() => useUserAdmin());

      expect(typeof result.current.create).toBe('function');
      expect(typeof result.current.update).toBe('function');
      expect(typeof result.current.delete).toBe('function');
    });
  });

  describe('create user', () => {
    it('creates user successfully', async () => {
      const mockCreateUser = vi.mocked(adminApi.createUser);
      const newUser: User = {
        id: 3,
        email: 'newuser@example.com',
        displayName: 'New User',
        role: UserRole.Viewer,
    theme: Theme.Dark,
        createdAt: '2024-01-03T00:00:00Z',
        lastWorkspaceId: 1,
      };
      mockCreateUser.mockResolvedValue(newUser);

      const { result } = renderHook(() => useUserAdmin());

      const createRequest: CreateUserRequest = {
        email: 'newuser@example.com',
        displayName: 'New User',
        password: 'password123',
        role: UserRole.Viewer,
    theme: Theme.Dark,
      };

      let createResult: boolean | undefined;
      await act(async () => {
        createResult = await result.current.create(createRequest);
      });

      expect(createResult).toBe(true);
      expect(mockCreateUser).toHaveBeenCalledWith(createRequest);
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Success',
        message: 'User created successfully',
        color: 'green',
      });
      expect(mockAdminData.reload).toHaveBeenCalled();
    });

    it('handles create errors with specific message', async () => {
      const mockCreateUser = vi.mocked(adminApi.createUser);
      mockCreateUser.mockRejectedValue(new Error('Email already exists'));

      const { result } = renderHook(() => useUserAdmin());

      const createRequest: CreateUserRequest = {
        email: 'existing@example.com',
        displayName: 'Test User',
        password: 'password123',
        role: UserRole.Editor,
    theme: Theme.Dark,
      };

      let createResult: boolean | undefined;
      await act(async () => {
        createResult = await result.current.create(createRequest);
      });

      expect(createResult).toBe(false);
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to create user: Email already exists',
        color: 'red',
      });
      expect(mockAdminData.reload).not.toHaveBeenCalled();
    });

    it('handles create errors with non-Error rejection', async () => {
      const mockCreateUser = vi.mocked(adminApi.createUser);
      mockCreateUser.mockRejectedValue('String error');

      const { result } = renderHook(() => useUserAdmin());

      const createRequest: CreateUserRequest = {
        email: 'test@example.com',
        displayName: 'Test User',
        password: 'password123',
        role: UserRole.Editor,
    theme: Theme.Dark,
      };

      let createResult: boolean | undefined;
      await act(async () => {
        createResult = await result.current.create(createRequest);
      });

      expect(createResult).toBe(false);
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to create user: String error',
        color: 'red',
      });
    });
  });

  describe('update user', () => {
    it('updates user successfully', async () => {
      const mockUpdateUser = vi.mocked(adminApi.updateUser);
      const user = getUser(1);
      const updatedUser: User = {
        id: user.id,
        email: user.email,
        displayName: 'Updated Editor',
        role: user.role,
        theme: user.theme,
        createdAt: user.createdAt,
        lastWorkspaceId: user.lastWorkspaceId,
      };
      mockUpdateUser.mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useUserAdmin());

      const updateRequest: UpdateUserRequest = {
        displayName: 'Updated Editor',
      };

      let updateResult: boolean | undefined;
      await act(async () => {
        updateResult = await result.current.update(2, updateRequest);
      });

      expect(updateResult).toBe(true);
      expect(mockUpdateUser).toHaveBeenCalledWith(2, updateRequest);
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Success',
        message: 'User updated successfully',
        color: 'green',
      });
      expect(mockAdminData.reload).toHaveBeenCalled();
    });

    it('updates user email and role', async () => {
      const mockUpdateUser = vi.mocked(adminApi.updateUser);
      const user = getUser(1);
      const updatedUser: User = {
        id: user.id,
        email: 'newemail@example.com',
        displayName: user.displayName || '',
        role: UserRole.Admin,
    theme: Theme.Dark,
        createdAt: user.createdAt,
        lastWorkspaceId: user.lastWorkspaceId,
      };
      mockUpdateUser.mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useUserAdmin());

      const updateRequest: UpdateUserRequest = {
        email: 'newemail@example.com',
        role: UserRole.Admin,
    theme: Theme.Dark,
      };

      let updateResult: boolean | undefined;
      await act(async () => {
        updateResult = await result.current.update(2, updateRequest);
      });

      expect(updateResult).toBe(true);
      expect(mockUpdateUser).toHaveBeenCalledWith(2, updateRequest);
    });

    it('updates user password', async () => {
      const mockUpdateUser = vi.mocked(adminApi.updateUser);
      mockUpdateUser.mockResolvedValue(getUser(1));

      const { result } = renderHook(() => useUserAdmin());

      const updateRequest: UpdateUserRequest = {
        password: 'newpassword123',
      };

      let updateResult: boolean | undefined;
      await act(async () => {
        updateResult = await result.current.update(2, updateRequest);
      });

      expect(updateResult).toBe(true);
      expect(mockUpdateUser).toHaveBeenCalledWith(2, updateRequest);
    });

    it('handles update errors', async () => {
      const mockUpdateUser = vi.mocked(adminApi.updateUser);
      mockUpdateUser.mockRejectedValue(new Error('User not found'));

      const { result } = renderHook(() => useUserAdmin());

      const updateRequest: UpdateUserRequest = {
        displayName: 'Updated Name',
      };

      let updateResult: boolean | undefined;
      await act(async () => {
        updateResult = await result.current.update(999, updateRequest);
      });

      expect(updateResult).toBe(false);
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to update user: User not found',
        color: 'red',
      });
      expect(mockAdminData.reload).not.toHaveBeenCalled();
    });

    it('handles empty update request', async () => {
      const mockUpdateUser = vi.mocked(adminApi.updateUser);
      mockUpdateUser.mockResolvedValue(getUser(1));

      const { result } = renderHook(() => useUserAdmin());

      let updateResult: boolean | undefined;
      await act(async () => {
        updateResult = await result.current.update(2, {});
      });

      expect(updateResult).toBe(true);
      expect(mockUpdateUser).toHaveBeenCalledWith(2, {});
    });
  });

  describe('delete user', () => {
    it('deletes user successfully', async () => {
      const mockDeleteUser = vi.mocked(adminApi.deleteUser);
      mockDeleteUser.mockResolvedValue(undefined);

      const { result } = renderHook(() => useUserAdmin());

      let deleteResult: boolean | undefined;
      await act(async () => {
        deleteResult = await result.current.delete(2);
      });

      expect(deleteResult).toBe(true);
      expect(mockDeleteUser).toHaveBeenCalledWith(2);
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Success',
        message: 'User deleted successfully',
        color: 'green',
      });
      expect(mockAdminData.reload).toHaveBeenCalled();
    });

    it('handles delete errors', async () => {
      const mockDeleteUser = vi.mocked(adminApi.deleteUser);
      mockDeleteUser.mockRejectedValue(new Error('Cannot delete admin user'));

      const { result } = renderHook(() => useUserAdmin());

      let deleteResult: boolean | undefined;
      await act(async () => {
        deleteResult = await result.current.delete(1);
      });

      expect(deleteResult).toBe(false);
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to delete user: Cannot delete admin user',
        color: 'red',
      });
      expect(mockAdminData.reload).not.toHaveBeenCalled();
    });

    it('handles delete with non-existent user', async () => {
      const mockDeleteUser = vi.mocked(adminApi.deleteUser);
      mockDeleteUser.mockRejectedValue(new Error('User not found'));

      const { result } = renderHook(() => useUserAdmin());

      let deleteResult: boolean | undefined;
      await act(async () => {
        deleteResult = await result.current.delete(999);
      });

      expect(deleteResult).toBe(false);
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to delete user: User not found',
        color: 'red',
      });
    });
  });

  describe('data integration', () => {
    it('reflects loading state changes', () => {
      const { result, rerender } = renderHook(() => useUserAdmin());

      expect(result.current.loading).toBe(false);

      // Change loading state
      mockAdminData.loading = true;
      rerender();

      expect(result.current.loading).toBe(true);
    });

    it('reflects error state changes', () => {
      const { result, rerender } = renderHook(() => useUserAdmin());

      expect(result.current.error).toBeNull();

      // Add error
      mockAdminData.error = 'Network error';
      rerender();

      expect(result.current.error).toBe('Network error');
    });

    it('reflects data changes', () => {
      const { result, rerender } = renderHook(() => useUserAdmin());

      expect(result.current.users).toEqual(mockUsers);

      // Change users data
      const newUsers = [mockUsers[0]].filter((u): u is User => u !== undefined);
      mockAdminData.data = newUsers;
      rerender();

      expect(result.current.users).toEqual(newUsers);
    });

    it('calls reload after successful operations', async () => {
      const mockCreateUser = vi.mocked(adminApi.createUser);
      const mockUpdateUser = vi.mocked(adminApi.updateUser);
      const mockDeleteUser = vi.mocked(adminApi.deleteUser);

      mockCreateUser.mockResolvedValue(getUser(0));
      mockUpdateUser.mockResolvedValue(getUser(0));
      mockDeleteUser.mockResolvedValue(undefined);

      const { result } = renderHook(() => useUserAdmin());

      // Test create
      await act(async () => {
        await result.current.create({
          email: 'test@example.com',
          displayName: 'Test',
          password: 'pass',
          role: UserRole.Viewer,
    theme: Theme.Dark,
        });
      });

      expect(mockAdminData.reload).toHaveBeenCalledTimes(1);

      // Test update
      await act(async () => {
        await result.current.update(1, { displayName: 'Updated' });
      });

      expect(mockAdminData.reload).toHaveBeenCalledTimes(2);

      // Test delete
      await act(async () => {
        await result.current.delete(1);
      });

      expect(mockAdminData.reload).toHaveBeenCalledTimes(3);
    });

    it('does not call reload after failed operations', async () => {
      const mockCreateUser = vi.mocked(adminApi.createUser);
      const mockUpdateUser = vi.mocked(adminApi.updateUser);
      const mockDeleteUser = vi.mocked(adminApi.deleteUser);

      mockCreateUser.mockRejectedValue(new Error('Create failed'));
      mockUpdateUser.mockRejectedValue(new Error('Update failed'));
      mockDeleteUser.mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useUserAdmin());

      // Test failed create
      await act(async () => {
        await result.current.create({
          email: 'test@example.com',
          displayName: 'Test',
          password: 'pass',
          role: UserRole.Viewer,
    theme: Theme.Dark,
        });
      });

      // Test failed update
      await act(async () => {
        await result.current.update(1, { displayName: 'Updated' });
      });

      // Test failed delete
      await act(async () => {
        await result.current.delete(1);
      });

      expect(mockAdminData.reload).not.toHaveBeenCalled();
    });
  });

  describe('concurrent operations', () => {
    it('handles multiple create operations', async () => {
      const mockCreateUser = vi.mocked(adminApi.createUser);
      mockCreateUser
        .mockResolvedValueOnce({
          id: 3,
          email: 'user1@example.com',
          displayName: 'User 1',
          role: UserRole.Viewer,
    theme: Theme.Dark,
          createdAt: '2024-01-03T00:00:00Z',
          lastWorkspaceId: 1,
        })
        .mockResolvedValueOnce({
          id: 4,
          email: 'user2@example.com',
          displayName: 'User 2',
          role: UserRole.Editor,
    theme: Theme.Dark,
          createdAt: '2024-01-04T00:00:00Z',
          lastWorkspaceId: 1,
        });

      const { result } = renderHook(() => useUserAdmin());

      const requests = [
        {
          email: 'user1@example.com',
          displayName: 'User 1',
          password: 'pass1',
          role: UserRole.Viewer,
    theme: Theme.Dark,
        },
        {
          email: 'user2@example.com',
          displayName: 'User 2',
          password: 'pass2',
          role: UserRole.Editor,
    theme: Theme.Dark,
        },
      ];

      let results: boolean[] = [];
      await act(async () => {
        results = await Promise.all(
          requests.map((req) => result.current.create(req))
        );
      });

      expect(results).toEqual([true, true]);
      expect(mockCreateUser).toHaveBeenCalledTimes(2);
      expect(mockAdminData.reload).toHaveBeenCalledTimes(2);
    });

    it('handles mixed successful and failed operations', async () => {
      const mockCreateUser = vi.mocked(adminApi.createUser);
      mockCreateUser
        .mockResolvedValueOnce(getUser(0))
        .mockRejectedValueOnce(new Error('Second create failed'));

      const { result } = renderHook(() => useUserAdmin());

      const requests = [
        {
          email: 'success@example.com',
          displayName: 'Success User',
          password: 'pass1',
          role: UserRole.Viewer,
    theme: Theme.Dark,
        },
        {
          email: 'fail@example.com',
          displayName: 'Fail User',
          password: 'pass2',
          role: UserRole.Editor,
    theme: Theme.Dark,
        },
      ];

      let results: boolean[] = [];
      await act(async () => {
        results = await Promise.all(
          requests.map((req) => result.current.create(req))
        );
      });

      expect(results).toEqual([true, false]);
      expect(mockAdminData.reload).toHaveBeenCalledTimes(1); // Only for successful operation
    });
  });

  describe('hook interface stability', () => {
    it('functions are stable across re-renders', () => {
      const { result, rerender } = renderHook(() => useUserAdmin());

      const initialFunctions = {
        create: result.current.create,
        update: result.current.update,
        delete: result.current.delete,
      };

      rerender();

      expect(result.current.create).toBe(initialFunctions.create);
      expect(result.current.update).toBe(initialFunctions.update);
      expect(result.current.delete).toBe(initialFunctions.delete);
    });

    it('returns consistent interface', () => {
      const { result } = renderHook(() => useUserAdmin());

      expect(Array.isArray(result.current.users)).toBe(true);
      expect(typeof result.current.loading).toBe('boolean');
      expect(
        result.current.error === null ||
          typeof result.current.error === 'string'
      ).toBe(true);
      expect(typeof result.current.create).toBe('function');
      expect(typeof result.current.update).toBe('function');
      expect(typeof result.current.delete).toBe('function');
    });
  });
});
