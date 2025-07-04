import React, { useState } from 'react';
import { Box, PasswordInput, Stack, Text } from '@mantine/core';
import type { UserProfileSettings } from '@/types/models';

interface SecuritySettingsProps {
  settings: UserProfileSettings;
  onInputChange: (key: keyof UserProfileSettings, value: string) => void;
}

type PasswordField = 'currentPassword' | 'newPassword' | 'confirmNewPassword';

const SecuritySettings: React.FC<SecuritySettingsProps> = ({
  settings,
  onInputChange,
}) => {
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handlePasswordChange = (field: PasswordField, value: string) => {
    if (field === 'confirmNewPassword') {
      setConfirmPassword(value);
      // Check if passwords match when either password field changes
      if (value !== settings.newPassword) {
        setError('Passwords do not match');
      } else {
        setError('');
      }
    } else {
      onInputChange(field, value);
      // Check if passwords match when either password field changes
      if (field === 'newPassword' && value !== confirmPassword) {
        setError('Passwords do not match');
      } else if (value === confirmPassword) {
        setError('');
      }
    }
  };

  return (
    <Box>
      <Stack gap="md">
        <PasswordInput
          label="Current Password"
          type="password"
          value={settings.currentPassword || ''}
          onChange={(e) =>
            handlePasswordChange('currentPassword', e.currentTarget.value)
          }
          placeholder="Enter current password"
        />
        <PasswordInput
          label="New Password"
          type="password"
          value={settings.newPassword || ''}
          onChange={(e) =>
            handlePasswordChange('newPassword', e.currentTarget.value)
          }
          placeholder="Enter new password"
        />
        <PasswordInput
          label="Confirm New Password"
          type="password"
          value={confirmPassword}
          onChange={(e) =>
            handlePasswordChange('confirmNewPassword', e.currentTarget.value)
          }
          placeholder="Confirm new password"
          error={error}
        />
        <Text size="xs" c="dimmed">
          Password must be at least 8 characters long. Leave password fields
          empty if you don&apos;t want to change it.
        </Text>
      </Stack>
    </Box>
  );
};

export default SecuritySettings;
