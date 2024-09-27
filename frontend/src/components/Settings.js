import React, { useState } from 'react';
import { Modal, Text, Toggle, Tooltip, Input, Spacer, Button, useTheme } from '@geist-ui/core';

const Settings = ({ visible, onClose, currentTheme, onThemeChange, onSettingsChange }) => {
  const theme = useTheme();
  const [fontSize, setFontSize] = useState('14');
  const [autoSave, setAutoSave] = useState(false);

  const handleSubmit = () => {
    onSettingsChange({ fontSize, autoSave });
    onClose();
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
              onChange={() => onThemeChange()}
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