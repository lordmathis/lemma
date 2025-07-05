import { useWorkspaceData } from '../contexts/WorkspaceDataContext';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkspaceOperations } from './useWorkspaceOperations';
import type { Workspace } from '@/types/models';
import type { MantineColorScheme } from '@mantine/core';

interface UseWorkspaceResult {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  updateSettings: (newSettings: Partial<Workspace>) => Promise<void>;
  loading: boolean;
  colorScheme: MantineColorScheme;
  updateColorScheme: (newTheme: MantineColorScheme) => void;
  switchWorkspace: (workspaceName: string) => Promise<void>;
  deleteCurrentWorkspace: () => Promise<void>;
}

export const useWorkspace = (): UseWorkspaceResult => {
  const { currentWorkspace, workspaces, loading } = useWorkspaceData();
  const { colorScheme, updateColorScheme } = useTheme();
  const { switchWorkspace, deleteCurrentWorkspace, updateSettings } =
    useWorkspaceOperations();

  return {
    currentWorkspace,
    workspaces,
    updateSettings,
    loading,
    colorScheme,
    updateColorScheme,
    switchWorkspace,
    deleteCurrentWorkspace,
  };
};
