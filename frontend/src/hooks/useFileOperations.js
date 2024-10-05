import { useCallback } from 'react';
import { saveFileContent, deleteFile } from '../services/api';
import { useToasts } from '@geist-ui/core';

export const useFileOperations = (setHasUnsavedChanges) => {
  const { setToast } = useToasts();

  const handleSave = useCallback(
    async (filePath, content) => {
      try {
        await saveFileContent(filePath, content);
        setHasUnsavedChanges(false);
        setToast({ text: 'File saved successfully', type: 'success' });
        return true;
      } catch (error) {
        console.error('Error saving file:', error);
        return false;
      }
    },
    [setHasUnsavedChanges]
  );

  const handleDelete = useCallback(async (filePath) => {
    try {
      await deleteFile(filePath);
      setToast({ text: 'File deleted successfully', type: 'success' });
      return true;
    } catch (error) {
      setToast({ text: `Error deleting file`, type: 'error' });
      console.error('Error deleting file:', error);
      return false;
    }
  }, []);

  const handleCreate = useCallback(async (fileName, initialContent = '') => {
    try {
      await saveFileContent(fileName, initialContent);
      return true;
    } catch (error) {
      setToast({ text: `Error creating new file`, type: 'error' });
      console.error('Error creating new file:', error);
      return false;
    }
  }, []);

  return { handleSave, handleDelete, handleCreate };
};
