import { useState, useCallback, useEffect } from 'react';
import { isImageFile } from '../utils/fileHelpers';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { getFileContent } from '@/api/file';
import { DEFAULT_FILE } from '@/types/models';

interface UseFileContentResult {
  content: string;
  setContent: React.Dispatch<React.SetStateAction<string>>;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  loadFileContent: (filePath: string) => Promise<void>;
  handleContentChange: (newContent: string) => void;
}

export const useFileContent = (
  selectedFile: string | null
): UseFileContentResult => {
  const { currentWorkspace } = useWorkspace();
  const [content, setContent] = useState<string>(DEFAULT_FILE.content);
  const [originalContent, setOriginalContent] = useState<string>(
    DEFAULT_FILE.content
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  const loadFileContent = useCallback(
    async (filePath: string) => {
      if (!currentWorkspace) return;

      try {
        let newContent: string;
        if (filePath === DEFAULT_FILE.path) {
          newContent = DEFAULT_FILE.content;
        } else if (!isImageFile(filePath)) {
          newContent = await getFileContent(currentWorkspace.name, filePath);
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
      void loadFileContent(selectedFile);
    }
  }, [selectedFile, currentWorkspace, loadFileContent]);

  const handleContentChange = useCallback(
    (newContent: string) => {
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
