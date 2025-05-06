import { useCallback } from 'react';
import { getLastOpenedFile, updateLastOpenedFile } from '../api/git';
import { useWorkspace } from '../contexts/WorkspaceContext';

export const useLastOpenedFile = () => {
  const { currentWorkspace } = useWorkspace();

  const loadLastOpenedFile = useCallback(async () => {
    if (!currentWorkspace) return null;

    try {
      const response = await getLastOpenedFile(currentWorkspace.name);
      return response.lastOpenedFilePath || null;
    } catch (error) {
      console.error('Failed to load last opened file:', error);
      return null;
    }
  }, [currentWorkspace]);

  const saveLastOpenedFile = useCallback(
    async (filePath) => {
      if (!currentWorkspace) return;

      try {
        await updateLastOpenedFile(currentWorkspace.name, filePath);
      } catch (error) {
        console.error('Failed to save last opened file:', error);
      }
    },
    [currentWorkspace]
  );

  return {
    loadLastOpenedFile,
    saveLastOpenedFile,
  };
};
