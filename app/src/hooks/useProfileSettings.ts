import { useState, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { updateProfile, deleteUser } from '../api/user';
import type { User } from '../types/authApi';
import type { UpdateProfileRequest } from '../types/userApi';

interface UseProfileSettingsResult {
  loading: boolean;
  updateProfile: (updates: UpdateProfileRequest) => Promise<User | null>;
  deleteAccount: (password: string) => Promise<boolean>;
}

export function useProfileSettings(): UseProfileSettingsResult {
  const [loading, setLoading] = useState<boolean>(false);

  const handleProfileUpdate = useCallback(
    async (updates: UpdateProfileRequest): Promise<User | null> => {
      setLoading(true);
      try {
        const updatedUser = await updateProfile(updates);

        notifications.show({
          title: 'Success',
          message: 'Profile updated successfully',
          color: 'green',
        });

        return updatedUser;
      } catch (error) {
        let errorMessage = 'Failed to update profile';

        if (error instanceof Error) {
          if (error.message.includes('password')) {
            errorMessage = 'Current password is incorrect';
          } else if (error.message.includes('email')) {
            errorMessage = 'Email is already in use';
          }
        }

        notifications.show({
          title: 'Error',
          message: errorMessage,
          color: 'red',
        });

        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleAccountDeletion = useCallback(
    async (password: string): Promise<boolean> => {
      setLoading(true);
      try {
        await deleteUser(password);

        notifications.show({
          title: 'Success',
          message: 'Account deleted successfully',
          color: 'green',
        });

        return true;
      } catch (error) {
        notifications.show({
          title: 'Error',
          message:
            error instanceof Error ? error.message : 'Failed to delete account',
          color: 'red',
        });

        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    updateProfile: handleProfileUpdate,
    deleteAccount: handleAccountDeletion,
  };
}
