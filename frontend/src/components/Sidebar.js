import React, { useEffect } from 'react';
import { Box } from '@mantine/core';
import FileActions from './FileActions';
import FileTree from './FileTree';
import { useGitOperations } from '../hooks/useGitOperations';
import { useWorkspace } from '../contexts/WorkspaceContext';

const Sidebar = ({ selectedFile, handleFileSelect, files, loadFileList }) => {
  const { settings } = useWorkspace();
  const { handlePull } = useGitOperations(settings.gitEnabled);

  useEffect(() => {
    loadFileList();
  }, [loadFileList]);

  return (
    <Box
      style={{
        width: '25%',
        minWidth: '200px',
        maxWidth: '300px',
        borderRight: '1px solid var(--app-shell-border-color)',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <FileActions handlePullChanges={handlePull} selectedFile={selectedFile} />
      <FileTree
        files={files}
        handleFileSelect={handleFileSelect}
        selectedFile={selectedFile}
      />
    </Box>
  );
};

export default Sidebar;
