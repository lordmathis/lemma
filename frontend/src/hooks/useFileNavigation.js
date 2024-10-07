import { useState, useCallback } from 'react';
import { useToasts } from '@geist-ui/core';
import { lookupFileByName } from '../services/api';
import { DEFAULT_FILE } from '../utils/constants';

export const useFileNavigation = () => {
  const { setToast } = useToasts();

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
          setToast({ text: `File "${filename}" not found`, type: 'error' });
        }
      } catch (error) {
        console.error('Error looking up file:', error);
        setToast({
          text: 'Failed to lookup file.',
          type: 'error',
        });
      }
    },
    [handleFileSelect, setToast]
  );

  return { handleLinkClick, selectedFile, isNewFile, handleFileSelect };
};
