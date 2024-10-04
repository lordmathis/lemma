import React, { createContext, useContext, useMemo } from 'react';
import { useFileManagement } from '../hooks/useFileManagement';

const FileManagementContext = createContext();

export const FileManagementProvider = ({ children }) => {
  const fileManagement = useFileManagement();

  const value = useMemo(
    () => fileManagement,
    [
      fileManagement.selectedFile,
      fileManagement.isNewFile,
      fileManagement.content,
      fileManagement.isLoading,
      fileManagement.error,
      fileManagement.hasUnsavedChanges,
    ]
  );

  return (
    <FileManagementContext.Provider value={value}>
      {children}
    </FileManagementContext.Provider>
  );
};

export const useFileManagementContext = () => {
  const context = useContext(FileManagementContext);
  if (context === undefined) {
    throw new Error(
      'useFileManagementContext must be used within a FileManagementProvider'
    );
  }
  return context;
};
