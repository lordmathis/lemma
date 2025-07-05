import React, { useState } from 'react';
import {
  Modal,
  Stack,
  Text,
  PasswordInput,
  Group,
  Button,
} from '@mantine/core';

interface DeleteAccountModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  opened,
  onClose,
  onConfirm,
}) => {
  const [password, setPassword] = useState<string>('');

  const handleConfirm = async (): Promise<void> => {
    const trimmedPassword = password.trim();
    if (!trimmedPassword) {
      return;
    }
    try {
      await onConfirm(trimmedPassword);
      setPassword('');
    } catch (error) {
      // Keep password in case of error
      console.error('Error confirming password:', error);
    }
  };

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
          data-testid="delete-account-password-input"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          required
        />
        <Group justify="flex-end" mt="md">
          <Button
            variant="default"
            onClick={onClose}
            data-testid="cancel-delete-account-button"
          >
            Cancel
          </Button>
          <Button
            color="red"
            onClick={() => void handleConfirm()}
            data-testid="confirm-delete-account-button"
          >
            Delete
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default DeleteAccountModal;
