import React from 'react';
import { ThemeProvider } from './ThemeContext';
import { WorkspaceDataProvider } from './WorkspaceDataContext';
import { useWorkspace as useWorkspaceHook } from '../hooks/useWorkspace';

// Re-export the useWorkspace hook directly for backward compatibility
export const useWorkspace = useWorkspaceHook;

interface WorkspaceProviderProps {
  children: React.ReactNode;
}

// Create a backward-compatible WorkspaceProvider that composes our new providers
export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({
  children,
}) => {
  return (
    <ThemeProvider>
      <WorkspaceDataProvider>{children}</WorkspaceDataProvider>
    </ThemeProvider>
  );
};
