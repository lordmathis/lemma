import { useAdminData } from './useAdminData';
import {
  createUser,
  updateUser,
  deleteUser as adminDeleteUser,
} from '../api/admin';
import { notifications } from '@mantine/notifications';
import { useCallback } from 'react';
import type { User } from '@/types/models';
import type { CreateUserRequest, UpdateUserRequest } from '@/types/api';

interface UseUserAdminResult {
  users: User[];
  loading: boolean;
  error: string | null;
  create: (userData: CreateUserRequest) => Promise<boolean>;
  update: (userId: number, userData: UpdateUserRequest) => Promise<boolean>;
  delete: (userId: number) => Promise<boolean>;
}

export const useUserAdmin = (): UseUserAdminResult => {
  const { data: users, loading, error, reload } = useAdminData('users');

  const handleCreate = useCallback(
    async (userData: CreateUserRequest): Promise<boolean> => {
      try {
        await createUser(userData);
        notifications.show({
          title: 'Success',
          message: 'User created successfully',
          color: 'green',
        });
        await reload();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        notifications.show({
          title: 'Error',
          message: `Failed to create user: ${message}`,
          color: 'red',
        });
        return false;
      }
    },
    [reload]
  );

  const handleUpdate = useCallback(
    async (userId: number, userData: UpdateUserRequest): Promise<boolean> => {
      try {
        await updateUser(userId, userData);
        notifications.show({
          title: 'Success',
          message: 'User updated successfully',
          color: 'green',
        });
        await reload();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        notifications.show({
          title: 'Error',
          message: `Failed to update user: ${message}`,
          color: 'red',
        });
        return false;
      }
    },
    [reload]
  );

  const handleDelete = useCallback(
    async (userId: number): Promise<boolean> => {
      try {
        await adminDeleteUser(userId);
        notifications.show({
          title: 'Success',
          message: 'User deleted successfully',
          color: 'green',
        });
        await reload();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        notifications.show({
          title: 'Error',
          message: `Failed to delete user: ${message}`,
          color: 'red',
        });
        return false;
      }
    },
    [reload]
  );

  return {
    users,
    loading,
    error,
    create: handleCreate,
    update: handleUpdate,
    delete: handleDelete,
  };
};
