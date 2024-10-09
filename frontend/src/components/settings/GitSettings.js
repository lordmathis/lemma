import React from 'react';
import { Text, Switch, TextInput, Stack, PasswordInput } from '@mantine/core';

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
    <Stack spacing="xs" mt="md">
      <Text fw={500} size="lg">
        Git Integration
      </Text>
      <Switch
        label="Enable Git"
        checked={gitEnabled}
        onChange={(event) =>
          onInputChange('gitEnabled', event.currentTarget.checked)
        }
      />
      <TextInput
        label="Git URL"
        value={gitUrl}
        onChange={(event) => onInputChange('gitUrl', event.currentTarget.value)}
        disabled={!gitEnabled}
      />
      <TextInput
        label="Git Username"
        value={gitUser}
        onChange={(event) =>
          onInputChange('gitUser', event.currentTarget.value)
        }
        disabled={!gitEnabled}
      />
      <PasswordInput
        label="Git Token"
        value={gitToken}
        onChange={(event) =>
          onInputChange('gitToken', event.currentTarget.value)
        }
        disabled={!gitEnabled}
      />
      <Switch
        label="Auto Commit"
        checked={gitAutoCommit}
        onChange={(event) =>
          onInputChange('gitAutoCommit', event.currentTarget.checked)
        }
        disabled={!gitEnabled}
      />
      <TextInput
        label="Commit Message Template"
        value={gitCommitMsgTemplate}
        onChange={(event) =>
          onInputChange('gitCommitMsgTemplate', event.currentTarget.value)
        }
        disabled={!gitEnabled}
      />
    </Stack>
  );
};

export default GitSettings;
