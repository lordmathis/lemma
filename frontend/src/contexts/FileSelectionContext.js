import React, { createContext, useContext } from 'react';
import { useFileManagementContext } from './FileManagementContext';

const FileSelectionContext = createContext();

export const FileSelectionProvider = ({ children }) => {
  const { selectedFile, handleFileSelect } = useFileManagementContext();

  console.log('FileSelectionProvider rendering', { selectedFile });

  return (
    <FileSelectionContext.Provider value={{ selectedFile, handleFileSelect }}>
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
