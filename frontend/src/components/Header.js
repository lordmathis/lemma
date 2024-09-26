import React from 'react';
import { Page, Text, User, Button, Spacer } from '@geist-ui/core';
import { Settings } from '@geist-ui/icons';

const Header = () => {
  return (
    <Page.Header className="custom-navbar">
      <Text b>NovaMD</Text>
      <Spacer w={1} />
      <User src="https://via.placeholder.com/40" name="User" />
      <Spacer w={0.5} />
      <Button auto icon={<Settings />} />
    </Page.Header>
  );
};

export default Header;
