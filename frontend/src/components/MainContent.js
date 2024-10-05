import React, { useState, useCallback, useEffect } from 'react';
import { Breadcrumbs, Grid, Tabs, Dot } from '@geist-ui/core';
import { Code, Eye } from '@geist-ui/icons';

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

const MainContent = () => {
  const [activeTab, setActiveTab] = useState('source');
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
  }, [loadFileList]);

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
    if (!selectedFile) return <div className="breadcrumbs-container"></div>;
    const pathParts = selectedFile.split('/');
    return (
      <div className="breadcrumbs-container">
        <Breadcrumbs>
          {pathParts.map((part, index) => (
            <Breadcrumbs.Item key={index}>{part}</Breadcrumbs.Item>
          ))}
        </Breadcrumbs>
        {hasUnsavedChanges && (
          <Dot type="warning" className="unsaved-indicator" />
        )}
      </div>
    );
  };

  return (
    <>
      <Grid.Container gap={1} height="calc(100vh - 64px)">
        <Grid xs={24} sm={6} md={5} lg={4} height="100%" className="sidebar">
          <div className="file-tree-container">
            <FileActions
              handlePullChanges={handlePull}
              selectedFile={selectedFile}
            />
            <FileTree
              files={files}
              selectedFile={selectedFile}
              handleFileSelect={handleFileSelect}
            />
          </div>
        </Grid>
        <Grid
          xs={24}
          sm={18}
          md={19}
          lg={20}
          height="100%"
          className="main-content"
        >
          <div className="content-header">
            {renderBreadcrumbs()}
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tabs.Item label={<Code />} value="source" />
              <Tabs.Item label={<Eye />} value="preview" />
            </Tabs>
          </div>
          <div className="content-body">
            <ContentView
              activeTab={activeTab}
              selectedFile={selectedFile}
              content={content}
              handleContentChange={handleContentChange}
              handleSave={handleSaveFile}
              handleLinkClick={handleLinkClick}
            />
          </div>
        </Grid>
      </Grid.Container>
      <CreateFileModal onCreateFile={handleCreateFile} />
      <DeleteFileModal
        onDeleteFile={handleDeleteFile}
        selectedFile={selectedFile}
      />
      <CommitMessageModal onCommitAndPush={handleCommitAndPush} />
    </>
  );
};

export default MainContent;
