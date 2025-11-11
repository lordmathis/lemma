import React, { useState, useCallback, useMemo } from 'react';
import { Tabs, Breadcrumbs, Group, Box, Text, Flex } from '@mantine/core';
import { IconCode, IconEye, IconPointFilled } from '@tabler/icons-react';

import ContentView from '../editor/ContentView';
import CreateFileModal from '../modals/file/CreateFileModal';
import DeleteFileModal from '../modals/file/DeleteFileModal';
import RenameFileModal from '../modals/file/RenameFileModal';
import CommitMessageModal from '../modals/git/CommitMessageModal';

import { useFileContent } from '../../hooks/useFileContent';
import { useFileOperations } from '../../hooks/useFileOperations';
import { useGitOperations } from '../../hooks/useGitOperations';
import { useModalContext } from '../../contexts/ModalContext';
import type { FileNode } from '../../types/models';

type ViewTab = 'source' | 'preview';

interface MainContentProps {
  selectedFile: string | null;
  handleFileSelect: (filePath: string | null) => Promise<void>;
  loadFileList: () => Promise<void>;
  files: FileNode[];
}

const MainContent: React.FC<MainContentProps> = ({
  selectedFile,
  handleFileSelect,
  loadFileList,
  files,
}) => {
  const [activeTab, setActiveTab] = useState<ViewTab>('source');
  const {
    content,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    handleContentChange,
  } = useFileContent(selectedFile);
  const { handleSave, handleCreate, handleDelete, handleRename } =
    useFileOperations();
  const { handleCommitAndPush } = useGitOperations();
  const { setRenameFileModalVisible } = useModalContext();

  const handleTabChange = useCallback((value: string | null): void => {
    if (value) {
      setActiveTab(value as ViewTab);
    }
  }, []);

  const handleSaveFile = useCallback(
    async (filePath: string, fileContent: string): Promise<boolean> => {
      const success = await handleSave(filePath, fileContent);
      if (success) {
        setHasUnsavedChanges(false);
      }
      return success;
    },
    [handleSave, setHasUnsavedChanges]
  );

  const handleCreateFile = useCallback(
    async (fileName: string): Promise<void> => {
      const success = await handleCreate(fileName);
      if (success) {
        await loadFileList();
        await handleFileSelect(fileName);
      }
    },
    [handleCreate, handleFileSelect, loadFileList]
  );

  const handleDeleteFile = useCallback(
    async (filePath: string): Promise<void> => {
      const success = await handleDelete(filePath);
      if (success) {
        await loadFileList();
        await handleFileSelect(null);
      }
    },
    [handleDelete, handleFileSelect, loadFileList]
  );

  const handleRenameFile = useCallback(
    async (oldPath: string, newPath: string): Promise<void> => {
      const success = await handleRename(oldPath, newPath);
      if (success) {
        await loadFileList();
        // If we renamed the currently selected file, update the selection
        if (selectedFile === oldPath) {
          await handleFileSelect(newPath);
        }
      }
    },
    [handleRename, handleFileSelect, loadFileList, selectedFile]
  );

  const handleBreadcrumbClick = useCallback(() => {
    if (selectedFile) {
      setRenameFileModalVisible(true);
    }
  }, [selectedFile, setRenameFileModalVisible]);

  const renderBreadcrumbs = useMemo(() => {
    if (!selectedFile) return null;
    const pathParts = selectedFile.split('/');
    const items = pathParts.map((part, index) => {
      // Make the filename (last part) clickable for rename
      const isFileName = index === pathParts.length - 1;
      return (
        <Text
          key={index}
          size="sm"
          style={{
            cursor: isFileName ? 'pointer' : 'default',
            ...(isFileName && {
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
            }),
          }}
          onClick={isFileName ? handleBreadcrumbClick : undefined}
          title={isFileName ? 'Click to rename file' : undefined}
        >
          {part}
        </Text>
      );
    });

    return (
      <Group>
        <Breadcrumbs separator="/">{items}</Breadcrumbs>
        {hasUnsavedChanges && (
          <IconPointFilled
            size={16}
            style={{ color: 'var(--mantine-color-yellow-filled)' }}
          />
        )}
      </Group>
    );
  }, [selectedFile, hasUnsavedChanges, handleBreadcrumbClick]);

  return (
    <Box
      style={{
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Flex justify="space-between" align="center" p="md">
        {renderBreadcrumbs}
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tabs.List>
            <Tabs.Tab value="source" leftSection={<IconCode size="0.8rem" />} />
            <Tabs.Tab value="preview" leftSection={<IconEye size="0.8rem" />} />
          </Tabs.List>
        </Tabs>
      </Flex>
      <Box style={{ flex: 1, overflow: 'auto' }}>
        <ContentView
          activeTab={activeTab}
          selectedFile={selectedFile}
          content={content}
          handleContentChange={handleContentChange}
          handleSave={handleSaveFile}
          handleFileSelect={handleFileSelect}
          files={files}
        />
      </Box>
      <CreateFileModal onCreateFile={handleCreateFile} />
      <DeleteFileModal
        onDeleteFile={handleDeleteFile}
        selectedFile={selectedFile}
      />
      <RenameFileModal
        onRenameFile={handleRenameFile}
        selectedFile={selectedFile}
      />
      <CommitMessageModal onCommitAndPush={handleCommitAndPush} />
    </Box>
  );
};

export default MainContent;
