import React, { useState, useCallback, useMemo } from 'react';
import { Tabs, Breadcrumbs, Group, Box, Text, Flex } from '@mantine/core';
import { IconCode, IconEye, IconPointFilled } from '@tabler/icons-react';

import ContentView from './ContentView';
import CreateFileModal from './modals/CreateFileModal';
import DeleteFileModal from './modals/DeleteFileModal';
import CommitMessageModal from './modals/CommitMessageModal';

import { useFileContent } from '../hooks/useFileContent';
import { useFileOperations } from '../hooks/useFileOperations';
import { useGitOperations } from '../hooks/useGitOperations';
import { useSettings } from '../contexts/SettingsContext';

const MainContent = ({ selectedFile, handleFileSelect, handleLinkClick }) => {
  const [activeTab, setActiveTab] = useState('source');
  const { settings } = useSettings();
  const {
    content,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    handleContentChange,
  } = useFileContent(selectedFile);
  const { handleSave, handleCreate, handleDelete } = useFileOperations();
  const { handleCommitAndPush } = useGitOperations(settings.gitEnabled);

  const handleTabChange = useCallback((value) => {
    setActiveTab(value);
  }, []);

  const handleSaveFile = useCallback(
    async (filePath, content) => {
      let success = await handleSave(filePath, content);
      if (success) {
        setHasUnsavedChanges(false);

        if (settings.gitAutoCommit && settings.gitEnabled) {
          const commitMessage = settings.gitCommitMsgTemplate.replace(
            '${filename}',
            filePath
          );
          success = await handleCommitAndPush(commitMessage);
        }
      }
      return success;
    },
    [handleSave, setHasUnsavedChanges, settings, handleCommitAndPush]
  );

  const handleCreateFile = useCallback(
    async (fileName) => {
      const success = await handleCreate(fileName);
      if (success) {
        handleFileSelect(fileName);
      }
    },
    [handleCreate, handleFileSelect]
  );

  const handleDeleteFile = useCallback(
    async (filePath) => {
      const success = await handleDelete(filePath);
      if (success) {
        handleFileSelect(null);
      }
    },
    [handleDelete, handleFileSelect]
  );

  const renderBreadcrumbs = useMemo(() => {
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
  }, [selectedFile, hasUnsavedChanges]);

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
          handleLinkClick={handleLinkClick}
        />
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
