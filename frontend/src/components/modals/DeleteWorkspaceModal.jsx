import React from 'react';
import { Modal, Text, Button, Group, Stack } from '@mantine/core';

const DeleteWorkspaceModal = ({
  opened,
  onClose,
  onConfirm,
  workspaceName,
}) => (
  <Modal
    opened={opened}
    onClose={onClose}
    title="Delete Workspace"
    centered
    size="sm"
  >
    <Stack>
      <Text>
        Are you sure you want to delete workspace "{workspaceName}"? This action
        cannot be undone and all files in this workspace will be permanently
        deleted.
      </Text>
      <Group justify="flex-end" mt="xl">
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
        <Button color="red" onClick={onConfirm}>
          Delete Workspace
        </Button>
      </Group>
    </Stack>
  </Modal>
);

export default DeleteWorkspaceModal;
