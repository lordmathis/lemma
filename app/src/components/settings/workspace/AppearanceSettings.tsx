import React from 'react';
import { Text, Switch, Group, Box } from '@mantine/core';
import { Theme } from '@/types/models';
import { useTheme } from '../../../contexts/ThemeContext';

const AppearanceSettings: React.FC = () => {
  const { colorScheme, updateColorScheme } = useTheme();

  const handleThemeChange = (): void => {
    const newTheme = colorScheme === 'dark' ? Theme.Light : Theme.Dark;
    updateColorScheme(newTheme);
  };

  return (
    <Box mb="md">
      <Group justify="space-between" align="center">
        <Text size="sm">Dark Mode</Text>
        <Switch checked={colorScheme === 'dark'} onChange={handleThemeChange} />
      </Group>
    </Box>
  );
};

export default AppearanceSettings;
