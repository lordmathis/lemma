import { useState, useCallback, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { lookupFileByName } from '../services/api';
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

  const handleLinkClick = useCallback(
    async (filename) => {
      if (!currentWorkspace) return;

      try {
        const filePaths = await lookupFileByName(currentWorkspace.id, filename);
        if (filePaths.length >= 1) {
          handleFileSelect(filePaths[0]);
        } else {
          notifications.show({
            title: 'File Not Found',
            message: `File "${filename}" not found`,
            color: 'red',
          });
        }
      } catch (error) {
        console.error('Error looking up file:', error);
        notifications.show({
          title: 'Error',
          message: 'Failed to lookup file.',
          color: 'red',
        });
      }
    },
    [currentWorkspace, handleFileSelect]
  );

  // Load last opened file when workspace changes
  useEffect(() => {
    const initializeFile = async () => {
      const lastFile = await loadLastOpenedFile();
      if (lastFile) {
        handleFileSelect(lastFile);
      } else {
        handleFileSelect(null);
      }
    };

    initializeFile();
  }, [currentWorkspace, loadLastOpenedFile, handleFileSelect]);

  return { handleLinkClick, selectedFile, isNewFile, handleFileSelect };
};
