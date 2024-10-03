import React, { createContext, useState, useContext, useEffect } from 'react';
import { fetchUserSettings, saveUserSettings } from '../services/api';

const SettingsContext = createContext();

export const useSettings = () => {
  return useContext(SettingsContext);
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    theme: 'light',
    autoSave: false,
    gitEnabled: false,
    gitUrl: '',
    gitUser: '',
    gitToken: '',
    gitAutoCommit: false,
    gitCommitMsgTemplate: '',
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const userSettings = await fetchUserSettings(1); // Assuming user ID 1 for now
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
        userId: 1, // Assuming user ID 1 for now
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

  return (
    <SettingsContext.Provider
      value={{ settings, updateSettings, updateTheme, loading }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
