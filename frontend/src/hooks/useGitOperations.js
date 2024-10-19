import { useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { pullChanges, commitAndPush } from '../services/api';
import { useWorkspace } from '../contexts/WorkspaceContext';

export const useGitOperations = () => {
  const { currentWorkspace, settings } = useWorkspace();

  const handlePull = useCallback(async () => {
    if (!currentWorkspace || !settings.gitEnabled) return false;

    try {
      await pullChanges(currentWorkspace.id);
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
  }, [currentWorkspace, settings.gitEnabled]);

  const handleCommitAndPush = useCallback(
    async (message) => {
      if (!currentWorkspace || !settings.gitEnabled) return false;

      try {
        await commitAndPush(currentWorkspace.id, message);
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
    [currentWorkspace, settings.gitEnabled]
  );

  return { handlePull, handleCommitAndPush };
};
