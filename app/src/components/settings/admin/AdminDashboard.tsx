import React, { useState } from 'react';
import { Modal, Tabs } from '@mantine/core';
import { IconUsers, IconFolders, IconChartBar } from '@tabler/icons-react';
import { useAuth } from '../../../contexts/AuthContext';
import AdminUsersTab from './AdminUsersTab';
import AdminWorkspacesTab from './AdminWorkspacesTab';
import AdminStatsTab from './AdminStatsTab';

interface AdminDashboardProps {
  opened: boolean;
  onClose: () => void;
}

type AdminTabValue = 'users' | 'workspaces' | 'stats';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ opened, onClose }) => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTabValue>('users');

  return (
    <Modal opened={opened} onClose={onClose} size="xl" title="Admin Dashboard">
      <Tabs
        value={activeTab}
        onChange={(value) => setActiveTab(value as AdminTabValue)}
      >
        <Tabs.List>
          <Tabs.Tab value="users" leftSection={<IconUsers size={16} />}>
            Users
          </Tabs.Tab>
          <Tabs.Tab value="workspaces" leftSection={<IconFolders size={16} />}>
            Workspaces
          </Tabs.Tab>
          <Tabs.Tab value="stats" leftSection={<IconChartBar size={16} />}>
            Statistics
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="users" pt="md">
          {currentUser && <AdminUsersTab currentUser={currentUser} />}
        </Tabs.Panel>

        <Tabs.Panel value="workspaces" pt="md">
          <AdminWorkspacesTab />
        </Tabs.Panel>

        <Tabs.Panel value="stats" pt="md">
          <AdminStatsTab />
        </Tabs.Panel>
      </Tabs>
    </Modal>
  );
};

export default AdminDashboard;
