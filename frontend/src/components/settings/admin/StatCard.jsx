import React from 'react';
import { Card, Group, Box, Text } from '@mantine/core';

const StatCard = ({ title, value, icon: Icon, color = 'blue' }) => (
  <Card withBorder p="md">
    <Group>
      <Box style={{ flex: 1 }}>
        <Text size="xs" tt="uppercase" fw={700} c="dimmed">
          {title}
        </Text>
        <Text fw={700} size="xl">
          {value}
        </Text>
      </Box>
      <Icon size={32} color={`var(--mantine-color-${color}-filled)`} />
    </Group>
  </Card>
);

export default StatCard;
