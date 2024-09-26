import React, { useState, useEffect, useCallback } from 'react';
import { GeistProvider, CssBaseline, useToasts, Page, Text, User, Button, Spacer, Breadcrumbs } from '@geist-ui/core';
import { Settings } from '@geist-ui/icons';
import Editor from './components/Editor';
import FileTree from './components/FileTree';
import { fetchFileList, fetchFileContent, saveFileContent } from './services/api';
import './App.scss';

function App() {
  const [content, setContent] = useState('# Welcome to NovaMD\n\nStart editing here!');
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const { setToast } = useToasts();

  useEffect(() => {
    const loadFileList = async () => {
      try {
        const fileList = await fetchFileList();
        if (Array.isArray(fileList)) {
          setFiles(fileList);
        } else {
          throw new Error('File list is not an array');
        }
      } catch (error) {
        console.error('Failed to load file list:', error);
        setError('Failed to load file list. Please try again later.');
      }
    };

    loadFileList();
  }, []);

  const handleFileSelect = async (filePath) => {
    try {
      const fileContent = await fetchFileContent(filePath);
      setContent(fileContent);
      setSelectedFile(filePath);
      setError(null);
    } catch (error) {
      console.error('Failed to load file content:', error);
      setError('Failed to load file content. Please try again.');
    }
  };

  const handleSave = useCallback(async (filePath, fileContent) => {
    try {
      await saveFileContent(filePath, fileContent);
      setToast({ text: 'File saved successfully', type: 'success' });
    } catch (error) {
      console.error('Error saving file:', error);
      setToast({ text: 'Failed to save file. Please try again.', type: 'error' });
    }
  }, [setToast]);

  const renderBreadcrumbs = () => {
    if (!selectedFile) return null;
    const pathParts = selectedFile.split('/');
    return (
      <Breadcrumbs>
        {pathParts.map((part, index) => (
          <Breadcrumbs.Item key={index}>{part}</Breadcrumbs.Item>
        ))}
      </Breadcrumbs>
    );
  };

  return (
    <GeistProvider>
      <CssBaseline />
      <Page>
        <Page.Header className="custom-navbar">
          <Text b>NovaMD</Text>
          <Spacer w={1} />
          <User src="https://via.placeholder.com/40" name="User" />
          <Spacer w={0.5} />
          <Button auto icon={<Settings />} />
        </Page.Header>
        <Page.Content className="main-container">
          <div className="sidebar">
            {error ? (
              <div className="error">{error}</div>
            ) : (
              <FileTree 
                files={files} 
                onFileSelect={handleFileSelect} 
                selectedFile={selectedFile} 
              />
            )}
          </div>
          <div className="main-content">
            {renderBreadcrumbs()}
            <Editor 
              content={content} 
              onChange={setContent} 
              onSave={handleSave}
              filePath={selectedFile}
            />
          </div>
        </Page.Content>
      </Page>
    </GeistProvider>
  );
}

export default App;