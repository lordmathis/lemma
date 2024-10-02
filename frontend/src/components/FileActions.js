import React from 'react';
import { Button, Tooltip, ButtonGroup, Spacer } from '@geist-ui/core';
import { Plus, Trash, GitPullRequest, GitCommit } from '@geist-ui/icons';

const FileActions = ({
  selectedFile,
  gitEnabled,
  gitAutoCommit,
  onPull,
  onCommitAndPush,
  onCreateFile,
  onDeleteFile,
}) => {
  return (
    <ButtonGroup className="file-actions">
      <Tooltip text="Create new file" type="dark">
        <Button
          icon={<Plus />}
          auto
          scale={2 / 3}
          onClick={onCreateFile}
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
          onClick={onDeleteFile}
          disabled={!selectedFile}
          type="error"
          px={0.6}
        />
      </Tooltip>
      <Spacer w={0.5} />
      <Tooltip
        text={gitEnabled ? 'Pull changes from remote' : 'Git is not enabled'}
        type="dark"
      >
        <Button
          icon={<GitPullRequest />}
          auto
          scale={2 / 3}
          onClick={onPull}
          disabled={!gitEnabled}
          px={0.6}
        />
      </Tooltip>
      <Spacer w={0.5} />
      <Tooltip
        text={
          !gitEnabled
            ? 'Git is not enabled'
            : gitAutoCommit
            ? 'Auto-commit is enabled'
            : 'Commit and push changes'
        }
        type="dark"
      >
        <Button
          icon={<GitCommit />}
          auto
          scale={2 / 3}
          onClick={onCommitAndPush}
          disabled={!gitEnabled || gitAutoCommit}
          px={0.6}
        />
      </Tooltip>
    </ButtonGroup>
  );
};

export default FileActions;
