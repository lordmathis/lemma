import React, { useState } from 'react';
import { Modal, Text, Toggle, Tooltip, Spacer, useTheme, useToasts } from '@geist-ui/core';
import { saveUserSettings } from '../services/api';

const Settings = ({ visible, onClose, currentTheme, onThemeChange }) => {
  const theme = useTheme();
  const [autoSave, setAutoSave] = useState(false);
  const userId = 1;
  const { setToast } = useToasts();

  const handleSubmit = async () => {
    try {
      const savedSettings = await saveUserSettings({
        userId: userId,
        settings: {
          theme: currentTheme,
          autoSave: autoSave
        }
      });
      setToast({ text: 'Settings saved successfully', type: 'success' });
      // Update local state with saved settings
      setAutoSave(savedSettings.settings.autoSave);
      onThemeChange(savedSettings.settings.theme);
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
      setToast({ text: 'Failed to save settings: ' + error.message, type: 'error' });
    }
  };

  const handleThemeChange = () => {
    onThemeChange(currentTheme === 'light' ? 'dark' : 'light');
  };

  const disabledMessage = "This feature is not yet implemented";

  return (
    <Modal visible={visible} onClose={onClose}>
      <Modal.Title>Settings</Modal.Title>
      <Modal.Content>
        <div className="setting-group">
          <Text h4>Appearance</Text>
          <div className="setting-item">
            <Text>Dark Mode</Text>
            <Toggle 
              checked={currentTheme === 'dark'}
              onChange={handleThemeChange}
            />
          </div>
        </div>
        <Spacer h={1} />
        <div className="setting-group">
          <Text h4>Editor</Text>
          <Tooltip text={disabledMessage} type="dark" placement="left">
          <div className="setting-item disabled">
            <Text>Auto Save</Text>
            <Toggle disabled/>
          </div>
          </Tooltip>
        </div>
      </Modal.Content>
      <Modal.Action passive onClick={onClose}>Cancel</Modal.Action>
      <Modal.Action onClick={handleSubmit}>Save Changes</Modal.Action>
    </Modal>
  );
};

export default Settings;