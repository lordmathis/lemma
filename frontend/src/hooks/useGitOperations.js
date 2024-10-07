import { useCallback } from 'react';
import { pullChanges, commitAndPush } from '../services/api';

export const useGitOperations = (gitEnabled) => {
  const handlePull = useCallback(async () => {
    if (!gitEnabled) return false;
    try {
      await pullChanges();
      setToast({ text: 'Successfully pulled latest changes', type: 'success' });
      return true;
    } catch (error) {
      console.error('Failed to pull latest changes:', error);
      setToast({ text: 'Failed to pull latest changes', type: 'error' });
      return false;
    }
  }, [gitEnabled]);

  const handleCommitAndPush = useCallback(
    async (message) => {
      if (!gitEnabled) return false;
      try {
        await commitAndPush(message);
        setToast({
          text: 'Successfully committed and pushed changes',
          type: 'success',
        });
        return true;
      } catch (error) {
        console.error('Failed to commit and push changes:', error);
        setToast({ text: 'Failed to commit and push changes', type: 'error' });
        return false;
      }
    },
    [gitEnabled]
  );

  return { handlePull, handleCommitAndPush };
};
