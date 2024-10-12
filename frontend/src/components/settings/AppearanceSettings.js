import React from 'react';
import { Text, Switch, Group, Box, Title } from '@mantine/core';
import { useSettings } from '../../contexts/SettingsContext';

const AppearanceSettings = ({ onThemeChange }) => {
  const { colorScheme, toggleColorScheme } = useSettings();

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
