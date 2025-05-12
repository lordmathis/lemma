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
import { CreateUserRequest } from '@/types/adminApi';
import { UserRole } from '@/types/authApi';

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
          onChange={(e) => setEmail(e.currentTarget.value)}
          placeholder="user@example.com"
        />
        <TextInput
          label="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.currentTarget.value)}
          placeholder="John Doe"
        />
        <PasswordInput
          label="Password"
          required
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          placeholder="Enter password"
        />
        <Select
          label="Role"
          required
          value={role}
          onChange={(value) => value && setRole(value as UserRole)}
          data={[
            { value: UserRole.Admin, label: 'Admin' },
            { value: UserRole.Editor, label: 'Editor' },
            { value: UserRole.Viewer, label: 'Viewer' },
          ]}
        />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Create User
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default CreateUserModal;
