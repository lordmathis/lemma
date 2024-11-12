import React, { useState } from 'react';
import { Box, PasswordInput, Stack, Text } from '@mantine/core';

const SecuritySettings = ({ settings, onInputChange }) => {
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handlePasswordChange = (field, value) => {
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
      <Stack spacing="md">
        <PasswordInput
          label="Current Password"
          value={settings.currentPassword || ''}
          onChange={(e) =>
            handlePasswordChange('currentPassword', e.currentTarget.value)
          }
          placeholder="Enter current password"
        />
        <PasswordInput
          label="New Password"
          value={settings.newPassword || ''}
          onChange={(e) =>
            handlePasswordChange('newPassword', e.currentTarget.value)
          }
          placeholder="Enter new password"
        />
        <PasswordInput
          label="Confirm New Password"
          value={confirmPassword}
          onChange={(e) =>
            handlePasswordChange('confirmNewPassword', e.currentTarget.value)
          }
          placeholder="Confirm new password"
          error={error}
        />
        <Text size="xs" c="dimmed">
          Password must be at least 8 characters long. Leave password fields
          empty if you don't want to change it.
        </Text>
      </Stack>
    </Box>
  );
};

export default SecuritySettings;
