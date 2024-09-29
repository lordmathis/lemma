import React from 'react';
import { Tree, Button, Tooltip, Spacer, ButtonGroup } from '@geist-ui/core';
import {
  File,
  Folder,
  GitPullRequest,
  GitCommit,
  Plus,
  Trash,
  Image,
} from '@geist-ui/icons';

const FileTree = ({
  files = [],
  onFileSelect = () => {},
  selectedFile = null,
  gitEnabled = false,
  gitAutoCommit = false,
  onPull = () => {},
  onCommitAndPush = () => {},
  onCreateFile = () => {},
  onDeleteFile = () => {},
}) => {
  if (files.length === 0) {
    return <div>No files to display</div>;
  }

  const handleSelect = (filePath) => {
    onFileSelect(filePath);
  };

  const renderLabel = (node) => {
    const path = node.extra;
    return (
      <span style={{ color: path === selectedFile ? '#0070f3' : 'inherit' }}>
        {node.name}
      </span>
    );
  };

  const isImageFile = (fileName) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    return imageExtensions.some((ext) => fileName.toLowerCase().endsWith(ext));
  };

  const renderIcon = ({ type, name }) => {
    if (type === 'directory') return <Folder />;
    return isImageFile(name) ? <Image /> : <File />;
  };

  return (
    <div>
      <ButtonGroup className="file-tree-buttons">
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
      <Tree
        value={files}
        onClick={handleSelect}
        renderIcon={renderIcon}
        renderLabel={renderLabel}
      />
    </div>
  );
};

export default FileTree;
