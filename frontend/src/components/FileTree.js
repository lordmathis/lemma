import React from 'react';
import { Tree } from '@geist-ui/core';
import { File, Folder, Image } from '@geist-ui/icons';

const FileTree = ({
  files = [],
  onFileSelect = () => {},
  selectedFile = null,
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
    <Tree
      value={files}
      onClick={handleSelect}
      renderIcon={renderIcon}
      renderLabel={renderLabel}
    />
  );
};

export default FileTree;
