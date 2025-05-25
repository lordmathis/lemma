import { useWorkspaceData } from '../contexts/WorkspaceDataContext';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkspaceOperations } from './useWorkspaceOperations';
import type { Workspace, DEFAULT_WORKSPACE_SETTINGS } from '@/types/models';
import type { MantineColorScheme } from '@mantine/core';

interface UseWorkspaceResult {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  settings: Workspace | typeof DEFAULT_WORKSPACE_SETTINGS;
  updateSettings: (newSettings: Partial<Workspace>) => Promise<void>;
  loading: boolean;
  colorScheme: MantineColorScheme;
  updateColorScheme: (newTheme: MantineColorScheme) => void;
  switchWorkspace: (workspaceName: string) => Promise<void>;
  deleteCurrentWorkspace: () => Promise<void>;
}

export const useWorkspace = (): UseWorkspaceResult => {
  const { currentWorkspace, workspaces, settings, loading } =
    useWorkspaceData();
  const { colorScheme, updateColorScheme } = useTheme();
  const { switchWorkspace, deleteCurrentWorkspace, updateSettings } =
    useWorkspaceOperations();

  return {
    currentWorkspace,
    workspaces,
    settings,
    updateSettings,
    loading,
    colorScheme,
    updateColorScheme,
    switchWorkspace,
    deleteCurrentWorkspace,
  };
};
