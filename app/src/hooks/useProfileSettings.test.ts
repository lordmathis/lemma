import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProfileSettings } from './useProfileSettings';
import * as userApi from '@/api/user';
import type { UpdateProfileRequest } from '@/types/api';
import { UserRole, type User } from '@/types/models';

// Mock dependencies
vi.mock('@/api/user');
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

// Import notifications for assertions
import { notifications } from '@mantine/notifications';

// Mock user data
const mockUser: User = {
  id: 1,
  email: 'test@example.com',
  displayName: 'Test User',
  role: UserRole.Editor,
  createdAt: '2024-01-01T00:00:00Z',
  lastWorkspaceId: 1,
};

describe('useProfileSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('returns correct initial loading state', () => {
      const { result } = renderHook(() => useProfileSettings());

      expect(result.current.loading).toBe(false);
      expect(typeof result.current.updateProfile).toBe('function');
      expect(typeof result.current.deleteAccount).toBe('function');
    });
  });

  describe('updateProfile', () => {
    it('updates profile successfully', async () => {
      const mockUpdateProfile = vi.mocked(userApi.updateProfile);
      const updatedUser: User = {
        ...mockUser,
        displayName: 'Updated Name',
      };
      mockUpdateProfile.mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useProfileSettings());

      const updateRequest: UpdateProfileRequest = {
        displayName: 'Updated Name',
      };

      let returnedUser: User | null = null;
      await act(async () => {
        returnedUser = await result.current.updateProfile(updateRequest);
      });

      expect(returnedUser).toEqual(updatedUser);
      expect(mockUpdateProfile).toHaveBeenCalledWith(updateRequest);
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Success',
        message: 'Profile updated successfully',
        color: 'green',
      });
      expect(result.current.loading).toBe(false);
    });

    it('updates email successfully', async () => {
      const mockUpdateProfile = vi.mocked(userApi.updateProfile);
      const updatedUser: User = {
        ...mockUser,
        email: 'newemail@example.com',
      };
      mockUpdateProfile.mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useProfileSettings());

      const updateRequest: UpdateProfileRequest = {
        email: 'newemail@example.com',
        currentPassword: 'current123',
      };

      let returnedUser: User | null = null;
      await act(async () => {
        returnedUser = await result.current.updateProfile(updateRequest);
      });

      expect(returnedUser).toEqual(updatedUser);
      expect(mockUpdateProfile).toHaveBeenCalledWith(updateRequest);
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Success',
        message: 'Profile updated successfully',
        color: 'green',
      });
    });

    it('updates password successfully', async () => {
      const mockUpdateProfile = vi.mocked(userApi.updateProfile);
      mockUpdateProfile.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useProfileSettings());

      const updateRequest: UpdateProfileRequest = {
        currentPassword: 'oldpass123',
        newPassword: 'newpass456',
      };

      let returnedUser: User | null = null;
      await act(async () => {
        returnedUser = await result.current.updateProfile(updateRequest);
      });

      expect(returnedUser).toEqual(mockUser);
      expect(mockUpdateProfile).toHaveBeenCalledWith(updateRequest);
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Success',
        message: 'Profile updated successfully',
        color: 'green',
      });
    });

    it('updates multiple fields successfully', async () => {
      const mockUpdateProfile = vi.mocked(userApi.updateProfile);
      const updatedUser: User = {
        ...mockUser,
        displayName: 'New Display Name',
        email: 'updated@example.com',
      };
      mockUpdateProfile.mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useProfileSettings());

      const updateRequest: UpdateProfileRequest = {
        displayName: 'New Display Name',
        email: 'updated@example.com',
        currentPassword: 'current123',
      };

      let returnedUser: User | null = null;
      await act(async () => {
        returnedUser = await result.current.updateProfile(updateRequest);
      });

      expect(returnedUser).toEqual(updatedUser);
      expect(mockUpdateProfile).toHaveBeenCalledWith(updateRequest);
    });

    it('shows loading state during update', async () => {
      const mockUpdateProfile = vi.mocked(userApi.updateProfile);
      let resolveUpdate: (value: User) => void;
      const updatePromise = new Promise<User>((resolve) => {
        resolveUpdate = resolve;
      });
      mockUpdateProfile.mockReturnValue(updatePromise);

      const { result } = renderHook(() => useProfileSettings());

      // Start update
      act(() => {
        void result.current.updateProfile({ displayName: 'Test' });
      });

      // Should be loading
      expect(result.current.loading).toBe(true);

      // Resolve the promise
      await act(async () => {
        if (resolveUpdate) resolveUpdate(mockUser);
        await updatePromise;
      });

      // Should no longer be loading
      expect(result.current.loading).toBe(false);
    });

    it('handles password errors specifically', async () => {
      const mockUpdateProfile = vi.mocked(userApi.updateProfile);
      mockUpdateProfile.mockRejectedValue(
        new Error('Current password is incorrect')
      );

      const { result } = renderHook(() => useProfileSettings());

      const updateRequest: UpdateProfileRequest = {
        currentPassword: 'wrongpass',
        newPassword: 'newpass123',
      };

      let returnedUser: User | null = null;
      await act(async () => {
        returnedUser = await result.current.updateProfile(updateRequest);
      });

      expect(returnedUser).toBeNull();
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Current password is incorrect',
        color: 'red',
      });
      expect(result.current.loading).toBe(false);
    });

    it('handles email errors specifically', async () => {
      const mockUpdateProfile = vi.mocked(userApi.updateProfile);
      mockUpdateProfile.mockRejectedValue(new Error('email already exists'));

      const { result } = renderHook(() => useProfileSettings());

      const updateRequest: UpdateProfileRequest = {
        email: 'existing@example.com',
      };

      let returnedUser: User | null = null;
      await act(async () => {
        returnedUser = await result.current.updateProfile(updateRequest);
      });

      expect(returnedUser).toBeNull();
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Email is already in use',
        color: 'red',
      });
    });

    it('handles generic update errors', async () => {
      const mockUpdateProfile = vi.mocked(userApi.updateProfile);
      mockUpdateProfile.mockRejectedValue(new Error('Server error'));

      const { result } = renderHook(() => useProfileSettings());

      const updateRequest: UpdateProfileRequest = {
        displayName: 'Test Name',
      };

      let returnedUser: User | null = null;
      await act(async () => {
        returnedUser = await result.current.updateProfile(updateRequest);
      });

      expect(returnedUser).toBeNull();
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to update profile',
        color: 'red',
      });
    });

    it('handles non-Error rejection', async () => {
      const mockUpdateProfile = vi.mocked(userApi.updateProfile);
      mockUpdateProfile.mockRejectedValue('String error');

      const { result } = renderHook(() => useProfileSettings());

      let returnedUser: User | null = null;
      await act(async () => {
        returnedUser = await result.current.updateProfile({
          displayName: 'Test',
        });
      });

      expect(returnedUser).toBeNull();
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to update profile',
        color: 'red',
      });
    });
  });

  describe('deleteAccount', () => {
    it('deletes account successfully', async () => {
      const mockDeleteUser = vi.mocked(userApi.deleteUser);
      mockDeleteUser.mockResolvedValue(undefined);

      const { result } = renderHook(() => useProfileSettings());

      let deleteResult: boolean | undefined;
      await act(async () => {
        deleteResult = await result.current.deleteAccount('password123');
      });

      expect(deleteResult).toBe(true);
      expect(mockDeleteUser).toHaveBeenCalledWith('password123');
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Success',
        message: 'Account deleted successfully',
        color: 'green',
      });
      expect(result.current.loading).toBe(false);
    });

    it('shows loading state during deletion', async () => {
      const mockDeleteUser = vi.mocked(userApi.deleteUser);
      let resolveDelete: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });
      mockDeleteUser.mockReturnValue(deletePromise);

      const { result } = renderHook(() => useProfileSettings());

      // Start deletion
      act(() => {
        void result.current.deleteAccount('password123');
      });

      // Should be loading
      expect(result.current.loading).toBe(true);

      // Resolve the promise
      await act(async () => {
        if (resolveDelete) resolveDelete();
        await deletePromise;
      });

      // Should no longer be loading
      expect(result.current.loading).toBe(false);
    });

    it('handles delete errors with error message', async () => {
      const mockDeleteUser = vi.mocked(userApi.deleteUser);
      mockDeleteUser.mockRejectedValue(new Error('Invalid password'));

      const { result } = renderHook(() => useProfileSettings());

      let deleteResult: boolean | undefined;
      await act(async () => {
        deleteResult = await result.current.deleteAccount('wrongpass');
      });

      expect(deleteResult).toBe(false);
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Invalid password',
        color: 'red',
      });
      expect(result.current.loading).toBe(false);
    });

    it('handles generic delete errors', async () => {
      const mockDeleteUser = vi.mocked(userApi.deleteUser);
      mockDeleteUser.mockRejectedValue(new Error('Server error'));

      const { result } = renderHook(() => useProfileSettings());

      let deleteResult: boolean | undefined;
      await act(async () => {
        deleteResult = await result.current.deleteAccount('password123');
      });

      expect(deleteResult).toBe(false);
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Server error',
        color: 'red',
      });
    });

    it('handles non-Error rejection in delete', async () => {
      const mockDeleteUser = vi.mocked(userApi.deleteUser);
      mockDeleteUser.mockRejectedValue('String error');

      const { result } = renderHook(() => useProfileSettings());

      let deleteResult: boolean | undefined;
      await act(async () => {
        deleteResult = await result.current.deleteAccount('password123');
      });

      expect(deleteResult).toBe(false);
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to delete account',
        color: 'red',
      });
    });

    it('handles empty password', async () => {
      const mockDeleteUser = vi.mocked(userApi.deleteUser);
      mockDeleteUser.mockResolvedValue(undefined);

      const { result } = renderHook(() => useProfileSettings());

      let deleteResult: boolean | undefined;
      await act(async () => {
        deleteResult = await result.current.deleteAccount('');
      });

      expect(deleteResult).toBe(true);
      expect(mockDeleteUser).toHaveBeenCalledWith('');
    });
  });

  describe('concurrent operations', () => {
    it('handles concurrent profile updates', async () => {
      const mockUpdateProfile = vi.mocked(userApi.updateProfile);
      mockUpdateProfile
        .mockResolvedValueOnce({ ...mockUser, displayName: 'Name 1' })
        .mockResolvedValueOnce({ ...mockUser, displayName: 'Name 2' });

      const { result } = renderHook(() => useProfileSettings());

      let results: (User | null)[] = [];
      await act(async () => {
        const promises = [
          result.current.updateProfile({ displayName: 'Name 1' }),
          result.current.updateProfile({ displayName: 'Name 2' }),
        ];
        results = await Promise.all(promises);
      });

      expect(results).toHaveLength(2);
      expect(results[0]?.displayName).toBe('Name 1');
      expect(results[1]?.displayName).toBe('Name 2');
      expect(mockUpdateProfile).toHaveBeenCalledTimes(2);
    });

    it('handles update followed by delete', async () => {
      const mockUpdateProfile = vi.mocked(userApi.updateProfile);
      const mockDeleteUser = vi.mocked(userApi.deleteUser);

      mockUpdateProfile.mockResolvedValue(mockUser);
      mockDeleteUser.mockResolvedValue(undefined);

      const { result } = renderHook(() => useProfileSettings());

      let updateResult: User | null = null;
      let deleteResult: boolean | undefined;

      await act(async () => {
        updateResult = await result.current.updateProfile({
          displayName: 'Updated',
        });
      });

      await act(async () => {
        deleteResult = await result.current.deleteAccount('password123');
      });

      expect(updateResult).toEqual(mockUser);
      expect(deleteResult).toBe(true);
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        displayName: 'Updated',
      });
      expect(mockDeleteUser).toHaveBeenCalledWith('password123');
    });
  });

  describe('hook interface', () => {
    it('returns correct interface', () => {
      const { result } = renderHook(() => useProfileSettings());

      expect(typeof result.current.loading).toBe('boolean');
      expect(typeof result.current.updateProfile).toBe('function');
      expect(typeof result.current.deleteAccount).toBe('function');
    });

    it('functions are stable across re-renders', () => {
      const { result, rerender } = renderHook(() => useProfileSettings());

      const initialFunctions = {
        updateProfile: result.current.updateProfile,
        deleteAccount: result.current.deleteAccount,
      };

      rerender();

      expect(result.current.updateProfile).toBe(initialFunctions.updateProfile);
      expect(result.current.deleteAccount).toBe(initialFunctions.deleteAccount);
    });
  });

  describe('edge cases', () => {
    it('handles empty update request', async () => {
      const mockUpdateProfile = vi.mocked(userApi.updateProfile);
      mockUpdateProfile.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useProfileSettings());

      let returnedUser: User | null = null;
      await act(async () => {
        returnedUser = await result.current.updateProfile({});
      });

      expect(returnedUser).toEqual(mockUser);
      expect(mockUpdateProfile).toHaveBeenCalledWith({});
    });
  });
});
