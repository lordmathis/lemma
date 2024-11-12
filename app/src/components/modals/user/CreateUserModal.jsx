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

const CreateUserModal = ({ opened, onClose, onCreateUser, loading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('viewer');

  const handleSubmit = async () => {
    const result = await onCreateUser({ email, password, displayName, role });
    if (result.success) {
      setEmail('');
      setPassword('');
      setDisplayName('');
      setRole('viewer');
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
          onChange={setRole}
          data={[
            { value: 'admin', label: 'Admin' },
            { value: 'editor', label: 'Editor' },
            { value: 'viewer', label: 'Viewer' },
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
