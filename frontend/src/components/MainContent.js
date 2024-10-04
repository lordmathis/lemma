import React from 'react';
import { Grid, Breadcrumbs, Tabs, Dot } from '@geist-ui/core';
import { Code, Eye } from '@geist-ui/icons';
import FileTree from './FileTree';
import FileActions from './FileActions';
import ContentView from './ContentView';
import CreateFileModal from './modals/CreateFileModal';
import DeleteFileModal from './modals/DeleteFileModal';
import CommitMessageModal from './modals/CommitMessageModal';
import { useFileContentContext } from '../contexts/FileContentContext';
import { useUIStateContext } from '../contexts/UIStateContext';

const MainContent = () => {
  const { selectedFile, hasUnsavedChanges } = useFileContentContext();
  const { activeTab, setActiveTab } = useUIStateContext();

  const handleTabChange = (value) => {
    setActiveTab(value);
  };

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
            <FileActions />
            <FileTree />
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
            <ContentView />
          </div>
        </Grid>
      </Grid.Container>
      <CreateFileModal />
      <DeleteFileModal />
      <CommitMessageModal />
    </>
  );
};

export default MainContent;
