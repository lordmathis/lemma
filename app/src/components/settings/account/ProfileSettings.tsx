import React from 'react';
import { Box, Stack, TextInput } from '@mantine/core';
import type { UserProfileSettings } from '../../../types/settings';

interface ProfileSettingsProps {
  settings: UserProfileSettings;
  onInputChange: (key: keyof UserProfileSettings, value: string) => void;
}

const ProfileSettingsComponent: React.FC<ProfileSettingsProps> = ({
  settings,
  onInputChange,
}) => (
  <Box>
    <Stack gap="md">
      <TextInput
        label="Display Name"
        value={settings.displayName || ''}
        onChange={(e) => onInputChange('displayName', e.currentTarget.value)}
        placeholder="Enter display name"
      />
      <TextInput
        label="Email"
        value={settings.email || ''}
        onChange={(e) => onInputChange('email', e.currentTarget.value)}
        placeholder="Enter email"
      />
    </Stack>
  </Box>
);

export default ProfileSettingsComponent;
