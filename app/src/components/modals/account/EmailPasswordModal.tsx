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
  onConfirm: (password: string) => Promise<void>;
  email: string;
}

const EmailPasswordModal: React.FC<EmailPasswordModalProps> = ({
  opened,
  onClose,
  onConfirm,
  email,
}) => {
  const [password, setPassword] = useState<string>('');

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Confirm Password"
      centered
      size="sm"
    >
      <Stack>
        <Text size="sm">
          Please enter your password to confirm changing your email to: {email}
        </Text>
        <PasswordInput
          label="Current Password"
          placeholder="Enter your current password"
          data-testid="email-password-input"
          value={password}
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
            onClick={() => {
              void onConfirm(password);
              setPassword('');
            }}
            data-testid="confirm-email-password-button"
          >
            Confirm
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default EmailPasswordModal;
