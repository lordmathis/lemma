import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Text,
  Toggle,
  Input,
  Spacer,
  useTheme,
  Button,
  Dot,
  useToasts,
} from '@geist-ui/core';
import { saveUserSettings, fetchUserSettings } from '../services/api';

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
        <div className="setting-group">
          <Text h4>Appearance</Text>
          <div className="setting-item">
            <Text>Dark Mode</Text>
            <Toggle
              checked={themeSettings === 'dark'}
              onChange={handleThemeChange}
            />
          </div>
        </div>
        <Spacer h={1} />
        <div className="setting-group">
          <Text h4>Editor</Text>
          <div className="setting-item">
            <Text>Auto Save</Text>
            <Toggle
              checked={settings.autoSave}
              onChange={(e) => handleInputChange('autoSave', e.target.checked)}
            />
          </div>
        </div>
        <Spacer h={1} />
        <div className="setting-group">
          <Text h4>Git Integration</Text>
          <div className="setting-item">
            <Text>Enable Git</Text>
            <Toggle
              checked={settings.gitEnabled}
              onChange={(e) =>
                handleInputChange('gitEnabled', e.target.checked)
              }
            />
          </div>
          <div className={settings.gitEnabled ? '' : 'disabled'}>
            <Input
              width="100%"
              label="Git URL"
              value={settings.gitUrl}
              onChange={(e) => handleInputChange('gitUrl', e.target.value)}
              disabled={!settings.gitEnabled}
            />
            <Spacer h={0.5} />
            <Input
              width="100%"
              label="Git Username"
              value={settings.gitUser}
              onChange={(e) => handleInputChange('gitUser', e.target.value)}
              disabled={!settings.gitEnabled}
            />
            <Spacer h={0.5} />
            <Input.Password
              width="100%"
              label="Git Token"
              value={settings.gitToken}
              onChange={(e) => handleInputChange('gitToken', e.target.value)}
              disabled={!settings.gitEnabled}
            />
            <Spacer h={0.5} />
            <div className="setting-item">
              <Text>Auto Commit</Text>
              <Toggle
                checked={settings.gitAutoCommit}
                onChange={(e) =>
                  handleInputChange('gitAutoCommit', e.target.checked)
                }
                disabled={!settings.gitEnabled}
              />
            </div>
            <Spacer h={0.5} />
            <Input
              width="100%"
              label="Commit Message Template"
              value={settings.gitCommitMsgTemplate}
              onChange={(e) =>
                handleInputChange('gitCommitMsgTemplate', e.target.value)
              }
              disabled={!settings.gitEnabled}
            />
          </div>
        </div>
      </Modal.Content>
      <Modal.Action passive onClick={onClose}>
        Cancel
      </Modal.Action>
      <Modal.Action onClick={handleSubmit}>Save Changes</Modal.Action>
    </Modal>
  );
};

export default Settings;
