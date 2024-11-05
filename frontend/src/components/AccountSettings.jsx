import React from 'react';
import {
  Modal,
  Badge,
  Button,
  Group,
  Title,
  Stack,
  Accordion,
  TextInput,
  Text,
  PasswordInput,
  Box,
} from '@mantine/core';
import { useAuth } from '../contexts/AuthContext';

const AccordionControl = ({ children }) => (
  <Accordion.Control>
    <Title order={4}>{children}</Title>
  </Accordion.Control>
);

const ProfileSettings = ({ displayName, email }) => (
  <Stack spacing="md">
    <TextInput label="Display Name" defaultValue={displayName || ''} disabled />
    <TextInput label="Email" defaultValue={email} disabled />
  </Stack>
);

const SecuritySettings = () => (
  <Stack spacing="md">
    <PasswordInput
      label="Current Password"
      placeholder="Enter current password"
      disabled
    />
    <PasswordInput
      label="New Password"
      placeholder="Enter new password"
      disabled
    />
    <PasswordInput
      label="Confirm New Password"
      placeholder="Confirm new password"
      disabled
    />
    <Text size="xs" c="dimmed">
      Password must be at least 8 characters long and contain at least one
      uppercase letter, one lowercase letter, one number, and one special
      character.
    </Text>
  </Stack>
);

const DangerZone = () => (
  <Stack spacing="md">
    <Box mb="md">
      <Button
        color="red"
        variant="light"
        onClick={() => console.log('Delete Account')}
        fullWidth
        disabled
      >
        Delete Account
      </Button>
    </Box>
  </Stack>
);

const AccountSettings = ({ opened, onClose }) => {
  const { user } = useAuth();
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Title order={2}>Account Settings</Title>}
      centered
      size="lg"
    >
      <Stack spacing="xl">
        <Badge color="yellow" variant="light">
          Changes are currently disabled
        </Badge>

        <Accordion
          defaultValue={['profile', 'security', 'danger']}
          multiple
          styles={(theme) => ({
            control: {
              paddingTop: theme.spacing.md,
              paddingBottom: theme.spacing.md,
            },
            item: {
              borderBottom: `1px solid ${
                theme.colorScheme === 'dark'
                  ? theme.colors.dark[4]
                  : theme.colors.gray[3]
              }`,
              '&[data-active]': {
                backgroundColor:
                  theme.colorScheme === 'dark'
                    ? theme.colors.dark[7]
                    : theme.colors.gray[0],
              },
            },
            chevron: {
              '&[data-rotate]': {
                transform: 'rotate(180deg)',
              },
            },
          })}
        >
          <Accordion.Item value="profile">
            <AccordionControl>Profile</AccordionControl>
            <Accordion.Panel>
              <ProfileSettings
                displayName={user.displayName}
                email={user.email}
              />
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="security">
            <AccordionControl>Security</AccordionControl>
            <Accordion.Panel>
              <SecuritySettings />
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="danger">
            <AccordionControl>Danger Zone</AccordionControl>
            <Accordion.Panel>
              <DangerZone />
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled>Save Changes</Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default AccountSettings;
