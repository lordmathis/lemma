import React from 'react';
import {
  Text,
  Switch,
  TextInput,
  Stack,
  PasswordInput,
  Group,
  Box,
  Title,
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
      <Group justify="space-between" align="center">
        <Text size="sm">Enable Git</Text>
        <Switch
          checked={gitEnabled}
          onChange={(event) =>
            onInputChange('gitEnabled', event.currentTarget.checked)
          }
        />
      </Group>
      <Box>
        <Text size="sm" mb="xs">
          Git URL
        </Text>
        <TextInput
          value={gitUrl}
          onChange={(event) =>
            onInputChange('gitUrl', event.currentTarget.value)
          }
          disabled={!gitEnabled}
          placeholder="Enter Git URL"
        />
      </Box>
      <Box>
        <Text size="sm" mb="xs">
          Git Username
        </Text>
        <TextInput
          value={gitUser}
          onChange={(event) =>
            onInputChange('gitUser', event.currentTarget.value)
          }
          disabled={!gitEnabled}
          placeholder="Enter Git username"
        />
      </Box>
      <Box>
        <Text size="sm" mb="xs">
          Git Token
        </Text>
        <PasswordInput
          value={gitToken}
          onChange={(event) =>
            onInputChange('gitToken', event.currentTarget.value)
          }
          disabled={!gitEnabled}
          placeholder="Enter Git token"
        />
      </Box>
      <Group justify="space-between" align="center">
        <Text size="sm">Auto Commit</Text>
        <Switch
          checked={gitAutoCommit}
          onChange={(event) =>
            onInputChange('gitAutoCommit', event.currentTarget.checked)
          }
          disabled={!gitEnabled}
        />
      </Group>
      <Box>
        <Text size="sm" mb="xs">
          Commit Message Template
        </Text>
        <TextInput
          value={gitCommitMsgTemplate}
          onChange={(event) =>
            onInputChange('gitCommitMsgTemplate', event.currentTarget.value)
          }
          disabled={!gitEnabled}
          placeholder="Enter commit message template"
        />
      </Box>
    </Stack>
  );
};

export default GitSettings;
