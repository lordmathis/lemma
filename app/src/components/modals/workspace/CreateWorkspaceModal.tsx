import React, { useState } from 'react';
import { Modal, TextInput, Button, Group, Box } from '@mantine/core';
import { useModalContext } from '../../../contexts/ModalContext';
import { notifications } from '@mantine/notifications';
import type { Workspace } from '@/types/models';
import { createWorkspace } from '@/api/workspace';

interface CreateWorkspaceModalProps {
  onWorkspaceCreated?: (workspace: Workspace) => Promise<void>;
}

const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  onWorkspaceCreated,
}) => {
  const [name, setName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const { createWorkspaceModalVisible, setCreateWorkspaceModalVisible } =
    useModalContext();

  const handleSubmit = async (): Promise<void> => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      notifications.show({
        title: 'Error',
        message: 'Workspace name is required',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const workspace = await createWorkspace(trimmedName);
      notifications.show({
        title: 'Success',
        message: 'Workspace created successfully',
        color: 'green',
      });
      setName('');
      setCreateWorkspaceModalVisible(false);
      if (onWorkspaceCreated) {
        await onWorkspaceCreated(workspace);
      }
    } catch (_error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to create workspace',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={createWorkspaceModalVisible}
      onClose={() => setCreateWorkspaceModalVisible(false)}
      title="Create New Workspace"
      centered
      size="sm"
    >
      <Box maw={400} mx="auto">
        <TextInput
          type="text"
          label="Workspace Name"
          placeholder="Enter workspace name"
          data-testid="workspace-name-input"
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          mb="md"
          w="100%"
          disabled={loading}
        />
        <Group justify="flex-end" mt="md">
          <Button
            variant="default"
            onClick={() => setCreateWorkspaceModalVisible(false)}
            disabled={loading}
            data-testid="cancel-create-workspace-button"
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            loading={loading}
            data-testid="confirm-create-workspace-button"
          >
            Create
          </Button>
        </Group>
      </Box>
    </Modal>
  );
};

export default CreateWorkspaceModal;
