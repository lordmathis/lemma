import React from 'react';
import { Group, Text, ActionIcon, Avatar } from '@mantine/core';
import { IconSettings } from '@tabler/icons-react';
import Settings from './Settings';
import { useModalContext } from '../contexts/ModalContext';

const Header = () => {
  const { setSettingsModalVisible } = useModalContext();

  const openSettings = () => setSettingsModalVisible(true);

  return (
    <Group justify="space-between" h={60} px="md">
      <Text fw={700} size="lg">
        NovaMD
      </Text>
      <Group>
        <Avatar src="https://via.placeholder.com/40" radius="xl" />
        <ActionIcon variant="subtle" onClick={openSettings} size="lg">
          <IconSettings size={24} />
        </ActionIcon>
      </Group>
      <Settings />
    </Group>
  );
};

export default Header;
