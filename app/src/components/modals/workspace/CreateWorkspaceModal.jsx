import React, { useState } from 'react';
import { Modal, TextInput, Button, Group, Box } from '@mantine/core';
import { useModalContext } from '../../../contexts/ModalContext';
import { createWorkspace } from '../../../services/api';
import { notifications } from '@mantine/notifications';

const CreateWorkspaceModal = ({ onWorkspaceCreated }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { createWorkspaceModalVisible, setCreateWorkspaceModalVisible } =
    useModalContext();

  const handleSubmit = async () => {
    if (!name.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Workspace name is required',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const workspace = await createWorkspace(name);
      notifications.show({
        title: 'Success',
        message: 'Workspace created successfully',
        color: 'green',
      });
      setName('');
      setCreateWorkspaceModalVisible(false);
      if (onWorkspaceCreated) {
        onWorkspaceCreated(workspace);
      }
    } catch (error) {
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
          label="Workspace Name"
          placeholder="Enter workspace name"
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
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Create
          </Button>
        </Group>
      </Box>
    </Modal>
  );
};

export default CreateWorkspaceModal;
