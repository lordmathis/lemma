import React, { useState } from 'react';
import {
  Box,
  Popover,
  Stack,
  Paper,
  ScrollArea,
  Group,
  UnstyledButton,
  Text,
  Loader,
  Center,
  Button,
  ActionIcon,
} from '@mantine/core';
import { IconFolders, IconSettings, IconFolderPlus } from '@tabler/icons-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useModalContext } from '../contexts/ModalContext';
import { listWorkspaces } from '../services/api';
import CreateWorkspaceModal from './modals/CreateWorkspaceModal';

const WorkspaceSwitcher = () => {
  const { currentWorkspace, switchWorkspace } = useWorkspace();
  const { setSettingsModalVisible, setCreateWorkspaceModalVisible } =
    useModalContext();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [popoverOpened, setPopoverOpened] = useState(false);

  const loadWorkspaces = async () => {
    setLoading(true);
    try {
      const list = await listWorkspaces();
      setWorkspaces(list);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    }
    setLoading(false);
  };

  const handleCreateWorkspace = () => {
    setPopoverOpened(false);
    setCreateWorkspaceModalVisible(true);
  };

  const handleWorkspaceCreated = async (newWorkspace) => {
    await loadWorkspaces();
    switchWorkspace(newWorkspace.id);
  };

  return (
    <>
      <Popover
        width={300}
        position="bottom-start"
        shadow="md"
        opened={popoverOpened}
        onChange={setPopoverOpened}
      >
        <Popover.Target>
          <UnstyledButton
            onClick={() => {
              setPopoverOpened((o) => !o);
              if (!popoverOpened) {
                loadWorkspaces();
              }
            }}
          >
            <Group gap="xs">
              <IconFolders size={20} />
              <div>
                <Text size="sm" fw={500}>
                  {currentWorkspace?.name || 'No workspace'}
                </Text>
              </div>
            </Group>
          </UnstyledButton>
        </Popover.Target>

        <Popover.Dropdown>
          <Text size="sm" fw={600} mb="md">
            Switch Workspace
          </Text>
          <ScrollArea.Autosize mah={400} mb="md" offsetScrollbars>
            <Stack gap="xs">
              {loading ? (
                <Center p="md">
                  <Loader size="sm" />
                </Center>
              ) : (
                workspaces.map((workspace) => (
                  <UnstyledButton
                    key={workspace.id}
                    onClick={() => {
                      switchWorkspace(workspace.id);
                      setPopoverOpened(false);
                    }}
                  >
                    <Paper
                      p="xs"
                      withBorder={workspace.id === currentWorkspace?.id}
                      bg={
                        workspace.id === currentWorkspace?.id
                          ? 'var(--mantine-color-blue-light)'
                          : undefined
                      }
                    >
                      <Group justify="space-between" wrap="nowrap">
                        <Box>
                          <Text size="sm" fw={500} truncate>
                            {workspace.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {new Date(workspace.createdAt).toLocaleDateString()}
                          </Text>
                        </Box>
                        {workspace.id === currentWorkspace?.id && (
                          <ActionIcon
                            variant="subtle"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSettingsModalVisible(true);
                              setPopoverOpened(false);
                            }}
                          >
                            <IconSettings size={14} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Paper>
                  </UnstyledButton>
                ))
              )}
            </Stack>
          </ScrollArea.Autosize>
          <Button
            variant="light"
            leftSection={<IconFolderPlus size={14} />}
            fullWidth
            onClick={handleCreateWorkspace}
          >
            Create Workspace
          </Button>
        </Popover.Dropdown>
      </Popover>
      <CreateWorkspaceModal onWorkspaceCreated={handleWorkspaceCreated} />
    </>
  );
};

export default WorkspaceSwitcher;
