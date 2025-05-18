import { useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { pullChanges, commitAndPush } from '../api/git';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { CommitHash } from '@/types/git';

interface UseGitOperationsResult {
  handlePull: () => Promise<boolean>;
  handleCommitAndPush: (message: string) => Promise<void>;
}

export const useGitOperations = (): UseGitOperationsResult => {
  const { currentWorkspace, settings } = useWorkspace();

  const handlePull = useCallback(async (): Promise<boolean> => {
    if (!currentWorkspace || !settings.gitEnabled) return false;

    try {
      await pullChanges(currentWorkspace.name);
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
    async (message: string): Promise<void> => {
      if (!currentWorkspace || !settings.gitEnabled) return;

      try {
        const commitHash: CommitHash = await commitAndPush(
          currentWorkspace.name,
          message
        );
        notifications.show({
          title: 'Success',
          message: 'Successfully committed and pushed changes',
          color: 'green',
        });
        return;
      } catch (error) {
        console.error('Failed to commit and push changes:', error);
        notifications.show({
          title: 'Error',
          message: 'Failed to commit and push changes',
          color: 'red',
        });
        return;
      }
    },
    [currentWorkspace, settings.gitEnabled]
  );

  return { handlePull, handleCommitAndPush };
};
