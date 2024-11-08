import React from 'react';
import {
  Grid,
  Card,
  Stack,
  Text,
  Title,
  LoadingOverlay,
  Alert,
  RingProgress,
} from '@mantine/core';
import {
  IconUsers,
  IconFolders,
  IconServer,
  IconFiles,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useAdmin } from '../../../hooks/useAdmin';
import StatCard from './StatCard';

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

  return (
    <Stack>
      <Text size="xl" fw={700}>
        System Statistics
      </Text>

      <Grid>
        <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={IconUsers}
            color="blue"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
          <StatCard
            title="Total Workspaces"
            value={stats.totalWorkspaces}
            icon={IconFolders}
            color="grape"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
          <StatCard
            title="Storage Used"
            value={formatBytes(stats.storageUsed)}
            icon={IconServer}
            color="teal"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6, lg: 3 }}>
          <StatCard
            title="Total Files"
            value={stats.totalFiles}
            icon={IconFiles}
            color="orange"
          />
        </Grid.Col>
      </Grid>

      <Grid mt="md">
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder>
            <Stack align="center">
              <Title order={3}>Active Users</Title>
              <RingProgress
                size={200}
                thickness={16}
                roundCaps
                sections={[
                  {
                    value: (stats.activeUsers / stats.totalUsers) * 100,
                    color: 'blue',
                  },
                ]}
                label={
                  <Text ta="center" fw={700} size="xl">
                    {((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}%
                  </Text>
                }
              />
              <Text c="dimmed" size="sm">
                {stats.activeUsers} out of {stats.totalUsers} users active in
                last 30 days
              </Text>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
};

export default AdminStatsTab;
