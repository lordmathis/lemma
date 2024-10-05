import { useEffect, useCallback } from 'react';
import { useFileSelection } from './useFileSelection';
import { useFileContent } from './useFileContent';

export const useFileManagement = () => {
  const { selectedFile, isNewFile, handleFileSelect } = useFileSelection();
  const {
    content,
    isLoading,
    error,
    hasUnsavedChanges,
    loadFileContent,
    handleContentChange,
  } = useFileContent();

  useEffect(() => {
    if (selectedFile) {
      loadFileContent(selectedFile);
    }
  }, [selectedFile, loadFileContent]);

  const handleFileSelectAndLoad = useCallback(
    async (filePath) => {
      await handleFileSelect(filePath);
      await loadFileContent(filePath);
    },
    [handleFileSelect, loadFileContent]
  );

  return {
    selectedFile,
    isNewFile,
    content,
    isLoading,
    error,
    hasUnsavedChanges,
    handleFileSelect: handleFileSelectAndLoad,
    handleContentChange,
  };
};
