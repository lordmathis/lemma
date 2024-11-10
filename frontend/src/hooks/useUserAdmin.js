import { useAdminData } from './useAdminData';
import { createUser, updateUser, deleteUser } from '../services/adminApi';
import { notifications } from '@mantine/notifications';

export const useUserAdmin = () => {
  const { data: users, loading, error, reload } = useAdminData('users');

  const handleCreate = async (userData) => {
    try {
      await createUser(userData);
      notifications.show({
        title: 'Success',
        message: 'User created successfully',
        color: 'green',
      });
      reload();
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || err.message;
      notifications.show({
        title: 'Error',
        message: `Failed to create user: ${message}`,
        color: 'red',
      });
      return { success: false, error: message };
    }
  };

  const handleUpdate = async (userId, userData) => {
    try {
      await updateUser(userId, userData);
      notifications.show({
        title: 'Success',
        message: 'User updated successfully',
        color: 'green',
      });
      reload();
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || err.message;
      notifications.show({
        title: 'Error',
        message: `Failed to update user: ${message}`,
        color: 'red',
      });
      return { success: false, error: message };
    }
  };

  const handleDelete = async (userId) => {
    try {
      await deleteUser(userId);
      notifications.show({
        title: 'Success',
        message: 'User deleted successfully',
        color: 'green',
      });
      reload();
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.error || err.message;
      notifications.show({
        title: 'Error',
        message: `Failed to delete user: ${message}`,
        color: 'red',
      });
      return { success: false, error: message };
    }
  };

  return {
    users,
    loading,
    error,
    create: handleCreate,
    update: handleUpdate,
    delete: handleDelete,
  };
};
