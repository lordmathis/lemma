import React from 'react';
import { Modal, Text, Button, Group, Stack } from '@mantine/core';
import type { User } from '@/types/models';

interface DeleteUserModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  user: User | null;
  loading: boolean;
}

const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  opened,
  onClose,
  onConfirm,
  user,
  loading,
}) => (
  <Modal
    opened={opened}
    onClose={onClose}
    title="Delete User"
    centered
    size="sm"
  >
    <Stack>
      <Text>
        Are you sure you want to delete user &quot;{user?.email}&quot;? This
        action cannot be undone and all associated data will be permanently
        deleted.
      </Text>
      <Group justify="flex-end" mt="xl">
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
        <Button color="red" onClick={() => void onConfirm()} loading={loading}>
          Delete User
        </Button>
      </Group>
    </Stack>
  </Modal>
);

export default DeleteUserModal;
