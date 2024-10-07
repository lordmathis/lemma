import React, { useMemo } from 'react';
import { Tree } from '@geist-ui/core';
import { File, Folder, Image } from '@geist-ui/icons';
import { isImageFile } from '../utils/fileHelpers';

const FileTree = ({ files, handleFileSelect }) => {
  if (files.length === 0) {
    return <div>No files to display</div>;
  }

  const renderIcon = useMemo(
    () =>
      ({ type, name }) => {
        if (type === 'directory') return <Folder />;
        return isImageFile(name) ? <Image /> : <File />;
      },
    []
  );

  return (
    <Tree
      value={files}
      onClick={(filePath) => handleFileSelect(filePath)}
      renderIcon={renderIcon}
    />
  );
};

export default FileTree;
