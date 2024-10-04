import { useEffect, useCallback } from 'react';
import { useFileSelection } from './useFileSelection';
import { useFileContent } from './useFileContent';
import { useFileOperations } from './useFileOperations';

export const useFileManagement = () => {
  const { selectedFile, isNewFile, handleFileSelect } = useFileSelection();
  const {
    content,
    isLoading,
    error,
    hasUnsavedChanges,
    loadFileContent,
    handleContentChange,
    setHasUnsavedChanges,
  } = useFileContent();
  const { handleSave, handleDelete, handleCreateNewFile } =
    useFileOperations(setHasUnsavedChanges);

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
    handleSave: (filePath) => handleSave(filePath, content),
    handleDelete,
    handleCreateNewFile,
  };
};
