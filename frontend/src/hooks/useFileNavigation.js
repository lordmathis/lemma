// hooks/useFileNavigation.js
import { useCallback } from 'react';
import { useToasts } from '@geist-ui/core';
import { lookupFileByName } from '../services/api';
import { useFileSelection } from '../contexts/FileSelectionContext';

export const useFileNavigation = () => {
  const { setToast } = useToasts();
  const { handleFileSelect } = useFileSelection();

  const handleLinkClick = useCallback(
    async (filename) => {
      try {
        const filePaths = await lookupFileByName(filename);
        if (filePaths.length === 1) {
          handleFileSelect(filePaths[0]);
        } else if (filePaths.length > 1) {
          // Handle multiple file options (you may want to show a modal or dropdown)
          setToast({
            text: 'Multiple files found with the same name. Please specify the full path.',
            type: 'warning',
          });
        } else {
          setToast({ text: `File "${filename}" not found`, type: 'error' });
        }
      } catch (error) {
        console.error('Error looking up file:', error);
        setToast({
          text: 'Failed to lookup file. Please try again.',
          type: 'error',
        });
      }
    },
    [handleFileSelect, setToast]
  );

  return { handleLinkClick };
};
