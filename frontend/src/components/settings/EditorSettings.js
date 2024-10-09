import React from 'react';
import { Text, Switch, Stack, Tooltip } from '@mantine/core';

const EditorSettings = ({ autoSave, onAutoSaveChange }) => {
  return (
    <Stack spacing="xs" mt="md">
      <Text fw={500} size="lg">
        Editor
      </Text>
      <Tooltip label="Auto Save feature is coming soon!" position="left">
        <Switch
          label="Auto Save"
          checked={autoSave}
          onChange={(event) => onAutoSaveChange(event.currentTarget.checked)}
          disabled
        />
      </Tooltip>
    </Stack>
  );
};

export default EditorSettings;
