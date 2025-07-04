import React, { useState } from 'react';
import {
  Avatar,
  Popover,
  Stack,
  UnstyledButton,
  Group,
  Text,
  Divider,
} from '@mantine/core';
import {
  IconUser,
  IconUsers,
  IconLogout,
  IconSettings,
} from '@tabler/icons-react';
import { useAuth } from '../../contexts/AuthContext';
import AccountSettings from '../settings/account/AccountSettings';
import AdminDashboard from '../settings/admin/AdminDashboard';
import { UserRole } from '@/types/models';
import { getHoverStyle } from '@/utils/themeStyles';

const UserMenu: React.FC = () => {
  const [accountSettingsOpened, setAccountSettingsOpened] =
    useState<boolean>(false);
  const [adminDashboardOpened, setAdminDashboardOpened] =
    useState<boolean>(false);
  const [opened, setOpened] = useState<boolean>(false);
  const { user, logout } = useAuth();

  const handleLogout = async (): Promise<void> => {
    await logout();
  };

  return (
    <>
      <Popover
        width={200}
        position="bottom-end"
        withArrow
        shadow="md"
        opened={opened}
        onChange={setOpened}
      >
        <Popover.Target>
          <Avatar
            radius="xl"
            style={{ cursor: 'pointer' }}
            onClick={() => setOpened((o) => !o)}
            aria-label="User menu"
            aria-expanded={opened}
            aria-haspopup="menu"
            role="button"
          >
            <IconUser size={24} />
          </Avatar>
        </Popover.Target>

        <Popover.Dropdown>
          <Stack gap="sm">
            {/* User Info Section */}
            <Group gap="sm">
              <Avatar radius="xl" size="md">
                <IconUser size={24} />
              </Avatar>
              <div>
                <Text size="sm" fw={500}>
                  {user?.displayName || user?.email}
                </Text>
              </div>
            </Group>

            <Divider />

            {/* Menu Items */}
            <UnstyledButton
              onClick={() => {
                setAccountSettingsOpened(true);
                setOpened(false);
              }}
              px="sm"
              py="xs"
              style={(theme) => getHoverStyle(theme)}
            >
              <Group>
                <IconSettings size={16} />
                <Text size="sm">Account Settings</Text>
              </Group>
            </UnstyledButton>

            {user?.role === UserRole.Admin && (
              <UnstyledButton
                onClick={() => {
                  setAdminDashboardOpened(true);
                  setOpened(false);
                }}
                px="sm"
                py="xs"
                style={(theme) => getHoverStyle(theme)}
              >
                <Group>
                  <IconUsers size={16} />
                  <Text size="sm">Admin Dashboard</Text>
                </Group>
              </UnstyledButton>
            )}

            <UnstyledButton
              onClick={() => {
                void handleLogout();
                setOpened(false);
              }}
              px="sm"
              py="xs"
              color="red"
              style={(theme) => getHoverStyle(theme)}
            >
              <Group>
                <IconLogout size={16} color="red" />
                <Text size="sm" c="red">
                  Logout
                </Text>
              </Group>
            </UnstyledButton>
          </Stack>
        </Popover.Dropdown>
      </Popover>

      <AccountSettings
        opened={accountSettingsOpened}
        onClose={() => setAccountSettingsOpened(false)}
      />

      <AdminDashboard
        opened={adminDashboardOpened}
        onClose={() => setAdminDashboardOpened(false)}
      />
    </>
  );
};

export default UserMenu;
