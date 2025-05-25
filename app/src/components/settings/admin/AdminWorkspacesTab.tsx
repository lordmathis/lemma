import React from 'react';
import { Table, Group, Text, Box, LoadingOverlay, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useAdminData } from '../../../hooks/useAdminData';
import { formatBytes } from '../../../utils/formatBytes';
import type { FileCountStats, WorkspaceStats } from '@/types/models';

const AdminWorkspacesTab: React.FC = () => {
  const {
    data: workspaces,
    loading,
    error,
  } = useAdminData<'workspaces'>('workspaces');

  const renderWorkspaceRow = (workspace: WorkspaceStats) => {
    const fileStats: FileCountStats = workspace.fileCountStats || {
      totalFiles: 0,
      totalSize: 0,
    };

    return (
      <Table.Tr key={workspace.workspaceID}>
        <Table.Td>{workspace.userEmail}</Table.Td>
        <Table.Td>{workspace.workspaceName}</Table.Td>
        <Table.Td>
          {new Date(workspace.workspaceCreatedAt).toLocaleDateString()}
        </Table.Td>
        <Table.Td>{fileStats.totalFiles}</Table.Td>
        <Table.Td>{formatBytes(fileStats.totalSize)}</Table.Td>
      </Table.Tr>
    );
  };

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
        <Table.Tbody>
          {!loading && !error && workspaces.map(renderWorkspaceRow)}
        </Table.Tbody>
      </Table>
    </Box>
  );
};

export default AdminWorkspacesTab;
