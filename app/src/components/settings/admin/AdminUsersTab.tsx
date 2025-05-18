import React, { useState } from 'react';
import {
  Table,
  Button,
  Group,
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
import { notifications } from '@mantine/notifications';
import { useUserAdmin } from '../../../hooks/useUserAdmin';
import CreateUserModal from '../../modals/user/CreateUserModal';
import EditUserModal from '../../modals/user/EditUserModal';
import DeleteUserModal from '../../modals/user/DeleteUserModal';
import { User } from '../../../types/authApi';
import { CreateUserRequest, UpdateUserRequest } from '../../../types/adminApi';

interface AdminUsersTabProps {
  currentUser: User;
}

const AdminUsersTab: React.FC<AdminUsersTabProps> = ({ currentUser }) => {
  const {
    users,
    loading,
    error,
    create,
    update,
    delete: deleteUser,
  } = useUserAdmin();

  const [createModalOpened, setCreateModalOpened] = useState<boolean>(false);
  const [editModalData, setEditModalData] = useState<User | null>(null);
  const [deleteModalData, setDeleteModalData] = useState<User | null>(null);

  const handleCreateUser = async (
    userData: CreateUserRequest
  ): Promise<boolean> => {
    return await create(userData);
  };

  const handleEditUser = async (
    id: number,
    userData: UpdateUserRequest
  ): Promise<boolean> => {
    return await update(id, userData);
  };

  const handleDeleteClick = (user: User): void => {
    if (user.id === currentUser.id) {
      notifications.show({
        title: 'Error',
        message: 'You cannot delete your own account',
        color: 'red',
      });
      return;
    }
    setDeleteModalData(user);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!deleteModalData) return;
    const success = await deleteUser(deleteModalData.id);
    if (success) {
      setDeleteModalData(null);
    }
  };

  const renderUserRow = (user: User) => (
    <Table.Tr key={user.id}>
      <Table.Td>{user.email}</Table.Td>
      <Table.Td>{user.displayName}</Table.Td>
      <Table.Td>
        <Text style={{ textTransform: 'capitalize' }}>{user.role}</Text>
      </Table.Td>
      <Table.Td>{new Date(user.createdAt).toLocaleDateString()}</Table.Td>
      <Table.Td>
        <Group gap="xs" justify="flex-end">
          <ActionIcon
            variant="subtle"
            color="blue"
            onClick={() => setEditModalData(user)}
          >
            <IconEdit size={16} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={() => handleDeleteClick(user)}
            disabled={user.id === currentUser.id}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  );

  return (
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
        <Table.Tbody>{users.map(renderUserRow)}</Table.Tbody>
      </Table>

      <CreateUserModal
        opened={createModalOpened}
        onClose={() => setCreateModalOpened(false)}
        onCreateUser={handleCreateUser}
        loading={loading}
      />

      <EditUserModal
        opened={!!editModalData}
        onClose={() => setEditModalData(null)}
        onEditUser={handleEditUser}
        user={editModalData}
        loading={loading}
      />

      <DeleteUserModal
        opened={!!deleteModalData}
        onClose={() => setDeleteModalData(null)}
        onConfirm={handleDeleteConfirm}
        user={deleteModalData}
        loading={loading}
      />
    </Box>
  );
};

export default AdminUsersTab;
