import React from 'react';
import { Text, Switch, Group, Box, Title } from '@mantine/core';
import { useWorkspace } from '../../contexts/WorkspaceContext';

const AppearanceSettings = ({ themeSettings, onThemeChange }) => {
  const { colorScheme, updateColorScheme } = useWorkspace();

  const handleThemeChange = () => {
    const newTheme = colorScheme === 'dark' ? 'light' : 'dark';
    updateColorScheme(newTheme);
    onThemeChange(newTheme);
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
