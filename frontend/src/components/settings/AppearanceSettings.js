import React from 'react';
import { Text, Switch, Group, Box, Title } from '@mantine/core';
import { useWorkspace } from '../../contexts/WorkspaceContext';

const AppearanceSettings = ({ onThemeChange }) => {
  const { colorScheme, toggleColorScheme } = useWorkspace();

  const handleThemeChange = () => {
    toggleColorScheme();
    onThemeChange(colorScheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <Box mb="md">
      <Title order={3} mb="md">
        Appearance
      </Title>
      <Group justify="space-between" align="center">
        <Text size="sm">Dark Mode</Text>
        <Switch checked={colorScheme === 'dark'} onChange={handleThemeChange} />
      </Group>
    </Box>
  );
};

export default AppearanceSettings;
