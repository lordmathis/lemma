import React from 'react';
import { ActionIcon, Tooltip, Group } from '@mantine/core';
import {
  IconPlus,
  IconTrash,
  IconGitPullRequest,
  IconGitCommit,
} from '@tabler/icons-react';
import { useModalContext } from '../../contexts/ModalContext';
import { useWorkspace } from '../../hooks/useWorkspace';

interface FileActionsProps {
  handlePullChanges: () => Promise<boolean>;
  selectedFile: string | null;
}

const FileActions: React.FC<FileActionsProps> = ({
  handlePullChanges,
  selectedFile,
}) => {
  const { settings } = useWorkspace();
  const {
    setNewFileModalVisible,
    setDeleteFileModalVisible,
    setCommitMessageModalVisible,
  } = useModalContext();

  const handleCreateFile = (): void => setNewFileModalVisible(true);
  const handleDeleteFile = (): void => setDeleteFileModalVisible(true);
  const handleCommitAndPush = (): void => setCommitMessageModalVisible(true);

  return (
    <Group gap="xs">
      <Tooltip label="Create new file">
        <ActionIcon variant="default" size="md" onClick={handleCreateFile}>
          <IconPlus size={16} />
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
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Tooltip>

      <Tooltip
        label={
          settings.gitEnabled
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
          disabled={!settings.gitEnabled}
        >
          <IconGitPullRequest size={16} />
        </ActionIcon>
      </Tooltip>

      <Tooltip
        label={
          !settings.gitEnabled
            ? 'Git is not enabled'
            : settings.gitAutoCommit
            ? 'Auto-commit is enabled'
            : 'Commit and push changes'
        }
      >
        <ActionIcon
          variant="default"
          size="md"
          onClick={handleCommitAndPush}
          disabled={!settings.gitEnabled || settings.gitAutoCommit}
        >
          <IconGitCommit size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
};

export default FileActions;
