import { useCallback } from 'react';
import { saveFileContent, deleteFile } from '../services/api';

export const useFileOperations = (setHasUnsavedChanges) => {
  const handleSave = useCallback(
    async (filePath, content) => {
      try {
        await saveFileContent(filePath, content);
        setHasUnsavedChanges(false);
        console.log('File saved successfully');
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
      console.log('File deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }, []);

  const handleCreateNewFile = useCallback(
    async (fileName, initialContent = '') => {
      try {
        await saveFileContent(fileName, initialContent);
        console.log('New file created successfully');
        return true;
      } catch (error) {
        console.error('Error creating new file:', error);
        return false;
      }
    },
    []
  );

  return { handleSave, handleDelete, handleCreateNewFile };
};
