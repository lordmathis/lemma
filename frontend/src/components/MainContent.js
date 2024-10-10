import React, { useState, useCallback, useEffect } from 'react';
import { Tabs, Breadcrumbs, Group, Box, Text, Flex } from '@mantine/core';
import { IconCode, IconEye, IconPointFilled } from '@tabler/icons-react';

import FileActions from './FileActions';
import FileTree from './FileTree';
import ContentView from './ContentView';
import CreateFileModal from './modals/CreateFileModal';
import DeleteFileModal from './modals/DeleteFileModal';
import CommitMessageModal from './modals/CommitMessageModal';

import { useFileContent } from '../hooks/useFileContent';
import { useFileList } from '../hooks/useFileList';
import { useFileOperations } from '../hooks/useFileOperations';
import { useGitOperations } from '../hooks/useGitOperations';
import { useFileNavigation } from '../hooks/useFileNavigation';
import { useSettings } from '../contexts/SettingsContext';

const MainContent = () => {
  const [activeTab, setActiveTab] = useState('source');
  const { settings } = useSettings();
  const { files, loadFileList } = useFileList();
  const { handleLinkClick, selectedFile, handleFileSelect } =
    useFileNavigation();
  const {
    content,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    handleContentChange,
  } = useFileContent(selectedFile);
  const { handleSave, handleCreate, handleDelete } = useFileOperations();
  const { handleCommitAndPush, handlePull } = useGitOperations();

  useEffect(() => {
    loadFileList();
  }, [settings.gitEnabled]);

  const handleTabChange = (value) => {
    setActiveTab(value);
  };

  const handleSaveFile = useCallback(
    async (filePath, content) => {
      const success = await handleSave(filePath, content);
      if (success) {
        setHasUnsavedChanges(false);
      }
      return success;
    },
    [handleSave, setHasUnsavedChanges]
  );

  const handleCreateFile = useCallback(
    async (fileName) => {
      const success = await handleCreate(fileName);
      if (success) {
        await loadFileList();
        handleFileSelect(fileName);
      }
    },
    [handleCreate, loadFileList, handleFileSelect]
  );

  const handleDeleteFile = useCallback(
    async (filePath) => {
      const success = await handleDelete(filePath);
      if (success) {
        await loadFileList();
        handleFileSelect(null);
      }
    },
    [handleDelete, loadFileList, handleFileSelect]
  );

  const renderBreadcrumbs = () => {
    if (!selectedFile) return null;
    const pathParts = selectedFile.split('/');
    const items = pathParts.map((part, index) => (
      <Text key={index} size="sm">
        {part}
      </Text>
    ));

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
  };

  return (
    <Box style={{ height: 'calc(100vh - 60px)', display: 'flex' }}>
      <Box
        style={{
          width: '300px',
          borderRight: '1px solid var(--mantine-color-gray-3)',
          overflow: 'hidden',
        }}
      >
        <FileActions
          handlePullChanges={handlePull}
          selectedFile={selectedFile}
        />
        <FileTree files={files} handleFileSelect={handleFileSelect} />
      </Box>
      <Box
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Flex justify="space-between" align="center" p="md">
          {renderBreadcrumbs()}
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tabs.List>
              <Tabs.Tab
                value="source"
                leftSection={<IconCode size="0.8rem" />}
              />
              <Tabs.Tab
                value="preview"
                leftSection={<IconEye size="0.8rem" />}
              />
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
            handleLinkClick={handleLinkClick}
          />
        </Box>
      </Box>
      <CreateFileModal onCreateFile={handleCreateFile} />
      <DeleteFileModal
        onDeleteFile={handleDeleteFile}
        selectedFile={selectedFile}
      />
      <CommitMessageModal onCommitAndPush={handleCommitAndPush} />
    </Box>
  );
};

export default MainContent;
