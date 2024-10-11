import React, { useEffect } from 'react';
import { Box } from '@mantine/core';
import FileActions from './FileActions';
import FileTree from './FileTree';
import { useFileList } from '../hooks/useFileList';
import { useGitOperations } from '../hooks/useGitOperations';
import { useSettings } from '../contexts/SettingsContext';

const Sidebar = ({ selectedFile, handleFileSelect }) => {
  const { settings } = useSettings();
  const { files, loadFileList } = useFileList();
  const { handlePull } = useGitOperations(settings.gitEnabled);

  useEffect(() => {
    loadFileList();
  }, [settings.gitEnabled, loadFileList]);

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
