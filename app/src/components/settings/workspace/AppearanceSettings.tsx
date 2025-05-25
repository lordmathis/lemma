import React from 'react';
import { Text, Switch, Group, Box } from '@mantine/core';
import { useTheme } from '../../../contexts/ThemeContext';
import { Theme } from '@/types/models';

interface AppearanceSettingsProps {
  onThemeChange: (newTheme: Theme) => void;
}

const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  onThemeChange,
}) => {
  const { colorScheme, updateColorScheme } = useTheme();

  const handleThemeChange = (): void => {
    const newTheme = colorScheme === 'dark' ? Theme.Light : Theme.Dark;
    updateColorScheme(newTheme);
    onThemeChange(newTheme);
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
