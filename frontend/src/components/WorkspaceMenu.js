import React from 'react';
import { Menu, ActionIcon, Text } from '@mantine/core';
import {
  IconFolders,
  IconFolderPlus,
  IconSwitchHorizontal,
  IconSettings,
  IconTrash,
  IconPencil,
  IconFileExport,
  IconFileImport,
} from '@tabler/icons-react';
import { useModalContext } from '../contexts/ModalContext';
import { useWorkspace } from '../contexts/WorkspaceContext';

const WorkspaceMenu = () => {
  const { setSettingsModalVisible } = useModalContext();
  const { currentWorkspace } = useWorkspace();

  const openSettings = () => setSettingsModalVisible(true);

  return (
    <Menu shadow="md" width={200} position="bottom-end">
      <Menu.Target>
        <ActionIcon variant="subtle" size="lg">
          <IconFolders size={24} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Current Workspace</Menu.Label>
        <Menu.Item disabled>
          <Text size="sm" truncate>
            {currentWorkspace?.name || 'No workspace selected'}
          </Text>
        </Menu.Item>

        <Menu.Divider />

        <Menu.Label>Workspace Actions</Menu.Label>
        <Menu.Item leftSection={<IconFolderPlus size={14} />}>
          Create Workspace
        </Menu.Item>
        <Menu.Item leftSection={<IconSwitchHorizontal size={14} />}>
          Switch Workspace
        </Menu.Item>
        <Menu.Item leftSection={<IconPencil size={14} />}>
          Rename Workspace
        </Menu.Item>
        <Menu.Item leftSection={<IconTrash size={14} />} color="red">
          Delete Workspace
        </Menu.Item>

        <Menu.Divider />

        <Menu.Label>Data Management</Menu.Label>
        <Menu.Item leftSection={<IconFileExport size={14} />}>
          Export Workspace
        </Menu.Item>
        <Menu.Item leftSection={<IconFileImport size={14} />}>
          Import Workspace
        </Menu.Item>

        <Menu.Divider />

        <Menu.Item
          leftSection={<IconSettings size={14} />}
          onClick={openSettings}
        >
          Workspace Settings
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

export default WorkspaceMenu;
