import { useState, useCallback } from 'react';
import { fetchFileContent } from '../services/api';
import { isImageFile } from '../utils/fileHelpers';
import { DEFAULT_FILE } from '../utils/constants';

export const useFileContent = () => {
  const [content, setContent] = useState(DEFAULT_FILE.content);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const loadFileContent = useCallback(async (filePath) => {
    setIsLoading(true);
    setError(null);
    try {
      if (filePath === DEFAULT_FILE.path) {
        setContent(DEFAULT_FILE.content);
      } else if (!isImageFile(filePath)) {
        const fileContent = await fetchFileContent(filePath);
        setContent(fileContent);
      } else {
        setContent(''); // Set empty content for image files
      }
      setHasUnsavedChanges(false);
    } catch (err) {
      setError('Failed to load file content');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleContentChange = useCallback((newContent) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
  }, []);

  return {
    content,
    setContent,
    isLoading,
    error,
    hasUnsavedChanges,
    loadFileContent,
    handleContentChange,
  };
};
