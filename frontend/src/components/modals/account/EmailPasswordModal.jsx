import React, { useState } from 'react';
import {
  Modal,
  Text,
  Button,
  Group,
  Stack,
  PasswordInput,
} from '@mantine/core';

const EmailPasswordModal = ({ opened, onClose, onConfirm, email }) => {
  const [password, setPassword] = useState('');

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
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          required
        />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirm(password);
              setPassword('');
            }}
          >
            Confirm
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default EmailPasswordModal;
