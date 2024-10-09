import React from 'react';
import { Text, Switch, Stack } from '@mantine/core';

const AppearanceSettings = ({ themeSettings, onThemeChange }) => {
  return (
    <Stack spacing="xs">
      <Text fw={500} size="lg">
        Appearance
      </Text>
      <Switch
        label="Dark Mode"
        checked={themeSettings === 'dark'}
        onChange={onThemeChange}
      />
    </Stack>
  );
};

export default AppearanceSettings;
