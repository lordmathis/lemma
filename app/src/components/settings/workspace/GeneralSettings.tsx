import React from 'react';
import { Box, TextInput, Text, Grid } from '@mantine/core';
import type { Workspace } from '@/types/models';

interface GeneralSettingsProps {
  name: string;
  onInputChange: (key: keyof Workspace, value: string) => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  name,
  onInputChange,
}) => {
  return (
    <Box mb="md">
      <Grid gutter="md" align="center">
        <Grid.Col span={6}>
          <Text size="sm">Workspace Name</Text>
        </Grid.Col>
        <Grid.Col span={6}>
          <TextInput
            value={name}
            onChange={(event) =>
              onInputChange('name', event.currentTarget.value)
            }
            placeholder="Enter workspace name"
            required
          />
        </Grid.Col>
      </Grid>
    </Box>
  );
};

export default GeneralSettings;
