import { useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { saveFile, deleteFile } from '../api/file';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useGitOperations } from './useGitOperations';
import { FileAction } from '../types/file';

interface UseFileOperationsResult {
  handleSave: (filePath: string, content: string) => Promise<boolean>;
  handleDelete: (filePath: string) => Promise<boolean>;
  handleCreate: (fileName: string, initialContent?: string) => Promise<boolean>;
}

export const useFileOperations = (): UseFileOperationsResult => {
  const { currentWorkspace, settings } = useWorkspace();
  const { handleCommitAndPush } = useGitOperations();

  const autoCommit = useCallback(
    async (filePath: string, action: FileAction): Promise<void> => {
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
    async (filePath: string, content: string): Promise<boolean> => {
      if (!currentWorkspace) return false;

      try {
        await saveFile(currentWorkspace.name, filePath, content);
        notifications.show({
          title: 'Success',
          message: 'File saved successfully',
          color: 'green',
        });
        await autoCommit(filePath, FileAction.Update);
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
    async (filePath: string): Promise<boolean> => {
      if (!currentWorkspace) return false;

      try {
        await deleteFile(currentWorkspace.name, filePath);
        notifications.show({
          title: 'Success',
          message: 'File deleted successfully',
          color: 'green',
        });
        await autoCommit(filePath, FileAction.Delete);
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
    async (fileName: string, initialContent: string = ''): Promise<boolean> => {
      if (!currentWorkspace) return false;

      try {
        await saveFile(currentWorkspace.name, fileName, initialContent);
        notifications.show({
          title: 'Success',
          message: 'File created successfully',
          color: 'green',
        });
        await autoCommit(fileName, FileAction.Create);
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
