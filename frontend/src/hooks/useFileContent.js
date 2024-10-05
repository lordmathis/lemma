import { useState, useCallback } from 'react';
import { fetchFileContent } from '../services/api';
import { isImageFile } from '../utils/fileHelpers';
import { DEFAULT_FILE } from '../utils/constants';

export const useFileContent = () => {
  const [content, setContent] = useState(DEFAULT_FILE.content);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const loadFileContent = useCallback(async (filePath) => {
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
      console.error(err);
    }
  }, []);

  const handleContentChange = useCallback((newContent) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
  }, []);

  return {
    content,
    setContent,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    loadFileContent,
    handleContentChange,
  };
};
