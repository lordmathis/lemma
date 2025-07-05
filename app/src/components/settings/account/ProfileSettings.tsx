import React from 'react';
import { Box, Stack, TextInput } from '@mantine/core';
import type { UserProfileSettings } from '@/types/models';

interface ProfileSettingsProps {
  settings: UserProfileSettings;
  onInputChange: (key: keyof UserProfileSettings, value: string) => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  settings,
  onInputChange,
}) => (
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
    </Stack>
  </Box>
);

export default ProfileSettings;
