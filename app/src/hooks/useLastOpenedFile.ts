import { useCallback } from 'react';
import { getLastOpenedFile, updateLastOpenedFile } from '../api/file';
import { useWorkspaceData } from '../contexts/WorkspaceDataContext';

interface UseLastOpenedFileResult {
  loadLastOpenedFile: () => Promise<string | null>;
  saveLastOpenedFile: (filePath: string) => Promise<void>;
}

export const useLastOpenedFile = (): UseLastOpenedFileResult => {
  const { currentWorkspace } = useWorkspaceData();

  const loadLastOpenedFile = useCallback(async (): Promise<string | null> => {
    if (!currentWorkspace) return null;

    try {
      const response: string = await getLastOpenedFile(currentWorkspace.name);
      return response || null;
    } catch (error) {
      console.error('Failed to load last opened file:', error);
      return null;
    }
  }, [currentWorkspace]);

  const saveLastOpenedFile = useCallback(
    async (filePath: string): Promise<void> => {
      if (!currentWorkspace || !filePath.trim()) return;

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
