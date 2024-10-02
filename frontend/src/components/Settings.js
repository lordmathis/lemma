import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Spacer, useTheme, Dot, useToasts } from '@geist-ui/core';
import { saveUserSettings, fetchUserSettings } from '../services/api';
import AppearanceSettings from './settings/AppearanceSettings';
import EditorSettings from './settings/EditorSettings';
import GitSettings from './settings/GitSettings';

const Settings = ({ visible, onClose, currentTheme, onThemeChange }) => {
  const theme = useTheme();
  const { setToast } = useToasts();
  const [settings, setSettings] = useState({
    autoSave: false,
    gitEnabled: false,
    gitUrl: '',
    gitUser: '',
    gitToken: '',
    gitAutoCommit: false,
    gitCommitMsgTemplate: '',
  });
  const [themeSettings, setThemeSettings] = useState(currentTheme);
  const [originalSettings, setOriginalSettings] = useState({});
  const [originalTheme, setOriginalTheme] = useState(currentTheme);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const userSettings = await fetchUserSettings(1); // Assuming user ID 1 for now
      const { theme, ...otherSettings } = userSettings.settings;
      setSettings(otherSettings);
      setThemeSettings(theme);
      setOriginalSettings(otherSettings);
      setOriginalTheme(theme);
      setHasUnsavedChanges(false);
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to load user settings:', error);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized) {
      loadSettings();
    }
  }, [isInitialized, loadSettings]);

  useEffect(() => {
    const settingsChanged =
      JSON.stringify(settings) !== JSON.stringify(originalSettings);
    const themeChanged = themeSettings !== originalTheme;
    setHasUnsavedChanges(settingsChanged || themeChanged);
  }, [settings, themeSettings, originalSettings, originalTheme]);

  const handleInputChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleThemeChange = () => {
    const newTheme = themeSettings === 'dark' ? 'light' : 'dark';
    setThemeSettings(newTheme);
    onThemeChange(newTheme);
  };

  const handleSubmit = async () => {
    try {
      await saveUserSettings({
        userId: 1, // Assuming user ID 1 for now
        settings: { ...settings, theme: themeSettings },
      });
      setOriginalSettings(settings);
      setOriginalTheme(themeSettings);
      setHasUnsavedChanges(false);
      setToast({ text: 'Settings saved successfully', type: 'success' });
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
      setToast({
        text: 'Failed to save settings: ' + error.message,
        type: 'error',
      });
    }
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <Modal.Title>
        Settings
        {hasUnsavedChanges && (
          <Dot type="warning" style={{ marginLeft: '8px' }} />
        )}
      </Modal.Title>
      <Modal.Content>
        <AppearanceSettings
          themeSettings={themeSettings}
          onThemeChange={handleThemeChange}
        />
        <Spacer h={1} />
        <EditorSettings
          autoSave={settings.autoSave}
          onAutoSaveChange={(value) => handleInputChange('autoSave', value)}
        />
        <Spacer h={1} />
        <GitSettings
          gitEnabled={settings.gitEnabled}
          gitUrl={settings.gitUrl}
          gitUser={settings.gitUser}
          gitToken={settings.gitToken}
          gitAutoCommit={settings.gitAutoCommit}
          gitCommitMsgTemplate={settings.gitCommitMsgTemplate}
          onInputChange={handleInputChange}
        />
      </Modal.Content>
      <Modal.Action passive onClick={onClose}>
        Cancel
      </Modal.Action>
      <Modal.Action onClick={handleSubmit}>Save Changes</Modal.Action>
    </Modal>
  );
};

export default Settings;
