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
import { useAdminData } from '../../../hooks/useAdminData';
import { formatBytes } from '../../../utils/formatBytes';

const AdminWorkspacesTab = () => {
  const { data: workspaces, loading, error } = useAdminData('workspaces');

  const rows = workspaces.map((workspace) => (
    <Table.Tr key={workspace.id}>
      <Table.Td>{workspace.userEmail}</Table.Td>
      <Table.Td>{workspace.workspaceName}</Table.Td>
      <Table.Td>
        {new Date(workspace.workspaceCreatedAt).toLocaleDateString()}
      </Table.Td>
      <Table.Td>{workspace.totalFiles}</Table.Td>
      <Table.Td>{formatBytes(workspace.totalSize)}</Table.Td>
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
            <Table.Th>Owner</Table.Th>
            <Table.Th>Name</Table.Th>
            <Table.Th>Created At</Table.Th>
            <Table.Th>Total Files</Table.Th>
            <Table.Th>Total Size</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </Box>
  );
};

export default AdminWorkspacesTab;
