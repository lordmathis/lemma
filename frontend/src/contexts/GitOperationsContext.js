import React, { createContext, useContext } from 'react';
import { useGitOperations } from '../hooks/useGitOperations';

const GitOperationsContext = createContext();

export const GitOperationsProvider = ({ children }) => {
  const gitOperationsHook = useGitOperations();

  return (
    <GitOperationsContext.Provider value={gitOperationsHook}>
      {children}
    </GitOperationsContext.Provider>
  );
};

export const useGitOperationsContext = () => {
  const context = useContext(GitOperationsContext);
  if (!context) {
    throw new Error(
      'useGitOperationsContext must be used within a GitOperationsProvider'
    );
  }
  return context;
};
