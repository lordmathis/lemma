import React, { createContext, useContext } from 'react';
import { useFileList } from '../hooks/useFileList';

const FileListContext = createContext();

export const FileListProvider = ({ children }) => {
  const fileListHook = useFileList();

  return (
    <FileListContext.Provider value={fileListHook}>
      {children}
    </FileListContext.Provider>
  );
};

export const useFileListContext = () => {
  const context = useContext(FileListContext);
  if (!context) {
    throw new Error(
      'useFileListContext must be used within a FileListProvider'
    );
  }
  return context;
};
