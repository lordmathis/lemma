import React, { createContext, useContext, useMemo } from 'react';
import { useFileContent } from '../hooks/useFileContent';

const FileSelectionContext = createContext();

export const FileSelectionProvider = ({ children }) => {
  const { selectedFile, isNewFile, hasUnsavedChanges, handleFileSelect } =
    useFileContent();

  const value = useMemo(
    () => ({
      selectedFile,
      isNewFile,
      hasUnsavedChanges,
      handleFileSelect,
    }),
    [selectedFile, isNewFile, hasUnsavedChanges, handleFileSelect]
  );

  return (
    <FileSelectionContext.Provider value={value}>
      {children}
    </FileSelectionContext.Provider>
  );
};

export const useFileSelection = () => {
  const context = useContext(FileSelectionContext);
  if (context === undefined) {
    throw new Error(
      'useFileSelection must be used within a FileSelectionProvider'
    );
  }
  return context;
};
