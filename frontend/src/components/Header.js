import React from 'react';
import { Group, Text, Avatar } from '@mantine/core';
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
        <Avatar src="https://via.placeholder.com/40" radius="xl" />
      </Group>
      <Settings />
    </Group>
  );
};

export default Header;
