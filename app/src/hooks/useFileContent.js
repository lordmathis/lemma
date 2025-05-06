import { useState, useCallback, useEffect } from 'react';
import { fetchFileContent } from '../api/git';
import { isImageFile } from '../utils/fileHelpers';
import { DEFAULT_FILE } from '../utils/constants';
import { useWorkspace } from '../contexts/WorkspaceContext';

export const useFileContent = (selectedFile) => {
  const { currentWorkspace } = useWorkspace();
  const [content, setContent] = useState(DEFAULT_FILE.content);
  const [originalContent, setOriginalContent] = useState(DEFAULT_FILE.content);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const loadFileContent = useCallback(
    async (filePath) => {
      if (!currentWorkspace) return;

      try {
        let newContent;
        if (filePath === DEFAULT_FILE.path) {
          newContent = DEFAULT_FILE.content;
        } else if (!isImageFile(filePath)) {
          newContent = await fetchFileContent(currentWorkspace.name, filePath);
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
    },
    [currentWorkspace]
  );

  useEffect(() => {
    if (selectedFile && currentWorkspace) {
      loadFileContent(selectedFile);
    }
  }, [selectedFile, currentWorkspace, loadFileContent]);

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
