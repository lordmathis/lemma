import { useState, useCallback } from 'react';
import { fetchFileContent, saveFileContent } from '../services/api';
import { isImageFile } from '../utils/fileHelpers';

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

  const handleFileSelect = useCallback(
    async (filePath) => {
      if (hasUnsavedChanges) {
        const confirmSwitch = window.confirm(
          'You have unsaved changes. Are you sure you want to switch files?'
        );
        if (!confirmSwitch) return;
      }

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

  const createNewFile = useCallback(() => {
    setContent(DEFAULT_FILE.content);
    setSelectedFile(DEFAULT_FILE.path);
    setIsNewFile(true);
    setHasUnsavedChanges(false);
    setError(null);
  }, []);

  return {
    content,
    selectedFile,
    isNewFile,
    hasUnsavedChanges,
    error,
    handleFileSelect,
    handleContentChange,
    handleSave,
    createNewFile,
    DEFAULT_FILE,
  };
};
