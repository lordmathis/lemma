import { useState, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { lookupFileByName } from '../services/api';
import { DEFAULT_FILE } from '../utils/constants';

export const useFileNavigation = () => {
  const [selectedFile, setSelectedFile] = useState(DEFAULT_FILE.path);
  const [isNewFile, setIsNewFile] = useState(true);

  const handleFileSelect = useCallback((filePath) => {
    setSelectedFile(filePath);
    setIsNewFile(filePath === DEFAULT_FILE.path);
  }, []);

  const handleLinkClick = useCallback(
    async (filename) => {
      try {
        const filePaths = await lookupFileByName(filename);
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
    [handleFileSelect]
  );

  return { handleLinkClick, selectedFile, isNewFile, handleFileSelect };
};
