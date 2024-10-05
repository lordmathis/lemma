import React from 'react';
import { Tree } from '@geist-ui/core';
import { File, Folder, Image } from '@geist-ui/icons';
import { isImageFile } from '../utils/fileHelpers';
import { useFileSelection } from '../contexts/FileSelectionContext';

const FileTree = ({ files }) => {
  const { selectedFile, handleFileSelect } = useFileSelection();

  if (files.length === 0) {
    return <div>No files to display</div>;
  }

  const renderLabel = (node) => {
    const path = node.extra;
    return (
      <span style={{ color: path === selectedFile ? '#0070f3' : 'inherit' }}>
        {node.name}
      </span>
    );
  };

  const renderIcon = ({ type, name }) => {
    if (type === 'directory') return <Folder />;
    return isImageFile(name) ? <Image /> : <File />;
  };

  return (
    <Tree
      value={files}
      onClick={(filePath) => handleFileSelect(filePath)}
      renderIcon={renderIcon}
      renderLabel={renderLabel}
    />
  );
};

export default FileTree;
