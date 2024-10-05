import { useState, useCallback, useEffect } from 'react';
import { fetchFileContent } from '../services/api';
import { isImageFile } from '../utils/fileHelpers';
import { DEFAULT_FILE } from '../utils/constants';

export const useFileContent = (selectedFile) => {
  const [content, setContent] = useState(DEFAULT_FILE.content);
  const [originalContent, setOriginalContent] = useState(DEFAULT_FILE.content);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const loadFileContent = useCallback(async (filePath) => {
    try {
      let newContent;
      if (filePath === DEFAULT_FILE.path) {
        newContent = DEFAULT_FILE.content;
      } else if (!isImageFile(filePath)) {
        newContent = await fetchFileContent(filePath);
      } else {
        newContent = ''; // Set empty content for image files
      }
      setContent(newContent);
      setOriginalContent(newContent);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Error loading file content:', err);
      setContent(''); // Set empty content on error
      setOriginalContent('');
      setHasUnsavedChanges(false);
    }
  }, []);

  useEffect(() => {
    if (selectedFile) {
      loadFileContent(selectedFile);
    }
  }, [selectedFile, loadFileContent]);

  const handleContentChange = useCallback(
    (newContent) => {
      setContent(newContent);
      setHasUnsavedChanges(newContent !== originalContent);
    },
    [originalContent]
  );

  return {
    content,
    setContent,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    loadFileContent,
    handleContentChange,
  };
};
