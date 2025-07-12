import { useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { saveFile, deleteFile, uploadFile, moveFile } from '../api/file';
import { useWorkspaceData } from '../contexts/WorkspaceDataContext';
import { useGitOperations } from './useGitOperations';
import { FileAction } from '@/types/models';

interface UseFileOperationsResult {
  handleSave: (filePath: string, content: string) => Promise<boolean>;
  handleDelete: (filePath: string) => Promise<boolean>;
  handleCreate: (fileName: string, initialContent?: string) => Promise<boolean>;
  handleUpload: (files: FileList, targetPath?: string) => Promise<boolean>;
  handleMove: (
    filePaths: string[],
    destinationParentPath: string,
    index?: number
  ) => Promise<boolean>;
  handleRename: (oldPath: string, newPath: string) => Promise<boolean>;
}

export const useFileOperations = (): UseFileOperationsResult => {
  const { currentWorkspace } = useWorkspaceData();
  const { handleCommitAndPush } = useGitOperations();

  const autoCommit = useCallback(
    async (filePath: string, action: FileAction): Promise<void> => {
      if (!currentWorkspace || !currentWorkspace.gitEnabled) return;
      if (currentWorkspace.gitAutoCommit && currentWorkspace.gitEnabled) {
        let commitMessage = currentWorkspace.gitCommitMsgTemplate
          .replace('${filename}', filePath)
          .replace('${action}', action);

        commitMessage =
          commitMessage.charAt(0).toUpperCase() + commitMessage.slice(1);

        await handleCommitAndPush(commitMessage);
      }
    },
    [currentWorkspace, handleCommitAndPush]
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

  const handleUpload = useCallback(
    async (files: FileList, targetPath?: string): Promise<boolean> => {
      if (!currentWorkspace) return false;

      try {
        // Use unified upload API that handles both single and multiple files
        await uploadFile(currentWorkspace.name, targetPath || '', files);

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
      filePaths: string[],
      destinationParentPath: string,
      _index?: number
    ): Promise<boolean> => {
      if (!currentWorkspace) return false;

      try {
        // Move each file to the destination directory
        const movePromises = filePaths.map(async (filePath) => {
          // Extract the filename from the path
          const fileName = filePath.split('/').pop() || '';

          // Construct the destination path
          const destinationPath = destinationParentPath
            ? `${destinationParentPath}/${fileName}`
            : fileName;

          // Call the API to move the file
          await moveFile(currentWorkspace.name, filePath, destinationPath);
        });

        await Promise.all(movePromises);

        notifications.show({
          title: 'Success',
          message: `Successfully moved ${filePaths.length} file(s)`,
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
        // Use moveFile API for renaming (rename is essentially a move operation)
        await moveFile(currentWorkspace.name, oldPath, newPath);

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
