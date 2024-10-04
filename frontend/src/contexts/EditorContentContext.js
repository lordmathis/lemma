import React, { createContext, useContext, useMemo } from 'react';
import { useFileContent } from '../hooks/useFileContent';

const EditorContentContext = createContext();

export const EditorContentProvider = ({ children }) => {
  const { content, handleContentChange, handleSave } = useFileContent();

  const value = useMemo(
    () => ({
      content,
      handleContentChange,
      handleSave,
    }),
    [content, handleContentChange, handleSave]
  );

  return (
    <EditorContentContext.Provider value={value}>
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
