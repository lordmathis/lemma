import React from 'react';
import { Group, Text, Avatar } from '@mantine/core';
import WorkspaceMenu from './WorkspaceMenu';
import Settings from './Settings';

const Header = () => {
  return (
    <Group justify="space-between" h={60} px="md">
      <Text fw={700} size="lg">
        NovaMD
      </Text>
      <Group>
        <Avatar src="https://via.placeholder.com/40" radius="xl" />
        <WorkspaceMenu />
      </Group>
      <Settings />
    </Group>
  );
};

export default Header;
