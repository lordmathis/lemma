import { useState, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { updateProfile, deleteProfile } from '../api/git';

export function useProfileSettings() {
  const [loading, setLoading] = useState(false);

  const handleProfileUpdate = useCallback(async (updates) => {
    setLoading(true);
    try {
      const updatedUser = await updateProfile(updates);

      notifications.show({
        title: 'Success',
        message: 'Profile updated successfully',
        color: 'green',
      });

      return { success: true, user: updatedUser };
    } catch (error) {
      let errorMessage = 'Failed to update profile';

      if (error.message.includes('password')) {
        errorMessage = 'Current password is incorrect';
      } else if (error.message.includes('email')) {
        errorMessage = 'Email is already in use';
      }

      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
      });

      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAccountDeletion = useCallback(async (password) => {
    setLoading(true);
    try {
      await deleteProfile(password);

      notifications.show({
        title: 'Success',
        message: 'Account deleted successfully',
        color: 'green',
      });

      return { success: true };
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to delete account',
        color: 'red',
      });

      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    updateProfile: handleProfileUpdate,
    deleteAccount: handleAccountDeletion,
  };
}
