import React from 'react';
import { Text, Switch, Tooltip, Group, Box, Title } from '@mantine/core';

const EditorSettings = ({ autoSave, onAutoSaveChange }) => {
  return (
    <Box mb="md">
      <Tooltip label="Auto Save feature is coming soon!" position="left">
        <Group justify="space-between" align="center">
          <Text size="sm">Auto Save</Text>
          <Switch
            checked={autoSave}
            onChange={(event) => onAutoSaveChange(event.currentTarget.checked)}
            disabled
          />
        </Group>
      </Tooltip>
    </Box>
  );
};

export default EditorSettings;
