import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { MantineColorScheme, useMantineColorScheme } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  getLastWorkspaceName,
  getWorkspace,
  updateWorkspace,
  updateLastWorkspaceName,
  deleteWorkspace,
  listWorkspaces,
} from '@/api/workspace';
import { Workspace, DEFAULT_WORKSPACE_SETTINGS } from '@/types/workspace';

interface WorkspaceContextType {
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

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

interface WorkspaceProviderProps {
  children: ReactNode;
}

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({
  children,
}) => {
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(
    null
  );
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const loadWorkspaces = useCallback(async (): Promise<Workspace[]> => {
    try {
      const workspaceList = await listWorkspaces();
      setWorkspaces(workspaceList);
      return workspaceList;
    } catch (error) {
      console.error('Failed to load workspaces:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load workspaces list',
        color: 'red',
      });
      return [];
    }
  }, []);

  const loadWorkspaceData = useCallback(
    async (workspaceName: string): Promise<void> => {
      try {
        const workspace = await getWorkspace(workspaceName);
        setCurrentWorkspace(workspace);
        setColorScheme(workspace.theme as MantineColorScheme);
      } catch (error) {
        console.error('Failed to load workspace data:', error);
        notifications.show({
          title: 'Error',
          message: 'Failed to load workspace data',
          color: 'red',
        });
      }
    },
    []
  );

  const loadFirstAvailableWorkspace = useCallback(async (): Promise<void> => {
    try {
      const allWorkspaces = await listWorkspaces();
      if (allWorkspaces.length > 0) {
        const firstWorkspace = allWorkspaces[0];
        if (!firstWorkspace) throw new Error('No workspaces available');
        await updateLastWorkspaceName(firstWorkspace.name);
        await loadWorkspaceData(firstWorkspace.name);
      }
    } catch (error) {
      console.error('Failed to load first available workspace:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load workspace',
        color: 'red',
      });
    }
  }, []);

  useEffect(() => {
    const initializeWorkspace = async (): Promise<void> => {
      try {
        const lastWorkspaceName = await getLastWorkspaceName();
        if (lastWorkspaceName) {
          await loadWorkspaceData(lastWorkspaceName);
        } else {
          await loadFirstAvailableWorkspace();
        }
        await loadWorkspaces();
      } catch (error) {
        console.error('Failed to initialize workspace:', error);
        await loadFirstAvailableWorkspace();
      } finally {
        setLoading(false);
      }
    };

    initializeWorkspace();
  }, []);

  const switchWorkspace = useCallback(
    async (workspaceName: string): Promise<void> => {
      try {
        setLoading(true);
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
      } finally {
        setLoading(false);
      }
    },
    []
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
  }, [currentWorkspace]);

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
        setColorScheme(response.theme);
        await loadWorkspaces();
      } catch (error) {
        console.error('Failed to save settings:', error);
        throw error;
      }
    },
    [currentWorkspace, setColorScheme]
  );

  const updateColorScheme = useCallback(
    (newTheme: MantineColorScheme): void => {
      setColorScheme(newTheme);
    },
    [setColorScheme]
  );

  const value: WorkspaceContextType = {
    currentWorkspace,
    workspaces,
    settings: currentWorkspace || DEFAULT_WORKSPACE_SETTINGS,
    updateSettings,
    loading,
    colorScheme,
    updateColorScheme,
    switchWorkspace,
    deleteCurrentWorkspace,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
