import { useState, useCallback } from 'react';
import { fetchFileContent, saveFileContent, deleteFile } from '../services/api';
import { isImageFile } from '../utils/fileHelpers';
import { useToasts } from '@geist-ui/core';
import { useFileListContext } from '../contexts/FileListContext';

const DEFAULT_FILE = {
  name: 'New File.md',
  path: 'New File.md',
  content: '# Welcome to NovaMD\n\nStart editing here!',
};

export const useFileContent = () => {
  const [content, setContent] = useState(DEFAULT_FILE.content);
  const [selectedFile, setSelectedFile] = useState(DEFAULT_FILE.path);
  const [isNewFile, setIsNewFile] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState(null);
  const { setToast } = useToasts();
  const { loadFileList } = useFileListContext();

  const handleFileSelect = useCallback(
    async (filePath) => {
      console.log('handleFileSelect', filePath);
      try {
        if (filePath === DEFAULT_FILE.path) {
          setContent(DEFAULT_FILE.content);
          setSelectedFile(DEFAULT_FILE.path);
          setIsNewFile(true);
        } else if (!isImageFile(filePath)) {
          const fileContent = await fetchFileContent(filePath);
          setContent(fileContent);
          setSelectedFile(filePath);
          setIsNewFile(false);
        } else {
          setContent(''); // Set empty content for image files
          setSelectedFile(filePath);
          setIsNewFile(false);
        }
        setHasUnsavedChanges(false);
        setError(null);
      } catch (error) {
        console.error('Failed to load file content:', error);
        setError('Failed to load file content. Please try again.');
      }
    },
    [hasUnsavedChanges]
  );

  const handleContentChange = useCallback((newContent) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
  }, []);

  const handleSave = useCallback(async (filePath, fileContent) => {
    try {
      await saveFileContent(filePath, fileContent);
      setIsNewFile(false);
      setHasUnsavedChanges(false);
      return true;
    } catch (error) {
      console.error('Error saving file:', error);
      setError('Failed to save file. Please try again.');
      return false;
    }
  }, []);

  const handleCreateNewFile = useCallback(
    async (fileName, initialContent = '') => {
      try {
        await saveFileContent(fileName, initialContent);
        setToast({ text: 'New file created successfully', type: 'success' });
        await loadFileList(); // Refresh the file list
        handleFileSelect(fileName);
      } catch (error) {
        setToast({
          text: 'Failed to create new file: ' + error.message,
          type: 'error',
        });
      }
    },
    [setToast, loadFileList, handleFileSelect]
  );

  const handleDeleteFile = useCallback(async () => {
    if (!selectedFile) return;
    try {
      await deleteFile(selectedFile);
      setToast({ text: 'File deleted successfully', type: 'success' });
      await loadFileList(); // Refresh the file list
      setSelectedFile(null);
      setContent('');
    } catch (error) {
      setToast({
        text: 'Failed to delete file: ' + error.message,
        type: 'error',
      });
    }
  }, [selectedFile, setToast, loadFileList]);

  return {
    content,
    selectedFile,
    isNewFile,
    hasUnsavedChanges,
    error,
    handleFileSelect,
    handleContentChange,
    handleSave,
    handleCreateNewFile,
    handleDeleteFile,
    DEFAULT_FILE,
  };
};
