import React, { useState, useEffect } from 'react';
import { GeistProvider, CssBaseline } from '@geist-ui/core';
import Editor from './components/Editor';
import FileTree from './components/FileTree';
import { fetchFileList, fetchFileContent } from './services/api';
import './App.scss';

function App() {
  const [content, setContent] = useState('# Welcome to NovaMD\n\nStart editing here!');
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);

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
    } catch (error) {
      console.error('Failed to load file content:', error);
      setError('Failed to load file content. Please try again.');
    }
  };

  return (
    <GeistProvider>
      <CssBaseline />
      <div className="App">
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
          <h1>NovaMD</h1>
          <Editor content={content} onChange={setContent} />
        </div>
      </div>
    </GeistProvider>
  );
}

export default App;