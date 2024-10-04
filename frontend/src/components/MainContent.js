// components/MainContent.js
import React from 'react';
import {
  Grid,
  Breadcrumbs,
  Tabs,
  Dot,
  useTheme,
  useToasts,
} from '@geist-ui/core';
import { Code, Eye } from '@geist-ui/icons';
import FileTree from './FileTree';
import FileActions from './FileActions';
import ContentView from './ContentView';
import CreateFileModal from './modals/CreateFileModal';
import DeleteFileModal from './modals/DeleteFileModal';
import CommitMessageModal from './modals/CommitMessageModal';
import { useFileListContext } from '../contexts/FileListContext';
import { useFileContentContext } from '../contexts/FileContentContext';
import { useGitOperationsContext } from '../contexts/GitOperationsContext';
import { useUIStateContext } from '../contexts/UIStateContext';
import { useFileNavigation } from '../hooks/useFileNavigation';

const MainContent = () => {
  const { files } = useFileListContext();
  const { selectedFile, hasUnsavedChanges } = useFileContentContext();
  const { pullLatestChanges } = useGitOperationsContext();
  const {
    activeTab,
    setActiveTab,
    newFileModalVisible,
    setNewFileModalVisible,
    deleteFileModalVisible,
    setDeleteFileModalVisible,
    commitMessageModalVisible,
    setCommitMessageModalVisible,
  } = useUIStateContext();
  const { handleLinkClick } = useFileNavigation();
  const { type: themeType } = useTheme();
  const { setToast } = useToasts();

  const handleTabChange = (value) => {
    setActiveTab(value);
  };

  const handlePull = async () => {
    try {
      await pullLatestChanges();
      setToast({ text: 'Successfully pulled latest changes', type: 'success' });
    } catch (error) {
      setToast({
        text: 'Failed to pull changes: ' + error.message,
        type: 'error',
      });
    }
  };

  const handleCreateFile = () => {
    setNewFileModalVisible(true);
  };

  const handleDeleteFile = () => {
    setDeleteFileModalVisible(true);
  };

  const handleCommitAndPush = () => {
    setCommitMessageModalVisible(true);
  };

  const renderBreadcrumbs = () => {
    if (!selectedFile) return null;
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
              onPull={handlePull}
              onCommitAndPush={handleCommitAndPush}
              onCreateFile={handleCreateFile}
              onDeleteFile={handleDeleteFile}
            />
            <FileTree files={files} />
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
              themeType={themeType}
              onLinkClick={handleLinkClick}
            />
          </div>
        </Grid>
      </Grid.Container>
      <CreateFileModal visible={newFileModalVisible} />
      <DeleteFileModal visible={deleteFileModalVisible} />
      <CommitMessageModal visible={commitMessageModalVisible} />
    </>
  );
};

export default MainContent;
