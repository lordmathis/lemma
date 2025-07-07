import { useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { saveFile, deleteFile } from '../api/file';
import { useWorkspaceData } from '../contexts/WorkspaceDataContext';
import { useGitOperations } from './useGitOperations';
import { FileAction } from '@/types/models';

interface UseFileOperationsResult {
  handleSave: (filePath: string, content: string) => Promise<boolean>;
  handleDelete: (filePath: string) => Promise<boolean>;
  handleCreate: (fileName: string, initialContent?: string) => Promise<boolean>;
  handleUpload: (files: FileList, targetPath?: string) => Promise<boolean>;
  handleMove: (
    dragIds: string[],
    parentId: string | null,
    index: number
  ) => Promise<boolean>;
  handleRename: (oldPath: string, newPath: string) => Promise<boolean>;
}

export const useFileOperations = (): UseFileOperationsResult => {
  const { currentWorkspace, settings } = useWorkspaceData();
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
    [settings, handleCommitAndPush]
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

  // Add these to your hook implementation:
  const handleUpload = useCallback(
    async (files: FileList, targetPath?: string): Promise<boolean> => {
      if (!currentWorkspace) return false;

      try {
        // TODO: Implement your file upload API call
        // Example:
        // const formData = new FormData();
        // Array.from(files).forEach((file, index) => {
        //   formData.append(`file${index}`, file);
        // });
        // if (targetPath) {
        //   formData.append('targetPath', targetPath);
        // }
        // await uploadFiles(currentWorkspace.name, formData);

        notifications.show({
          title: 'Success',
          message: `Successfully uploaded ${files.length} file(s)`,
          color: 'green',
        });

        // Auto-commit if enabled
        await autoCommit('multiple files', FileAction.Create);
        return true;
      } catch (error) {
        console.error('Error uploading files:', error);
        notifications.show({
          title: 'Error',
          message: 'Failed to upload files',
          color: 'red',
        });
        return false;
      }
    },
    [currentWorkspace, autoCommit]
  );

  const handleMove = useCallback(
    async (
      dragIds: string[],
      parentId: string | null,
      index: number
    ): Promise<boolean> => {
      if (!currentWorkspace) return false;

      try {
        // TODO: Implement your file move API call
        // Example:
        // await moveFiles(currentWorkspace.name, {
        //   sourceIds: dragIds,
        //   targetParentId: parentId,
        //   targetIndex: index
        // });

        notifications.show({
          title: 'Success',
          message: `Successfully moved ${dragIds.length} file(s)`,
          color: 'green',
        });

        // Auto-commit if enabled
        await autoCommit('multiple files', FileAction.Update);
        return true;
      } catch (error) {
        console.error('Error moving files:', error);
        notifications.show({
          title: 'Error',
          message: 'Failed to move files',
          color: 'red',
        });
        return false;
      }
    },
    [currentWorkspace, autoCommit]
  );

  const handleRename = useCallback(
    async (oldPath: string, newPath: string): Promise<boolean> => {
      if (!currentWorkspace) return false;

      try {
        // TODO: Replace with your actual rename API call
        // await renameFile(currentWorkspace.name, oldPath, newPath);

        notifications.show({
          title: 'Success',
          message: 'File renamed successfully',
          color: 'green',
        });
        await autoCommit(newPath, FileAction.Update);
        return true;
      } catch (error) {
        console.error('Error renaming file:', error);
        notifications.show({
          title: 'Error',
          message: 'Failed to rename file',
          color: 'red',
        });
        return false;
      }
    },
    [currentWorkspace, autoCommit]
  );

  return {
    handleSave,
    handleDelete,
    handleCreate,
    handleUpload,
    handleMove,
    handleRename,
  };
};
