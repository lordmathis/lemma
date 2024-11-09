import React from 'react';
import { Table, Text, Box, LoadingOverlay, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useAdmin } from '../../../hooks/useAdmin';

const formatBytes = (bytes) => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const AdminStatsTab = () => {
  const { data: stats, loading, error } = useAdmin('stats');

  if (loading) {
    return <LoadingOverlay visible={true} />;
  }

  if (error) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
        {error}
      </Alert>
    );
  }

  const statsRows = [
    { label: 'Total Users', value: stats.totalUsers },
    { label: 'Active Users', value: stats.activeUsers },
    { label: 'Total Workspaces', value: stats.totalWorkspaces },
    { label: 'Total Files', value: stats.totalFiles },
    { label: 'Total Storage Size', value: formatBytes(stats.totalSize) },
  ];

  return (
    <Box pos="relative">
      <Text size="xl" fw={700} mb="md">
        System Statistics
      </Text>

      <Table striped highlightOnHover withBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Metric</Table.Th>
            <Table.Th>Value</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {statsRows.map((row) => (
            <Table.Tr key={row.label}>
              <Table.Td>{row.label}</Table.Td>
              <Table.Td>{row.value}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Box>
  );
};

export default AdminStatsTab;