import React, { createContext, useContext } from 'react';
import { useFileContent } from '../hooks/useFileContent';

const FileContentContext = createContext();

export const FileContentProvider = ({ children }) => {
  const fileContentHook = useFileContent();

  return (
    <FileContentContext.Provider value={fileContentHook}>
      {children}
    </FileContentContext.Provider>
  );
};

export const useFileContentContext = () => {
  const context = useContext(FileContentContext);
  if (!context) {
    throw new Error(
      'useFileContentContext must be used within a FileContentProvider'
    );
  }
  return context;
};
