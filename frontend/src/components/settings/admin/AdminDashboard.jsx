import React, { useState } from 'react';
import {
  Modal,
  Table,
  Button,
  Group,
  TextInput,
  PasswordInput,
  Select,
  Stack,
  Text,
  ActionIcon,
  Box,
  LoadingOverlay,
  Alert,
} from '@mantine/core';
import {
  IconTrash,
  IconEdit,
  IconPlus,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useAdmin } from '../../../hooks/useAdmin';
import { useAuth } from '../../../contexts/AuthContext';

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

const AdminDashboard = ({ opened, onClose }) => {
  const {
    data: users,
    loading,
    error,
    create,
    delete: deleteUser,
  } = useAdmin('users');
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const { user: currentUser } = useAuth();

  const handleCreateUser = async (userData) => {
    return await create(userData);
  };

  const handleDeleteUser = async (userId) => {
    if (userId === currentUser.id) {
      notifications.show({
        title: 'Error',
        message: 'You cannot delete your own account',
        color: 'red',
      });
      return;
    }

    return await deleteUser(userId);
  };

  const rows = users.map((user) => (
    <Table.Tr key={user.id}>
      <Table.Td>{user.email}</Table.Td>
      <Table.Td>{user.displayName}</Table.Td>
      <Table.Td>
        <Text transform="capitalize">{user.role}</Text>
      </Table.Td>
      <Table.Td>{new Date(user.createdAt).toLocaleDateString()}</Table.Td>
      <Table.Td>
        <Group gap="xs" justify="flex-end">
          <ActionIcon variant="subtle" color="blue">
            <IconEdit size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={() => handleDeleteUser(user.id)}
            disabled={user.id === currentUser.id}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Modal opened={opened} onClose={onClose} size="xl" title="Admin Dashboard">
      <Box pos="relative">
        <LoadingOverlay visible={loading} />

        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Error"
            color="red"
            mb="md"
          >
            {error}
          </Alert>
        )}

        <Group justify="space-between" mb="md">
          <Text size="xl" fw={700}>
            User Management
          </Text>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setCreateModalOpened(true)}
          >
            Create User
          </Button>
        </Group>

        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Email</Table.Th>
              <Table.Th>Display Name</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Created At</Table.Th>
              <Table.Th style={{ width: 100 }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>

        <CreateUserModal
          opened={createModalOpened}
          onClose={() => setCreateModalOpened(false)}
          onCreateUser={handleCreateUser}
          loading={loading}
        />
      </Box>
    </Modal>
  );
};

export default AdminDashboard;
