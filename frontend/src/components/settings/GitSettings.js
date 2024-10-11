import React from 'react';
import {
  Text,
  Switch,
  TextInput,
  Stack,
  PasswordInput,
  Group,
  Title,
  Grid,
} from '@mantine/core';

const GitSettings = ({
  gitEnabled,
  gitUrl,
  gitUser,
  gitToken,
  gitAutoCommit,
  gitCommitMsgTemplate,
  onInputChange,
}) => {
  return (
    <Stack spacing="md">
      <Title order={3}>Git Integration</Title>
      <Grid gutter="md" align="center">
        <Grid.Col span={6}>
          <Text size="sm">Enable Git</Text>
        </Grid.Col>
        <Grid.Col span={6}>
          <Group justify="flex-end">
            <Switch
              checked={gitEnabled}
              onChange={(event) =>
                onInputChange('gitEnabled', event.currentTarget.checked)
              }
            />
          </Group>
        </Grid.Col>

        <Grid.Col span={6}>
          <Text size="sm">Git URL</Text>
        </Grid.Col>
        <Grid.Col span={6}>
          <TextInput
            value={gitUrl}
            onChange={(event) =>
              onInputChange('gitUrl', event.currentTarget.value)
            }
            disabled={!gitEnabled}
            placeholder="Enter Git URL"
          />
        </Grid.Col>

        <Grid.Col span={6}>
          <Text size="sm">Git Username</Text>
        </Grid.Col>
        <Grid.Col span={6}>
          <TextInput
            value={gitUser}
            onChange={(event) =>
              onInputChange('gitUser', event.currentTarget.value)
            }
            disabled={!gitEnabled}
            placeholder="Enter Git username"
          />
        </Grid.Col>

        <Grid.Col span={6}>
          <Text size="sm">Git Token</Text>
        </Grid.Col>
        <Grid.Col span={6}>
          <PasswordInput
            value={gitToken}
            onChange={(event) =>
              onInputChange('gitToken', event.currentTarget.value)
            }
            disabled={!gitEnabled}
            placeholder="Enter Git token"
          />
        </Grid.Col>

        <Grid.Col span={6}>
          <Text size="sm">Auto Commit</Text>
        </Grid.Col>
        <Grid.Col span={6}>
          <Group justify="flex-end">
            <Switch
              checked={gitAutoCommit}
              onChange={(event) =>
                onInputChange('gitAutoCommit', event.currentTarget.checked)
              }
              disabled={!gitEnabled}
            />
          </Group>
        </Grid.Col>

        <Grid.Col span={6}>
          <Text size="sm">Commit Message Template</Text>
        </Grid.Col>
        <Grid.Col span={6}>
          <TextInput
            value={gitCommitMsgTemplate}
            onChange={(event) =>
              onInputChange('gitCommitMsgTemplate', event.currentTarget.value)
            }
            disabled={!gitEnabled}
            placeholder="Enter commit message template"
          />
        </Grid.Col>
      </Grid>
    </Stack>
  );
};

export default GitSettings;
