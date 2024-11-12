import React from 'react';
import { Modal, Text, Button, Group, Stack } from '@mantine/core';

const DeleteUserModal = ({ opened, onClose, onConfirm, user, loading }) => (
  <Modal
    opened={opened}
    onClose={onClose}
    title="Delete User"
    centered
    size="sm"
  >
    <Stack>
      <Text>
        Are you sure you want to delete user "{user?.email}"? This action cannot
        be undone and all associated data will be permanently deleted.
      </Text>
      <Group justify="flex-end" mt="xl">
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
        <Button color="red" onClick={onConfirm} loading={loading}>
          Delete User
        </Button>
      </Group>
    </Stack>
  </Modal>
);

export default DeleteUserModal;
