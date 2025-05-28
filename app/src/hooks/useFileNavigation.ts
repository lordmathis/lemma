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
      // Consider empty string as null
      const effectiveFilePath = filePath === '' ? null : filePath;

      if (effectiveFilePath) {
        setSelectedFile(effectiveFilePath);
        setIsNewFile(false);

        try {
          // Try to save the last opened file
          await saveLastOpenedFile(effectiveFilePath);
        } catch (err) {
          // Silently handle the error so state still updates
          console.error('Failed to save last opened file:', err);
        }
      } else if (selectedFile === DEFAULT_FILE.path || filePath === null) {
        setSelectedFile(DEFAULT_FILE.path);
        setIsNewFile(true);
      }
    },
    [saveLastOpenedFile, selectedFile]
  );

  // Load last opened file when workspace changes
  useEffect(() => {
    const initializeFile = async (): Promise<void> => {
      try {
        setSelectedFile(DEFAULT_FILE.path);
        setIsNewFile(true);

        const lastFile = await loadLastOpenedFile();

        if (lastFile) {
          setSelectedFile(lastFile);
          setIsNewFile(false);
        }
      } catch (err) {
        console.error('Failed to load last opened file:', err);
        setSelectedFile(DEFAULT_FILE.path);
        setIsNewFile(true);
      }
    };

    if (currentWorkspace) {
      void initializeFile();
    } else {
      setSelectedFile(DEFAULT_FILE.path);
      setIsNewFile(true);
    }
  }, [currentWorkspace, loadLastOpenedFile, saveLastOpenedFile]);

  return { selectedFile, isNewFile, handleFileSelect };
};
