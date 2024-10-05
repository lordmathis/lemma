import FileActions from './FileActions';
import FileTree from './FileTree';
import ContentView from './ContentView';
import CreateFileModal from './modals/CreateFileModal';
import DeleteFileModal from './modals/DeleteFileModal';
import CommitMessageModal from './modals/CommitMessageModal';
import { useEditorContent } from '../contexts/EditorContentContext';
import { useFileSelection } from '../contexts/FileSelectionContext';
import { useSettings } from '../contexts/SettingsContext';
import { useFileOperations } from '../hooks/useFileOperations';
import { pullChanges, commitAndPush, fetchFileList } from '../services/api';
import { Breadcrumbs, Grid, Tabs, useToasts } from '@geist-ui/core';
import { Code, Eye } from '@geist-ui/icons';
import { useState, useCallback, useEffect } from 'react';
import React from 'react';

const MainContent = () => {
  const [activeTab, setActiveTab] = useState('source');
  const [files, setFiles] = useState([]);
  const { hasUnsavedChanges } = useEditorContent();
  const { selectedFile } = useFileSelection();
  const { settings } = useSettings();
  const { handleCreate, handleDelete } = useFileOperations();
  const { setToast } = useToasts();

  const refreshFileList = useCallback(async () => {
    try {
      const fileList = await fetchFileList();
      setFiles(fileList);
    } catch (error) {
      console.error('Failed to fetch file list:', error);
      setToast({ text: 'Failed to refresh file list', type: 'error' });
    }
  }, [setToast]);

  useEffect(() => {
    refreshFileList();
  }, []);

  const handleTabChange = (value) => {
    setActiveTab(value);
  };

  const pullLatestChanges = useCallback(async () => {
    if (!settings.gitEnabled) return;
    try {
      await pullChanges();
      await refreshFileList();
      setToast({ text: 'Successfully pulled latest changes', type: 'success' });
    } catch (error) {
      console.error('Failed to pull latest changes:', error);
      setToast({ text: 'Failed to pull latest changes', type: 'error' });
    }
  }, [settings.gitEnabled, setToast, refreshFileList]);

  const handleCommitAndPush = useCallback(
    async (message) => {
      if (!settings.gitEnabled) return;
      try {
        await commitAndPush(message);
        setToast({
          text: 'Successfully committed and pushed changes',
          type: 'success',
        });
      } catch (error) {
        console.error('Failed to commit and push changes:', error);
        setToast({ text: 'Failed to commit and push changes', type: 'error' });
      }
    },
    [settings.gitEnabled, setToast]
  );

  const handleCreateFile = useCallback(
    async (fileName) => {
      await handleCreate(fileName);
      await refreshFileList();
    },
    [handleCreate, refreshFileList]
  );

  const handleDeleteFile = useCallback(
    async (filePath) => {
      await handleDelete(filePath);
      await refreshFileList();
    },
    [handleDelete, refreshFileList]
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
              onCreateFile={handleCreateFile}
              onDeleteFile={handleDeleteFile}
              onPullChanges={pullLatestChanges}
              onCommitAndPush={handleCommitAndPush}
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
            <ContentView activeTab={activeTab} />
          </div>
        </Grid>
      </Grid.Container>
      <CreateFileModal onCreateFile={handleCreateFile} />
      <DeleteFileModal onDeleteFile={handleDeleteFile} />
      <CommitMessageModal onCommitAndPush={handleCommitAndPush} />
    </>
  );
};

export default MainContent;
