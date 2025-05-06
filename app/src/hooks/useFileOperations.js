import { useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { saveFileContent, deleteFile } from '../api/git';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useGitOperations } from './useGitOperations';

export const useFileOperations = () => {
  const { currentWorkspace, settings } = useWorkspace();
  const { handleCommitAndPush } = useGitOperations();

  const autoCommit = useCallback(
    async (filePath, action) => {
      if (settings.gitAutoCommit && settings.gitEnabled) {
        let commitMessage = settings.gitCommitMsgTemplate
          .replace('${filename}', filePath)
          .replace('${action}', action);

        commitMessage =
          commitMessage.charAt(0).toUpperCase() + commitMessage.slice(1);

        await handleCommitAndPush(commitMessage);
      }
    },
    [settings]
  );

  const handleSave = useCallback(
    async (filePath, content) => {
      if (!currentWorkspace) return false;

      try {
        await saveFileContent(currentWorkspace.name, filePath, content);
        notifications.show({
          title: 'Success',
          message: 'File saved successfully',
          color: 'green',
        });
        autoCommit(filePath, 'update');
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
    },
    [currentWorkspace, autoCommit]
  );

  const handleDelete = useCallback(
    async (filePath) => {
      if (!currentWorkspace) return false;

      try {
        await deleteFile(currentWorkspace.name, filePath);
        notifications.show({
          title: 'Success',
          message: 'File deleted successfully',
          color: 'green',
        });
        autoCommit(filePath, 'delete');
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
    },
    [currentWorkspace, autoCommit]
  );

  const handleCreate = useCallback(
    async (fileName, initialContent = '') => {
      if (!currentWorkspace) return false;

      try {
        await saveFileContent(currentWorkspace.name, fileName, initialContent);
        notifications.show({
          title: 'Success',
          message: 'File created successfully',
          color: 'green',
        });
        autoCommit(fileName, 'create');
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
    },
    [currentWorkspace, autoCommit]
  );

  return { handleSave, handleDelete, handleCreate };
};
