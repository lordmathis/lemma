import React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { Breadcrumbs, Dot, Grid, Tabs } from '@geist-ui/core';
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
  const { content, hasUnsavedChanges, handleContentChange } = useFileContent();
  const { handleSave, handleCreate, handleDelete } = useFileOperations();
  const { handleCommitAndPush, handlePull } = useGitOperations();
  const { handleLinkClick, selectedFile, isNewFile, handleFileSelect } =
    useFileNavigation();

  useEffect(() => {
    loadFileList();
  }, []);

  const handleTabChange = (value) => {
    setActiveTab(value);
  };

  const handleCreateFile = useCallback(
    async (fileName) => {
      await handleCreate(fileName);
      await loadFileList();
    },
    [handleCreate, loadFileList]
  );

  const handleDeleteFile = useCallback(
    async (filePath) => {
      await handleDelete(filePath);
      await loadFileList();
    },
    [handleDelete, loadFileList]
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
              handleSave={handleSave}
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
