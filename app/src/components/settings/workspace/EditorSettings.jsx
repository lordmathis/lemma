import React from 'react';
import { Text, Switch, Tooltip, Group, Box } from '@mantine/core';

const EditorSettings = ({
  autoSave,
  showHiddenFiles,
  onAutoSaveChange,
  onShowHiddenFilesChange,
}) => {
  return (
    <Box mb="md">
      <Tooltip label="Auto Save feature is coming soon!" position="left">
        <Group justify="space-between" align="center" mb="sm">
          <Text size="sm">Auto Save</Text>
          <Switch
            checked={autoSave}
            onChange={(event) => onAutoSaveChange(event.currentTarget.checked)}
            disabled
          />
        </Group>
      </Tooltip>

      <Group justify="space-between" align="center">
        <Text size="sm">Show Hidden Files</Text>
        <Switch
          checked={showHiddenFiles}
          onChange={(event) =>
            onShowHiddenFilesChange(event.currentTarget.checked)
          }
        />
      </Group>
    </Box>
  );
};

export default EditorSettings;
