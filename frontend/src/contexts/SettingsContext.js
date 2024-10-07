import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import { fetchUserSettings, saveUserSettings } from '../services/api';
import { DEFAULT_SETTINGS } from '../utils/constants';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const userSettings = await fetchUserSettings(1);
        setSettings(userSettings.settings);
      } catch (error) {
        console.error('Failed to load user settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateSettings = async (newSettings) => {
    try {
      await saveUserSettings({
        userId: 1,
        settings: newSettings,
      });
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  };

  const updateTheme = (newTheme) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      theme: newTheme,
    }));
  };

  const contextValue = useMemo(
    () => ({
      settings,
      updateSettings,
      updateTheme,
      loading,
    }),
    [settings, loading]
  );

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};
