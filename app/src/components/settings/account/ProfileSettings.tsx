import React from 'react';
import { Box, Stack, TextInput, Group, Text, Switch } from '@mantine/core';
import { useAuth } from '@/contexts/AuthContext';
import { Theme, type UserProfileSettings } from '@/types/models';

interface ProfileSettingsProps {
  settings: UserProfileSettings;
  onInputChange: (key: keyof UserProfileSettings, value: string) => void;
  onThemeChange?: (theme: Theme) => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  settings,
  onInputChange,
  onThemeChange,
}) => {
  const { user } = useAuth();
  const currentTheme = settings.theme || user?.theme || Theme.Dark;

  const handleThemeToggle = () => {
    const newTheme = currentTheme === Theme.Dark ? Theme.Light : Theme.Dark;
    if (onThemeChange) {
      onThemeChange(newTheme);
    }
  };

  return (
    <Box>
      <Stack gap="md">
        <TextInput
          label="Display Name"
          type="text"
          value={settings.displayName || ''}
          onChange={(e) => onInputChange('displayName', e.currentTarget.value)}
          placeholder="Enter display name"
          data-testid="display-name-input"
        />
        <TextInput
          label="Email"
          type="email"
          value={settings.email || ''}
          onChange={(e) => onInputChange('email', e.currentTarget.value)}
          placeholder="Enter email"
          data-testid="email-input"
        />
        <Box mb="md">
          <Group justify="space-between" align="center">
            <div>
              <Text size="sm">Default Dark Mode</Text>
              <Text size="xs" c="dimmed">
                Sets the default theme for new workspaces
              </Text>
            </div>
            <Switch
              checked={currentTheme === Theme.Dark}
              onChange={handleThemeToggle}
              data-testid="theme-toggle"
            />
          </Group>
        </Box>
      </Stack>
    </Box>
  );
};

export default ProfileSettings;
