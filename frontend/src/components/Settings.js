import React, { useState } from 'react';
import { Modal, Text, Toggle, Tooltip, Spacer, useTheme } from '@geist-ui/core';
import { saveUserSettings } from '../services/api';

const Settings = ({ visible, onClose, currentTheme, onThemeChange }) => {
  const theme = useTheme();
  const [autoSave, setAutoSave] = useState(false);
  const userId = 1;

  const handleSubmit = async () => {
    try {
      await saveUserSettings({
        userId: userId,
        settings: {
          theme: currentTheme,
          autoSave: autoSave
        }
      });
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
      // You might want to show an error message to the user here
    }
  };

  const handleThemeChange = () => {
    onThemeChange();
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