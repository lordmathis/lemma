import React from 'react';
import {
  Table,
  Group,
  Text,
  ActionIcon,
  Box,
  LoadingOverlay,
  Alert,
} from '@mantine/core';
import { IconTrash, IconEdit, IconAlertCircle } from '@tabler/icons-react';
import { useAdmin } from '../../../hooks/useAdmin';

const AdminWorkspacesTab = () => {
  const { data: workspaces, loading, error } = useAdmin('workspaces');

  const rows = workspaces.map((workspace) => (
    <Table.Tr key={workspace.id}>
      <Table.Td>{workspace.name}</Table.Td>
      <Table.Td>{workspace.owner?.email}</Table.Td>
      <Table.Td>{new Date(workspace.createdAt).toLocaleDateString()}</Table.Td>
      <Table.Td>{workspace.gitEnabled ? 'Yes' : 'No'}</Table.Td>
      <Table.Td>
        <Group gap="xs" justify="flex-end">
          <ActionIcon variant="subtle" color="blue">
            <IconEdit size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red">
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

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
          Workspace Management
        </Text>
      </Group>

      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Owner</Table.Th>
            <Table.Th>Created At</Table.Th>
            <Table.Th>Git Enabled</Table.Th>
            <Table.Th style={{ width: 100 }}>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </Box>
  );
};

export default AdminWorkspacesTab;
