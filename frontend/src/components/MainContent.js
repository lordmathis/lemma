import React, { useState } from 'react';
import { Grid, Breadcrumbs, Tabs, Dot } from '@geist-ui/core';
import { Code, Eye } from '@geist-ui/icons';
import Editor from './Editor';
import FileTree from './FileTree';
import MarkdownPreview from './MarkdownPreview';

const MainContent = ({
  content,
  files,
  selectedFile,
  hasUnsavedChanges,
  error,
  onFileSelect,
  onContentChange,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState('source');

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
        {hasUnsavedChanges && <Dot type="warning" className="unsaved-indicator" />}
      </div>
    );
  };

  return (
    <Grid.Container gap={1} height="calc(100vh - 64px)">
      <Grid xs={24} sm={6} md={5} lg={4} height="100%" className="sidebar">
        {error ? (
          <div className="error">{error}</div>
        ) : (
          <FileTree 
            files={files} 
            onFileSelect={onFileSelect} 
            selectedFile={selectedFile} 
          />
        )}
      </Grid>
      <Grid xs={24} sm={18} md={19} lg={20} height="100%" className="main-content">
        <div className="content-header">
          {renderBreadcrumbs()}
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.Item label={<Code />} value="source" />
            <Tabs.Item label={<Eye />} value="preview" />
          </Tabs>
        </div>
        <div className="content-body">
          {activeTab === 'source' ? (
            <Editor 
              content={content} 
              onChange={onContentChange} 
              onSave={onSave}
              filePath={selectedFile}
            />
          ) : (
            <MarkdownPreview content={content} />
          )}
        </div>
      </Grid>
    </Grid.Container>
  );
};

export default MainContent;