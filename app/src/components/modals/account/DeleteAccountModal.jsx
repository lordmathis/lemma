import React, { useState } from 'react';
import {
  Modal,
  Stack,
  Text,
  PasswordInput,
  Group,
  Button,
} from '@mantine/core';

const DeleteAccountModal = ({ opened, onClose, onConfirm }) => {
  const [password, setPassword] = useState('');

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Delete Account"
      centered
      size="sm"
    >
      <Stack>
        <Text c="red" fw={500}>
          Warning: This action cannot be undone
        </Text>
        <Text size="sm">
          Please enter your password to confirm account deletion.
        </Text>
        <PasswordInput
          label="Current Password"
          placeholder="Enter your current password"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          required
        />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={() => {
              onConfirm(password);
              setPassword('');
            }}
          >
            Delete Account
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default DeleteAccountModal;
