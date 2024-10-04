import React, { createContext, useContext, useMemo } from 'react';
import { useFileList } from '../hooks/useFileList';

const FileListContext = createContext();

export const FileListProvider = ({ children }) => {
  const { files, loadFileList } = useFileList();

  const value = useMemo(() => ({ files, loadFileList }), [files, loadFileList]);

  return (
    <FileListContext.Provider value={value}>
      {children}
    </FileListContext.Provider>
  );
};

export const useFileListContext = () => {
  const context = useContext(FileListContext);
  if (context === undefined) {
    throw new Error(
      'useFileListContext must be used within a FileListProvider'
    );
  }
  return context;
};
