import { useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { pullChanges, commitAndPush } from '../services/api';

export const useGitOperations = (gitEnabled) => {
  const handlePull = useCallback(async () => {
    if (!gitEnabled) return false;
    try {
      await pullChanges();
      notifications.show({
        title: 'Success',
        message: 'Successfully pulled latest changes',
        color: 'green',
      });
      return true;
    } catch (error) {
      console.error('Failed to pull latest changes:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to pull latest changes',
        color: 'red',
      });
      return false;
    }
  }, [gitEnabled]);

  const handleCommitAndPush = useCallback(
    async (message) => {
      if (!gitEnabled) return false;
      try {
        await commitAndPush(message);
        notifications.show({
          title: 'Success',
          message: 'Successfully committed and pushed changes',
          color: 'green',
        });
        return true;
      } catch (error) {
        console.error('Failed to commit and push changes:', error);
        notifications.show({
          title: 'Error',
          message: 'Failed to commit and push changes',
          color: 'red',
        });
        return false;
      }
    },
    [gitEnabled]
  );

  return { handlePull, handleCommitAndPush };
};
