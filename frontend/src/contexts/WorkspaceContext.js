import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useMantineColorScheme } from '@mantine/core';
import {
  fetchLastWorkspaceId,
  fetchWorkspaceSettings,
  saveWorkspaceSettings,
  getWorkspace,
} from '../services/api';
import { DEFAULT_SETTINGS } from '../utils/constants';

const WorkspaceContext = createContext();

export const WorkspaceProvider = ({ children }) => {
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  useEffect(() => {
    const loadWorkspace = async () => {
      try {
        const { lastWorkspaceId } = await fetchLastWorkspaceId();
        if (lastWorkspaceId) {
          const workspace = await getWorkspace(lastWorkspaceId);
          setCurrentWorkspace(workspace);
          const workspaceSettings = await fetchWorkspaceSettings(
            lastWorkspaceId
          );
          setSettings(workspaceSettings.settings);
          setColorScheme(workspaceSettings.settings.theme);
        } else {
          console.warn('No last workspace found');
        }
      } catch (error) {
        console.error('Failed to initialize workspace:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkspace();
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
