import React, { useRef } from 'react';
import { ActionIcon, Tooltip, Group } from '@mantine/core';
import {
  IconPlus,
  IconTrash,
  IconGitPullRequest,
  IconGitCommit,
  IconUpload,
} from '@tabler/icons-react';
import { useModalContext } from '../../contexts/ModalContext';
import { useWorkspace } from '../../hooks/useWorkspace';
import { useFileOperations } from '../../hooks/useFileOperations';

interface FileActionsProps {
  handlePullChanges: () => Promise<boolean>;
  selectedFile: string | null;
  loadFileList: () => Promise<void>;
}

const FileActions: React.FC<FileActionsProps> = ({
  handlePullChanges,
  selectedFile,
  loadFileList,
}) => {
  const { currentWorkspace } = useWorkspace();
  const {
    setNewFileModalVisible,
    setDeleteFileModalVisible,
    setCommitMessageModalVisible,
  } = useModalContext();

  const { handleUpload } = useFileOperations();

  // Hidden file input for upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateFile = (): void => setNewFileModalVisible(true);
  const handleDeleteFile = (): void => setDeleteFileModalVisible(true);
  const handleCommitAndPush = (): void => setCommitMessageModalVisible(true);

  const handleUploadClick = (): void => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const uploadFiles = async () => {
        try {
          const success = await handleUpload(files);
          if (success) {
            await loadFileList();
          }
        } catch (error) {
          console.error('Error uploading files:', error);
        }
      };

      void uploadFiles();

      // Reset the input so the same file can be selected again
      event.target.value = '';
    }
  };

  return (
    <Group gap="xs">
      <Tooltip label="Create new file">
        <ActionIcon
          variant="default"
          size="md"
          onClick={handleCreateFile}
          aria-label="Create new file"
          data-testid="create-file-button"
        >
          <IconPlus size={16} />
        </ActionIcon>
      </Tooltip>

      <Tooltip label="Upload files">
        <ActionIcon
          variant="default"
          size="md"
          onClick={handleUploadClick}
          aria-label="Upload files"
          data-testid="upload-files-button"
        >
          <IconUpload size={16} />
        </ActionIcon>
      </Tooltip>

      <Tooltip
        label={selectedFile ? 'Delete current file' : 'No file selected'}
      >
        <ActionIcon
          variant="default"
          size="md"
          onClick={handleDeleteFile}
          disabled={!selectedFile}
          color="red"
          aria-label="Delete current file"
          data-testid="delete-file-button"
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Tooltip>

      <Tooltip
        label={
          currentWorkspace?.gitEnabled
            ? 'Pull changes from remote'
            : 'Git is not enabled'
        }
      >
        <ActionIcon
          variant="default"
          size="md"
          onClick={() => {
            handlePullChanges().catch((error) => {
              console.error('Error pulling changes:', error);
            });
          }}
          disabled={!currentWorkspace?.gitEnabled}
          aria-label="Pull changes from remote"
          data-testid="pull-changes-button"
        >
          <IconGitPullRequest size={16} />
        </ActionIcon>
      </Tooltip>

      <Tooltip
        label={
          !currentWorkspace?.gitEnabled
            ? 'Git is not enabled'
            : currentWorkspace.gitAutoCommit
            ? 'Auto-commit is enabled'
            : 'Commit and push changes'
        }
      >
        <ActionIcon
          variant="default"
          size="md"
          onClick={handleCommitAndPush}
          disabled={
            !currentWorkspace?.gitEnabled || currentWorkspace.gitAutoCommit
          }
          aria-label="Commit and push changes"
          data-testid="commit-push-button"
        >
          <IconGitCommit size={16} />
        </ActionIcon>
      </Tooltip>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
        multiple
        aria-label="File upload input"
      />
    </Group>
  );
};

export default FileActions;
