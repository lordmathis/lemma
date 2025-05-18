import React from 'react';
import { Text, Switch, Group, Box } from '@mantine/core';
import { useWorkspace } from '../../../contexts/WorkspaceContext';
import { Theme } from '@/types/theme';

interface AppearanceSettingsProps {
  onThemeChange: (newTheme: Theme) => void;
}

const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  onThemeChange,
}) => {
  const { colorScheme, updateColorScheme } = useWorkspace();

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
