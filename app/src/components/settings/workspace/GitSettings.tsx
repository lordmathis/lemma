import React from 'react';
import {
  Text,
  Switch,
  TextInput,
  Stack,
  PasswordInput,
  Group,
  Grid,
} from '@mantine/core';
import type { Workspace } from '@/types/models';

interface GitSettingsProps {
  gitEnabled: boolean;
  gitUrl: string;
  gitUser: string;
  gitToken: string;
  gitAutoCommit: boolean;
  gitCommitMsgTemplate: string;
  gitCommitName: string;
  gitCommitEmail: string;
  onInputChange: (key: keyof Workspace, value: string | boolean) => void;
}

const GitSettings: React.FC<GitSettingsProps> = ({
  gitEnabled,
  gitUrl,
  gitUser,
  gitToken,
  gitAutoCommit,
  gitCommitMsgTemplate,
  gitCommitName,
  gitCommitEmail,
  onInputChange,
}) => {
  return (
    <Stack gap="md">
      <Grid gutter="md" align="center">
        <Grid.Col span={6}>
          <Text size="sm">Enable Git Repository</Text>
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
            description="The URL of your Git repository"
            onChange={(event) =>
              onInputChange('gitUrl', event.currentTarget.value)
            }
            disabled={!gitEnabled}
            placeholder="Enter Git URL"
          />
        </Grid.Col>

        <Grid.Col span={6}>
          <Text size="sm">Username</Text>
        </Grid.Col>
        <Grid.Col span={6}>
          <TextInput
            value={gitUser}
            description="The username used to authenticate with the repository"
            onChange={(event) =>
              onInputChange('gitUser', event.currentTarget.value)
            }
            disabled={!gitEnabled}
            placeholder="Enter Git username"
          />
        </Grid.Col>

        <Grid.Col span={6}>
          <Text size="sm">Access Token</Text>
        </Grid.Col>
        <Grid.Col span={6}>
          <PasswordInput
            value={gitToken}
            description="Personal access token with repository read/write permissions"
            onChange={(event) =>
              onInputChange('gitToken', event.currentTarget.value)
            }
            disabled={!gitEnabled}
            placeholder="Enter Git token"
          />
        </Grid.Col>

        <Grid.Col span={6}>
          <Text size="sm">Commit on Save</Text>
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
            description="Template for automated commit messages. Use ${filename} and ${action} as a placeholder."
            onChange={(event) =>
              onInputChange('gitCommitMsgTemplate', event.currentTarget.value)
            }
            disabled={!gitEnabled}
            placeholder="Enter commit message template"
          />
        </Grid.Col>

        <Grid.Col span={6}>
          <Text size="sm">Commit Author</Text>
        </Grid.Col>
        <Grid.Col span={6}>
          <TextInput
            value={gitCommitName}
            description="Name to appear in commit history. Leave empty to use Git username."
            onChange={(event) =>
              onInputChange('gitCommitName', event.currentTarget.value)
            }
            disabled={!gitEnabled}
            placeholder="Enter commit author name."
          />
        </Grid.Col>

        <Grid.Col span={6}>
          <Text size="sm">Commit Author Email</Text>
        </Grid.Col>
        <Grid.Col span={6}>
          <TextInput
            value={gitCommitEmail}
            description="Email address to associate with your commits"
            onChange={(event) =>
              onInputChange('gitCommitEmail', event.currentTarget.value)
            }
            disabled={!gitEnabled}
            placeholder="Enter commit author email."
          />
        </Grid.Col>
      </Grid>
    </Stack>
  );
};

export default GitSettings;
