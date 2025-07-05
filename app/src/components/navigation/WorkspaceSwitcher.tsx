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
  ActionIcon,
  Tooltip,
  useMantineTheme,
} from '@mantine/core';
import { IconFolders, IconSettings, IconFolderPlus } from '@tabler/icons-react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { useModalContext } from '../../contexts/ModalContext';
import { listWorkspaces } from '../../api/workspace';
import CreateWorkspaceModal from '../modals/workspace/CreateWorkspaceModal';
import type { Workspace } from '@/types/models';
import {
  getConditionalColor,
  getWorkspacePaperStyle,
} from '@/utils/themeStyles';

const WorkspaceSwitcher: React.FC = () => {
  const { currentWorkspace, switchWorkspace } = useWorkspace();
  const { setSettingsModalVisible, setCreateWorkspaceModalVisible } =
    useModalContext();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [popoverOpened, setPopoverOpened] = useState<boolean>(false);
  const theme = useMantineTheme();

  const loadWorkspaces = async (): Promise<void> => {
    setLoading(true);
    try {
      const list = await listWorkspaces();
      setWorkspaces(list);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    }
    setLoading(false);
  };

  const handleCreateWorkspace = (): void => {
    setPopoverOpened(false);
    setCreateWorkspaceModalVisible(true);
  };

  const handleWorkspaceCreated = async (
    newWorkspace: Workspace
  ): Promise<void> => {
    await loadWorkspaces();
    await switchWorkspace(newWorkspace.name);
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
                void loadWorkspaces();
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

        <Popover.Dropdown p="xs">
          <Group justify="space-between" mb="md" px="xs">
            <Text size="sm" fw={600}>
              Workspaces
            </Text>
            <Tooltip label="Create New Workspace">
              <ActionIcon
                variant="default"
                size="md"
                aria-label="Create New Workspace"
                onClick={handleCreateWorkspace}
              >
                <IconFolderPlus size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <ScrollArea.Autosize mah={400} offsetScrollbars>
            <Stack gap="xs">
              {loading ? (
                <Center p="md">
                  <Loader size="sm" />
                </Center>
              ) : (
                workspaces.map((workspace) => {
                  const isSelected = workspace.name === currentWorkspace?.name;
                  return (
                    <Paper
                      key={workspace.name}
                      p="xs"
                      withBorder
                      style={(theme) =>
                        getWorkspacePaperStyle(theme, isSelected)
                      }
                    >
                      <Group justify="space-between" wrap="nowrap">
                        <UnstyledButton
                          style={{ flex: 1 }}
                          onClick={() => {
                            void switchWorkspace(workspace.name);
                            setPopoverOpened(false);
                          }}
                        >
                          <Box>
                            <Text
                              size="sm"
                              fw={500}
                              truncate
                              c={isSelected ? 'blue' : 'inherit'}
                            >
                              {workspace.name}
                            </Text>
                            <Text
                              size="xs"
                              c={getConditionalColor(theme, isSelected)}
                            >
                              {new Date(
                                workspace.createdAt
                              ).toLocaleDateString()}
                            </Text>
                          </Box>
                        </UnstyledButton>
                        {isSelected && (
                          <Tooltip label="Workspace Settings">
                            <ActionIcon
                              variant="subtle"
                              size="lg"
                              color={getConditionalColor(theme, true)}
                              aria-label="Workspace Settings"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSettingsModalVisible(true);
                                setPopoverOpened(false);
                              }}
                            >
                              <IconSettings size={18} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </Paper>
                  );
                })
              )}
            </Stack>
          </ScrollArea.Autosize>
        </Popover.Dropdown>
      </Popover>
      <CreateWorkspaceModal onWorkspaceCreated={handleWorkspaceCreated} />
    </>
  );
};

export default WorkspaceSwitcher;
