import React, { useState } from 'react';
import { Page, Text, User, Button, Spacer } from '@geist-ui/core';
import { Settings as SettingsIcon } from '@geist-ui/icons';
import Settings from './Settings';

const Header = ({ currentTheme, onThemeChange }) => {
  const [settingsVisible, setSettingsVisible] = useState(false);

  const openSettings = () => setSettingsVisible(true);
  const closeSettings = () => setSettingsVisible(false);

  return (
    <Page.Header className="custom-navbar">
      <Text b>NovaMD</Text>
      <Spacer w={1} />
      <User src="https://via.placeholder.com/40" name="User" />
      <Spacer w={0.5} />
      <Button auto icon={<SettingsIcon />} onClick={openSettings} />
      <Settings 
        visible={settingsVisible} 
        onClose={closeSettings} 
        currentTheme={currentTheme}
        onThemeChange={onThemeChange}
      />
    </Page.Header>
  );
};

export default Header;