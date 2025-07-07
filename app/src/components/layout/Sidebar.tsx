import React, { useEffect } from 'react';
import { Box } from '@mantine/core';
import FileActions from '../files/FileActions';
import FileTree from '../files/FileTree';
import { useGitOperations } from '../../hooks/useGitOperations';
import { useWorkspace } from '../../hooks/useWorkspace';
import type { FileNode } from '@/types/models';

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
  const { currentWorkspace } = useWorkspace();
  const { handlePull } = useGitOperations();

  useEffect(() => {
    void loadFileList();
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
      <FileActions
        handlePullChanges={handlePull}
        selectedFile={selectedFile}
        loadFileList={loadFileList}
      />
      <FileTree
        files={files}
        handleFileSelect={handleFileSelect}
        showHiddenFiles={currentWorkspace?.showHiddenFiles || false}
        loadFileList={loadFileList}
      />
    </Box>
  );
};

export default Sidebar;
