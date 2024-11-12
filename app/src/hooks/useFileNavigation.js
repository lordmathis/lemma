import { useState, useCallback, useEffect } from 'react';
import { DEFAULT_FILE } from '../utils/constants';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useLastOpenedFile } from './useLastOpenedFile';

export const useFileNavigation = () => {
  const [selectedFile, setSelectedFile] = useState(DEFAULT_FILE.path);
  const [isNewFile, setIsNewFile] = useState(true);
  const { currentWorkspace } = useWorkspace();
  const { loadLastOpenedFile, saveLastOpenedFile } = useLastOpenedFile();

  const handleFileSelect = useCallback(
    async (filePath) => {
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
    const initializeFile = async () => {
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
