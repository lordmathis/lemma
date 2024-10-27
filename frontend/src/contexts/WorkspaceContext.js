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
  fetchLastWorkspaceId,
  fetchWorkspaceSettings,
  saveWorkspaceSettings,
  getWorkspace,
  updateLastWorkspace,
} from '../services/api';
import { DEFAULT_SETTINGS } from '../utils/constants';

const WorkspaceContext = createContext();

export const WorkspaceProvider = ({ children }) => {
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const loadWorkspaceData = useCallback(async (workspaceId) => {
    try {
      const workspace = await getWorkspace(workspaceId);
      setCurrentWorkspace(workspace);
      const workspaceSettings = await fetchWorkspaceSettings(workspaceId);
      setSettings(workspaceSettings.settings);
      setColorScheme(workspaceSettings.settings.theme);
    } catch (error) {
      console.error('Failed to load workspace data:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load workspace data',
        color: 'red',
      });
    }
  }, []);

  useEffect(() => {
    const initializeWorkspace = async () => {
      try {
        const { lastWorkspaceId } = await fetchLastWorkspaceId();
        if (lastWorkspaceId) {
          await loadWorkspaceData(lastWorkspaceId);
        } else {
          console.warn('No last workspace found');
        }
      } catch (error) {
        console.error('Failed to initialize workspace:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeWorkspace();
  }, []);

  const switchWorkspace = useCallback(async (workspaceId) => {
    try {
      console.log(workspaceId);
      setLoading(true);
      await updateLastWorkspace(workspaceId);
      console.log('Hello');
      await loadWorkspaceData(workspaceId);
      notifications.show({
        title: 'Success',
        message: 'Workspace switched successfully',
        color: 'green',
      });
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

  const updateSettings = useCallback(
    async (newSettings) => {
      if (!currentWorkspace) return;

      try {
        await saveWorkspaceSettings(currentWorkspace.id, newSettings);
        setSettings(newSettings);
        setColorScheme(newSettings.theme);
      } catch (error) {
        console.error('Failed to save settings:', error);
        throw error;
      }
    },
    [currentWorkspace, setColorScheme]
  );

  // Update just the color scheme without saving to backend
  const updateColorScheme = useCallback(
    (newTheme) => {
      setColorScheme(newTheme);
    },
    [setColorScheme]
  );

  const value = {
    currentWorkspace,
    settings,
    updateSettings,
    loading,
    colorScheme,
    updateColorScheme,
    switchWorkspace,
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
