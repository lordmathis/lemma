import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useMantineColorScheme } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  fetchLastWorkspaceName,
  getWorkspace,
  updateWorkspace,
  updateLastWorkspaceName,
  deleteWorkspace,
  listWorkspaces,
} from '../api/notes';
import { DEFAULT_WORKSPACE_SETTINGS } from '../utils/constants';

const WorkspaceContext = createContext();

export const WorkspaceProvider = ({ children }) => {
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const loadWorkspaces = useCallback(async () => {
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

  const loadWorkspaceData = useCallback(async (workspaceName) => {
    try {
      const workspace = await getWorkspace(workspaceName);
      setCurrentWorkspace(workspace);
      setColorScheme(workspace.theme);
    } catch (error) {
      console.error('Failed to load workspace data:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load workspace data',
        color: 'red',
      });
    }
  }, []);

  const loadFirstAvailableWorkspace = useCallback(async () => {
    try {
      const allWorkspaces = await listWorkspaces();
      if (allWorkspaces.length > 0) {
        const firstWorkspace = allWorkspaces[0];
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
    const initializeWorkspace = async () => {
      try {
        const { lastWorkspaceName } = await fetchLastWorkspaceName();
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

  const switchWorkspace = useCallback(async (workspaceName) => {
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
  }, []);

  const deleteCurrentWorkspace = useCallback(async () => {
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
      const response = await deleteWorkspace(currentWorkspace.name);

      // Load the new workspace data
      await loadWorkspaceData(response.nextWorkspaceName);

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
    async (newSettings) => {
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
    (newTheme) => {
      setColorScheme(newTheme);
    },
    [setColorScheme]
  );

  const value = {
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

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
