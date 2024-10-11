import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useState,
} from 'react';
import { useMantineColorScheme } from '@mantine/core';
import { fetchUserSettings, saveUserSettings } from '../services/api';
import { DEFAULT_SETTINGS } from '../utils/constants';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const userSettings = await fetchUserSettings(1);
        setSettings(userSettings.settings);
        setColorScheme(userSettings.settings.theme);
      } catch (error) {
        console.error('Failed to load user settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateSettings = useCallback(
    async (newSettings) => {
      try {
        await saveUserSettings({
          userId: 1,
          settings: newSettings,
        });
        setSettings(newSettings);
        if (newSettings.theme) {
          setColorScheme(newSettings.theme);
        }
      } catch (error) {
        console.error('Failed to save settings:', error);
        throw error;
      }
    },
    [setColorScheme]
  );

  const toggleColorScheme = useCallback(() => {
    const newTheme = colorScheme === 'dark' ? 'light' : 'dark';
    setColorScheme(newTheme);
    updateSettings({ ...settings, theme: newTheme });
  }, [colorScheme, settings, setColorScheme, updateSettings]);

  const contextValue = useMemo(
    () => ({
      settings,
      updateSettings,
      toggleColorScheme,
      loading,
      colorScheme,
    }),
    [settings, updateSettings, toggleColorScheme, loading, colorScheme]
  );

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};
