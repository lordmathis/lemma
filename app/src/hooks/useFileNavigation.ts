import { useState, useCallback, useEffect } from 'react';
import { useWorkspaceData } from '../contexts/WorkspaceDataContext';
import { useLastOpenedFile } from './useLastOpenedFile';
import { DEFAULT_FILE } from '@/types/models';

interface UseFileNavigationResult {
  selectedFile: string;
  isNewFile: boolean;
  handleFileSelect: (filePath: string | null) => Promise<void>;
}

export const useFileNavigation = (): UseFileNavigationResult => {
  const [selectedFile, setSelectedFile] = useState<string>(DEFAULT_FILE.path);
  const [isNewFile, setIsNewFile] = useState<boolean>(true);
  const { currentWorkspace } = useWorkspaceData();
  const { loadLastOpenedFile, saveLastOpenedFile } = useLastOpenedFile();

  const handleFileSelect = useCallback(
    async (filePath: string | null): Promise<void> => {
      const newPath = filePath || DEFAULT_FILE.path;
      setSelectedFile(newPath);
      setIsNewFile(!filePath);

      if (filePath) {
        await saveLastOpenedFile(filePath);
      }
    },
    [saveLastOpenedFile]
  );

  // Load last opened file when workspace changes
  useEffect(() => {
    const initializeFile = async (): Promise<void> => {
      setSelectedFile(DEFAULT_FILE.path);
      setIsNewFile(true);

      const lastFile = await loadLastOpenedFile();
      if (lastFile) {
        await handleFileSelect(lastFile);
      } else {
        await handleFileSelect(null);
      }
    };

    if (currentWorkspace) {
      void initializeFile();
    }
  }, [currentWorkspace, loadLastOpenedFile, handleFileSelect]);

  return { selectedFile, isNewFile, handleFileSelect };
};
