import React from 'react';
import { Group, Text } from '@mantine/core';
import UserMenu from './UserMenu';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import Settings from './Settings';

const Header = () => {
  return (
    <Group justify="space-between" h={60} px="md">
      <Text fw={700} size="lg">
        NovaMD
      </Text>
      <Group>
        <WorkspaceSwitcher />
        <UserMenu />
      </Group>
      <Settings />
    </Group>
  );
};

export default Header;
