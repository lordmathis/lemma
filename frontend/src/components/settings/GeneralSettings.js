import React from 'react';
import { Title, Box, TextInput, Text, Grid } from '@mantine/core';
import { useWorkspace } from '../../contexts/WorkspaceContext';

const GeneralSettings = ({ onInputChange }) => {
  const { currentWorkspace } = useWorkspace();

  return (
    <Box mb="md">
      <Title order={3} mb="md">
        General
      </Title>

      <Grid gutter="md" align="center">
        <Grid.Col span={6}>
          <Text size="sm">Workspace Name</Text>
        </Grid.Col>
        <Grid.Col span={6}>
          <TextInput
            value={currentWorkspace?.name || ''}
            onChange={(event) =>
              onInputChange('name', event.currentTarget.value)
            }
            placeholder="Enter workspace name"
          />
        </Grid.Col>
      </Grid>
    </Box>
  );
};

export default GeneralSettings;
