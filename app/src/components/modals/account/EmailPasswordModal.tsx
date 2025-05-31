import React, { useState } from 'react';
import {
  Modal,
  Text,
  Button,
  Group,
  Stack,
  PasswordInput,
} from '@mantine/core';

interface EmailPasswordModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<boolean>;
  email: string;
}

const EmailPasswordModal: React.FC<EmailPasswordModalProps> = ({
  opened,
  onClose,
  onConfirm,
  email,
}) => {
  const [password, setPassword] = useState<string>('');

  async function handleConfirm(): Promise<void> {
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
  }

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleConfirm();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Confirm Password"
      centered
      size="sm"
    >
      <Stack>
        <Text size="sm" data-testid="email-password-message">
          {`Please enter your password to confirm changing your email to: ${email}`}
        </Text>
        <PasswordInput
          label="Current Password"
          placeholder="Enter your current password"
          data-testid="email-password-input"
          value={password}
          onKeyDown={handleKeyDown}
          onChange={(e) => setPassword(e.currentTarget.value)}
          required
        />
        <Group justify="flex-end" mt="md">
          <Button
            variant="default"
            onClick={onClose}
            data-testid="cancel-email-password-button"
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            data-testid="confirm-email-password-button"
            disabled={!password.trim()}
          >
            Confirm
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default EmailPasswordModal;
