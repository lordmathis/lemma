import React from 'react';
import { Button, Tooltip, ButtonGroup, Spacer } from '@geist-ui/core';
import { Plus, Trash, GitPullRequest, GitCommit } from '@geist-ui/icons';
import { useSettings } from '../contexts/SettingsContext';
import { useModalContext } from '../contexts/ModalContext';

const FileActions = ({ handlePullChanges, selectedFile }) => {
  const { settings } = useSettings();
  const {
    setNewFileModalVisible,
    setDeleteFileModalVisible,
    setCommitMessageModalVisible,
  } = useModalContext();

  const handleCreateFile = () => setNewFileModalVisible(true);
  const handleDeleteFile = () => setDeleteFileModalVisible(true);
  const handleCommitAndPush = () => setCommitMessageModalVisible(true);

  return (
    <ButtonGroup className="file-actions">
      <Tooltip text="Create new file" type="dark">
        <Button
          icon={<Plus />}
          auto
          scale={2 / 3}
          onClick={handleCreateFile}
          px={0.6}
        />
      </Tooltip>
      <Spacer w={0.5} />
      <Tooltip
        text={selectedFile ? 'Delete current file' : 'No file selected'}
        type="dark"
      >
        <Button
          icon={<Trash />}
          auto
          scale={2 / 3}
          onClick={handleDeleteFile}
          disabled={!selectedFile}
          type="error"
          px={0.6}
        />
      </Tooltip>
      <Spacer w={0.5} />
      <Tooltip
        text={
          settings.gitEnabled
            ? 'Pull changes from remote'
            : 'Git is not enabled'
        }
        type="dark"
      >
        <Button
          icon={<GitPullRequest />}
          auto
          scale={2 / 3}
          onClick={handlePullChanges}
          disabled={!settings.gitEnabled}
          px={0.6}
        />
      </Tooltip>
      <Spacer w={0.5} />
      <Tooltip
        text={
          !settings.gitEnabled
            ? 'Git is not enabled'
            : settings.gitAutoCommit
            ? 'Auto-commit is enabled'
            : 'Commit and push changes'
        }
        type="dark"
      >
        <Button
          icon={<GitCommit />}
          auto
          scale={2 / 3}
          onClick={handleCommitAndPush}
          disabled={!settings.gitEnabled || settings.gitAutoCommit}
          px={0.6}
        />
      </Tooltip>
    </ButtonGroup>
  );
};

export default FileActions;
