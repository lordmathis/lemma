import React from 'react';
import { Box, Stack, TextInput } from '@mantine/core';

const ProfileSettings = ({ settings, onInputChange }) => (
  <Box>
    <Stack spacing="md">
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

export default ProfileSettings;
