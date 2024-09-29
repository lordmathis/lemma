import React, { useState } from 'react';
import {
  Grid,
  Breadcrumbs,
  Tabs,
  Dot,
  useTheme,
  useToasts,
  Modal,
  Input,
  Button,
} from '@geist-ui/core';
import { Code, Eye } from '@geist-ui/icons';
import Editor from './Editor';
import FileTree from './FileTree';
import MarkdownPreview from './MarkdownPreview';
import { commitAndPush, saveFileContent, deleteFile } from '../services/api';

const MainContent = ({
  content,
  files,
  selectedFile,
  hasUnsavedChanges,
  error,
  onFileSelect,
  onContentChange,
  onSave,
  settings,
  pullLatestChanges,
}) => {
  const [activeTab, setActiveTab] = useState('source');
  const { type: themeType } = useTheme();
  const { setToast } = useToasts();
  const [newFileModalVisible, setNewFileModalVisible] = useState(false);
  const [newFileName, setNewFileName] = useState('');

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

  const handleCommitAndPush = async () => {
    try {
      const message = prompt('Enter commit message:');
      if (message) {
        await commitAndPush(message);
        setToast({
          text: 'Changes committed and pushed successfully',
          type: 'success',
        });
        await pullLatestChanges(); // Pull changes after successful push
      }
    } catch (error) {
      setToast({
        text: 'Failed to commit and push changes: ' + error.message,
        type: 'error',
      });
    }
  };

  const handleCreateFile = () => {
    setNewFileModalVisible(true);
  };

  const handleNewFileSubmit = async () => {
    if (newFileName) {
      try {
        await saveFileContent(newFileName, '');
        setToast({ text: 'New file created successfully', type: 'success' });
        await pullLatestChanges(); // Refresh file list
        onFileSelect(newFileName); // Select the new file
      } catch (error) {
        setToast({
          text: 'Failed to create new file: ' + error.message,
          type: 'error',
        });
      }
    }
    setNewFileModalVisible(false);
    setNewFileName('');
  };

  const handleDeleteFile = async () => {
    if (selectedFile) {
      const confirmDelete = window.confirm(
        `Are you sure you want to delete "${selectedFile}"?`
      );
      if (confirmDelete) {
        try {
          await deleteFile(selectedFile);
          setToast({ text: 'File deleted successfully', type: 'success' });
          await pullLatestChanges(); // Refresh file list
          onFileSelect(null); // Deselect the file
        } catch (error) {
          setToast({
            text: 'Failed to delete file: ' + error.message,
            type: 'error',
          });
        }
      }
    }
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
            <FileTree
              files={files}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
              gitEnabled={settings.gitEnabled}
              gitAutoCommit={settings.gitAutoCommit}
              onPull={handlePull}
              onCommitAndPush={handleCommitAndPush}
              onCreateFile={handleCreateFile}
              onDeleteFile={handleDeleteFile}
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
                themeType={themeType}
              />
            ) : (
              <MarkdownPreview content={content} />
            )}
          </div>
        </Grid>
      </Grid.Container>
      <Modal
        visible={newFileModalVisible}
        onClose={() => setNewFileModalVisible(false)}
      >
        <Modal.Title>Create New File</Modal.Title>
        <Modal.Content>
          <Input
            width="100%"
            placeholder="Enter file name"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
          />
        </Modal.Content>
        <Modal.Action passive onClick={() => setNewFileModalVisible(false)}>
          Cancel
        </Modal.Action>
        <Modal.Action onClick={handleNewFileSubmit}>Create</Modal.Action>
      </Modal>
    </>
  );
};

export default MainContent;
