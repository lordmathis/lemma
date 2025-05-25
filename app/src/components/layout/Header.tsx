import React from 'react';
import { Group, Text } from '@mantine/core';
import UserMenu from '../navigation/UserMenu';
import WorkspaceSwitcher from '../navigation/WorkspaceSwitcher';
import WorkspaceSettings from '../settings/workspace/WorkspaceSettings';

const Header: React.FC = () => {
  return (
    <Group justify="space-between" h={60} px="md">
      <Text fw={700} size="lg">
        Lemma
      </Text>
      <Group>
        <WorkspaceSwitcher />
        <UserMenu />
      </Group>
      <WorkspaceSettings />
    </Group>
  );
};

export default Header;
