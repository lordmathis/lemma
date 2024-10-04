import React, { createContext, useContext, useMemo } from 'react';
import { useFileContent } from '../hooks/useFileContent';

const FileOperationsContext = createContext();

export const FileOperationsProvider = ({ children }) => {
  const { handleCreateNewFile, handleDeleteFile } = useFileContent();

  const value = useMemo(
    () => ({
      handleCreateNewFile,
      handleDeleteFile,
    }),
    [handleCreateNewFile, handleDeleteFile]
  );

  return (
    <FileOperationsContext.Provider value={value}>
      {children}
    </FileOperationsContext.Provider>
  );
};

export const useFileOperations = () => {
  const context = useContext(FileOperationsContext);
  if (context === undefined) {
    throw new Error(
      'useFileOperations must be used within a FileOperationsProvider'
    );
  }
  return context;
};
