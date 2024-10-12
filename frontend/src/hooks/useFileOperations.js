import { useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { saveFileContent, deleteFile } from '../services/api';

export const useFileOperations = () => {
  const handleSave = useCallback(async (filePath, content) => {
    try {
      await saveFileContent(filePath, content);
      notifications.show({
        title: 'Success',
        message: 'File saved successfully',
        color: 'green',
      });
      return true;
    } catch (error) {
      console.error('Error saving file:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to save file',
        color: 'red',
      });
      return false;
    }
  }, []);

  const handleDelete = useCallback(async (filePath) => {
    try {
      await deleteFile(filePath);
      notifications.show({
        title: 'Success',
        message: 'File deleted successfully',
        color: 'green',
      });
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete file',
        color: 'red',
      });
      return false;
    }
  }, []);

  const handleCreate = useCallback(async (fileName, initialContent = '') => {
    try {
      await saveFileContent(fileName, initialContent);
      notifications.show({
        title: 'Success',
        message: 'File created successfully',
        color: 'green',
      });
      return true;
    } catch (error) {
      console.error('Error creating new file:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to create new file',
        color: 'red',
      });
      return false;
    }
  }, []);

  return { handleSave, handleDelete, handleCreate };
};
