import { useState, useEffect, useCallback } from 'react';
import { useToasts } from '@geist-ui/core';
import { fetchFileList, fetchFileContent, saveFileContent } from '../services/api';

const DEFAULT_FILE = {
  name: 'New File.md',
  path: 'New File.md',
  content: '# Welcome to NovaMD\n\nStart editing here!'
};

const useFileManagement = () => {
  const [content, setContent] = useState(DEFAULT_FILE.content);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(DEFAULT_FILE.path);
  const [isNewFile, setIsNewFile] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
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
    if (hasUnsavedChanges) {
      const confirmSwitch = window.confirm('You have unsaved changes. Are you sure you want to switch files?');
      if (!confirmSwitch) return;
    }

    try {
      const fileContent = await fetchFileContent(filePath);
      setContent(fileContent);
      setSelectedFile(filePath);
      setIsNewFile(false);
      setHasUnsavedChanges(false);
      setError(null);
    } catch (error) {
      console.error('Failed to load file content:', error);
      setError('Failed to load file content. Please try again.');
    }
  };

  const handleContentChange = (newContent) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
  };

  const handleSave = useCallback(async (filePath, fileContent) => {
    try {
      await saveFileContent(filePath, fileContent);
      setToast({ text: 'File saved successfully', type: 'success' });
      setIsNewFile(false);
      setHasUnsavedChanges(false);
      if (isNewFile) {
        const updatedFileList = await fetchFileList();
        setFiles(updatedFileList);
      }
    } catch (error) {
      console.error('Error saving file:', error);
      setToast({ text: 'Failed to save file. Please try again.', type: 'error' });
    }
  }, [setToast, isNewFile]);

  return {
    content,
    files,
    selectedFile,
    isNewFile,
    hasUnsavedChanges,
    error,
    handleFileSelect,
    handleContentChange,
    handleSave,
  };
};

export default useFileManagement;