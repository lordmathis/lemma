import React, { useState } from 'react';
import { Modal, Input, Toggle, Select, Spacer, Button } from '@geist-ui/core';

const Settings = ({ visible, onClose }) => {
  const [theme, setTheme] = useState('light');
  const [fontSize, setFontSize] = useState('14');
  const [autoSave, setAutoSave] = useState(false);

  const handleSubmit = () => {
    const settings = {
      theme,
      fontSize,
      autoSave,
    };
    console.log('Settings to be sent to backend:', settings);
    // TODO: Implement API call to send settings to backend
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <Modal.Title>Settings</Modal.Title>
      <Modal.Content>
        <Select 
          label="Theme" 
          value={theme} 
          onChange={(val) => setTheme(val)}
        >
          <Select.Option value="light">Light</Select.Option>
          <Select.Option value="dark">Dark</Select.Option>
        </Select>
        <Spacer h={0.5} />
        <Input 
          label="Font Size" 
          value={fontSize} 
          onChange={(e) => setFontSize(e.target.value)} 
        />
        <Spacer h={0.5} />
        <Toggle 
          checked={autoSave}
          onChange={(e) => setAutoSave(e.target.checked)}
        >
          Auto Save
        </Toggle>
      </Modal.Content>
      <Modal.Action passive onClick={onClose}>Cancel</Modal.Action>
      <Modal.Action onClick={handleSubmit}>Submit</Modal.Action>
    </Modal>
  );
};

export default Settings;