import React from 'react';
import { Modal, Text, Button, Group, Stack } from '@mantine/core';

interface DeleteUserModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  workspaceName: string | undefined;
}

const DeleteWorkspaceModal: React.FC<DeleteUserModalProps> = ({
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
        Are you sure you want to delete workspace &quot;{workspaceName}&quot;?
        This action cannot be undone and all files in this workspace will be
        permanently deleted.
      </Text>
      <Group justify="flex-end" mt="xl">
        <Button
          variant="default"
          onClick={onClose}
          data-testid="cancel-delete-workspace-button"
        >
          Cancel
        </Button>
        <Button
          color="red"
          onClick={() => void onConfirm()}
          data-testid="confirm-delete-workspace-button"
        >
          Delete
        </Button>
      </Group>
    </Stack>
  </Modal>
);

export default DeleteWorkspaceModal;
