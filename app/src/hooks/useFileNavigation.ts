import { useState, useCallback, useEffect } from 'react';
import { DEFAULT_FILE } from '../types/file';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useLastOpenedFile } from './useLastOpenedFile';

interface UseFileNavigationResult {
  selectedFile: string;
  isNewFile: boolean;
  handleFileSelect: (filePath: string | null) => Promise<void>;
}

export const useFileNavigation = (): UseFileNavigationResult => {
  const [selectedFile, setSelectedFile] = useState<string>(DEFAULT_FILE.path);
  const [isNewFile, setIsNewFile] = useState<boolean>(true);
  const { currentWorkspace } = useWorkspace();
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
        handleFileSelect(lastFile);
      } else {
        handleFileSelect(null);
      }
    };

    if (currentWorkspace) {
      initializeFile();
    }
  }, [currentWorkspace, loadLastOpenedFile, handleFileSelect]);

  return { selectedFile, isNewFile, handleFileSelect };
};
