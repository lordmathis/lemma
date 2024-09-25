import React from 'react';
import { Tree } from '@geist-ui/core';
import { File, Folder } from '@geist-ui/icons';

const FileTree = ({ 
  files = [], 
  onFileSelect = () => {}, 
  selectedFile = null 
}) => {
  if (files.length === 0) {
    return <div>No files to display</div>;
  }

  const handleSelect = (filePath) => {
      onFileSelect(filePath);
  };

  const renderLabel = (node) => {
    const path = getFilePath(node);
    return (
      <span style={{ color: path === selectedFile ? '#0070f3' : 'inherit' }}>
        {node.name}
      </span>
    );
  };

  const renderIcon = ({ type }) => type === 'directory' ? <Folder /> : <File />;

  return (
    <Tree
      value={files}
      onClick={handleSelect}
      renderIcon={renderIcon}
      renderLabel={renderLabel}
    />
  );
};

export default FileTree;