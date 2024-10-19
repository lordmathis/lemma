import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useMantineColorScheme } from '@mantine/core';
import {
  fetchLastWorkspace,
  fetchWorkspaceSettings,
  saveWorkspaceSettings,
} from '../services/api';
import { DEFAULT_SETTINGS } from '../utils/constants';

const WorkspaceContext = createContext();

export const WorkspaceProvider = ({ children }) => {
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  useEffect(() => {
    const loadWorkspaceAndSettings = async () => {
      try {
        const workspace = await fetchLastWorkspace();
        setCurrentWorkspace(workspace);

        if (workspace) {
          const workspaceSettings = await fetchWorkspaceSettings(workspace.id);
          setSettings(workspaceSettings.settings);
          setColorScheme(workspaceSettings.settings.theme);
        }
      } catch (error) {
        console.error('Failed to load workspace or settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkspaceAndSettings();
  }, [setColorScheme]);

  const updateSettings = useCallback(
    async (newSettings) => {
      if (!currentWorkspace) return;

      try {
        await saveWorkspaceSettings(currentWorkspace.id, newSettings);
        setSettings(newSettings);
        if (newSettings.theme) {
          setColorScheme(newSettings.theme);
        }
      } catch (error) {
        console.error('Failed to save settings:', error);
        throw error;
      }
    },
    [currentWorkspace, setColorScheme]
  );

  const toggleColorScheme = useCallback(() => {
    const newTheme = colorScheme === 'dark' ? 'light' : 'dark';
    setColorScheme(newTheme);
    updateSettings({ ...settings, theme: newTheme });
  }, [colorScheme, settings, setColorScheme, updateSettings]);

  const value = {
    currentWorkspace,
    setCurrentWorkspace,
    settings,
    updateSettings,
    toggleColorScheme,
    loading,
    colorScheme,
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
