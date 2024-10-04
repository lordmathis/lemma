import React, { createContext, useContext, useEffect } from 'react';
import { useFileManagementContext } from './FileManagementContext';

const EditorContentContext = createContext();

export const EditorContentProvider = ({ children }) => {
  const { content, handleContentChange, handleSave, selectedFile } =
    useFileManagementContext();

  useEffect(() => {
    console.log('EditorContentProvider: content or selectedFile updated', {
      content,
      selectedFile,
    });
  }, [content, selectedFile]);

  return (
    <EditorContentContext.Provider
      value={{ content, handleContentChange, handleSave }}
    >
      {children}
    </EditorContentContext.Provider>
  );
};

export const useEditorContent = () => {
  const context = useContext(EditorContentContext);
  if (context === undefined) {
    throw new Error(
      'useEditorContent must be used within an EditorContentProvider'
    );
  }
  return context;
};
