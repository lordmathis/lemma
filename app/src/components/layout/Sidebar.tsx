import React, { useEffect } from 'react';
import { Box } from '@mantine/core';
import FileActions from '../files/FileActions';
import FileTree from '../files/FileTree';
import { useGitOperations } from '../../hooks/useGitOperations';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { FileNode } from '@/types/fileApi';

interface SidebarProps {
  selectedFile: string | null;
  handleFileSelect: (filePath: string | null) => Promise<void>;
  files: FileNode[];
  loadFileList: () => Promise<void>;
}

const Sidebar: React.FC<SidebarProps> = ({
  selectedFile,
  handleFileSelect,
  files,
  loadFileList,
}) => {
  const { settings } = useWorkspace();
  const { handlePull } = useGitOperations();

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
        showHiddenFiles={settings.showHiddenFiles || false}
      />
    </Box>
  );
};

export default Sidebar;
