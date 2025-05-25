import { useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { useWorkspaceData } from '../contexts/WorkspaceDataContext';
import {
  updateLastWorkspaceName,
  updateWorkspace,
  deleteWorkspace,
} from '@/api/workspace';
import { useTheme } from '../contexts/ThemeContext';
import type { Workspace } from '@/types/models';

interface UseWorkspaceOperationsResult {
  switchWorkspace: (workspaceName: string) => Promise<void>;
  deleteCurrentWorkspace: () => Promise<void>;
  updateSettings: (newSettings: Partial<Workspace>) => Promise<void>;
}

export const useWorkspaceOperations = (): UseWorkspaceOperationsResult => {
  const {
    currentWorkspace,
    loadWorkspaceData,
    loadWorkspaces,
    setCurrentWorkspace,
  } = useWorkspaceData();
  const { updateColorScheme } = useTheme();

  const switchWorkspace = useCallback(
    async (workspaceName: string): Promise<void> => {
      try {
        await updateLastWorkspaceName(workspaceName);
        await loadWorkspaceData(workspaceName);
        await loadWorkspaces();
      } catch (error) {
        console.error('Failed to switch workspace:', error);
        notifications.show({
          title: 'Error',
          message: 'Failed to switch workspace',
          color: 'red',
        });
      }
    },
    [loadWorkspaceData, loadWorkspaces]
  );

  const deleteCurrentWorkspace = useCallback(async (): Promise<void> => {
    if (!currentWorkspace) return;

    try {
      const allWorkspaces = await loadWorkspaces();
      if (allWorkspaces.length <= 1) {
        notifications.show({
          title: 'Error',
          message:
            'Cannot delete the last workspace. At least one workspace must exist.',
          color: 'red',
        });
        return;
      }

      // Delete workspace and get the next workspace ID
      const nextWorkspaceName: string = await deleteWorkspace(
        currentWorkspace.name
      );

      // Load the new workspace data
      await loadWorkspaceData(nextWorkspaceName);

      notifications.show({
        title: 'Success',
        message: 'Workspace deleted successfully',
        color: 'green',
      });

      await loadWorkspaces();
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to delete workspace',
        color: 'red',
      });
    }
  }, [currentWorkspace, loadWorkspaceData, loadWorkspaces]);

  const updateSettings = useCallback(
    async (newSettings: Partial<Workspace>): Promise<void> => {
      if (!currentWorkspace) return;

      try {
        const updatedWorkspace = {
          ...currentWorkspace,
          ...newSettings,
        };

        const response = await updateWorkspace(
          currentWorkspace.name,
          updatedWorkspace
        );
        setCurrentWorkspace(response);
        if (newSettings.theme) {
          updateColorScheme(response.theme);
        }
        await loadWorkspaces();
      } catch (error) {
        console.error('Failed to save settings:', error);
        throw error;
      }
    },
    [currentWorkspace, loadWorkspaces, updateColorScheme, setCurrentWorkspace]
  );

  return {
    switchWorkspace,
    deleteCurrentWorkspace,
    updateSettings,
  };
};
