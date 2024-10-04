import React from 'react';
import { Page, Text, User, Button, Spacer } from '@geist-ui/core';
import { Settings as SettingsIcon } from '@geist-ui/icons';
import Settings from './Settings';
import { useUIStateContext } from '../contexts/UIStateContext';

const Header = () => {
  const { setSettingsModalVisible } = useUIStateContext();

  const openSettings = () => setSettingsModalVisible(true);

  return (
    <Page.Header className="custom-navbar">
      <Text b>NovaMD</Text>
      <Spacer w={1} />
      <User src="https://via.placeholder.com/40" name="User" />
      <Spacer w={0.5} />
      <Button auto icon={<SettingsIcon />} onClick={openSettings} />
      <Settings />
    </Page.Header>
  );
};

export default Header;
