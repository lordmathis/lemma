import React from 'react';
import { Text, Toggle } from '@geist-ui/core';

const AppearanceSettings = ({ themeSettings, onThemeChange }) => {
  return (
    <div className="setting-group">
      <Text h4>Appearance</Text>
      <div className="setting-item">
        <Text>Dark Mode</Text>
        <Toggle checked={themeSettings === 'dark'} onChange={onThemeChange} />
      </div>
    </div>
  );
};

export default AppearanceSettings;
