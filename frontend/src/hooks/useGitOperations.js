import { useCallback } from 'react';
import { pullChanges, commitAndPush } from '../services/api';

export const useGitOperations = (gitEnabled) => {
  const pullLatestChanges = useCallback(async () => {
    if (!gitEnabled) return;
    try {
      await pullChanges();
      return true;
    } catch (error) {
      console.error('Failed to pull latest changes:', error);
      return false;
    }
  }, [gitEnabled]);

  const handleCommitAndPush = useCallback(
    async (message) => {
      if (!gitEnabled) return;
      try {
        await commitAndPush(message);
        return true;
      } catch (error) {
        console.error('Failed to commit and push changes:', error);
        return false;
      }
    },
    [gitEnabled]
  );

  return { pullLatestChanges, handleCommitAndPush };
};
