import React, { useState } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  PasswordInput,
  Select,
  Button,
  Group,
} from '@mantine/core';
import type { CreateUserRequest } from '@/types/api';
import { UserRole } from '@/types/models';

interface CreateUserModalProps {
  opened: boolean;
  onClose: () => void;
  onCreateUser: (userData: CreateUserRequest) => Promise<boolean>;
  loading: boolean;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({
  opened,
  onClose,
  onCreateUser,
  loading,
}) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [role, setRole] = useState<UserRole>(UserRole.Viewer);

  const handleSubmit = async (): Promise<void> => {
    const userData: CreateUserRequest = {
      email,
      password,
      displayName,
      role,
    };

    const success = await onCreateUser(userData);
    if (success) {
      setEmail('');
      setPassword('');
      setDisplayName('');
      setRole(UserRole.Viewer);
      onClose();
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Create New User" centered>
      <Stack>
        <TextInput
          label="Email"
          required
          value={email}
          data-testid="create-user-email-input"
          onChange={(e) => setEmail(e.currentTarget.value)}
          placeholder="user@example.com"
        />
        <TextInput
          label="Display Name"
          value={displayName}
          data-testid="create-user-display-name-input"
          onChange={(e) => setDisplayName(e.currentTarget.value)}
          placeholder="John Doe"
        />
        <PasswordInput
          label="Password"
          required
          value={password}
          data-testid="create-user-password-input"
          onChange={(e) => setPassword(e.currentTarget.value)}
          placeholder="Enter password"
        />
        <Select
          label="Role"
          required
          value={role}
          data-testid="create-user-role-select"
          onChange={(value) => value && setRole(value as UserRole)}
          data={[
            { value: UserRole.Admin, label: 'Admin' },
            { value: UserRole.Editor, label: 'Editor' },
            { value: UserRole.Viewer, label: 'Viewer' },
          ]}
        />
        <Group justify="flex-end" mt="md">
          <Button
            variant="default"
            onClick={onClose}
            data-testid="cancel-create-user-button"
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit}
            loading={loading}
            data-testid="confirm-create-user-button"
          >
            Create User
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default CreateUserModal;
