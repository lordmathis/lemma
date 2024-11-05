import React, { useState } from 'react';
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
  LoadingOverlay,
} from '@mantine/core';
import { useAuth } from '../contexts/AuthContext';
import { useProfileSettings } from '../hooks/useProfileSettings';

const AccordionControl = ({ children }) => (
  <Accordion.Control>
    <Title order={4}>{children}</Title>
  </Accordion.Control>
);

const ProfileSettings = ({ displayName, email, onUpdate, loading }) => {
  const [newDisplayName, setNewDisplayName] = useState(displayName || '');
  const [newEmail, setNewEmail] = useState(email);
  const [currentPassword, setCurrentPassword] = useState('');
  const hasEmailChanges = newEmail !== email;
  const hasDisplayNameChanges = newDisplayName !== displayName;
  const hasChanges = hasEmailChanges || hasDisplayNameChanges;

  const handleSave = () => {
    const updates = {};
    if (hasDisplayNameChanges) updates.displayName = newDisplayName;
    if (hasEmailChanges) {
      updates.email = newEmail;
      updates.currentPassword = currentPassword;
    }
    onUpdate(updates);
  };

  return (
    <Stack spacing="md">
      <TextInput
        label="Display Name"
        value={newDisplayName}
        onChange={(e) => setNewDisplayName(e.currentTarget.value)}
        placeholder="Enter display name"
      />
      <TextInput
        label="Email"
        value={newEmail}
        onChange={(e) => setNewEmail(e.currentTarget.value)}
        placeholder="Enter email"
      />
      {hasEmailChanges && (
        <PasswordInput
          label="Current Password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.currentTarget.value)}
          placeholder="Required to change email"
          required
        />
      )}
      {hasChanges && (
        <Button onClick={handleSave} loading={loading}>
          Save Changes
        </Button>
      )}
    </Stack>
  );
};

const SecuritySettings = ({ onUpdate, loading }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    setError('');
    onUpdate({ currentPassword, newPassword });
  };

  const hasChanges = currentPassword && newPassword && confirmPassword;

  return (
    <Stack spacing="md">
      <PasswordInput
        label="Current Password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.currentTarget.value)}
        placeholder="Enter current password"
      />
      <PasswordInput
        label="New Password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.currentTarget.value)}
        placeholder="Enter new password"
      />
      <PasswordInput
        label="Confirm New Password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.currentTarget.value)}
        placeholder="Confirm new password"
      />
      {error && (
        <Text color="red" size="sm">
          {error}
        </Text>
      )}
      <Text size="xs" c="dimmed">
        Password must be at least 8 characters long
      </Text>
      {hasChanges && (
        <Button onClick={handlePasswordChange} loading={loading}>
          Change Password
        </Button>
      )}
    </Stack>
  );
};

const DangerZone = ({ onDelete, loading }) => {
  const [password, setPassword] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = () => {
    if (confirmDelete && password) {
      onDelete(password);
    } else {
      setConfirmDelete(true);
    }
  };

  return (
    <Stack spacing="md">
      {confirmDelete && (
        <PasswordInput
          label="Current Password"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          placeholder="Enter password to confirm"
          required
        />
      )}
      <Box mb="md">
        <Button
          color="red"
          variant="light"
          onClick={handleDelete}
          fullWidth
          loading={loading}
        >
          {confirmDelete ? 'Confirm Delete Account' : 'Delete Account'}
        </Button>
      </Box>
    </Stack>
  );
};

const AccountSettings = ({ opened, onClose }) => {
  const { user, logout, refreshUser } = useAuth();
  const { loading, updateProfile, deleteAccount } = useProfileSettings();
  const [activeSection, setActiveSection] = useState(['profile']);

  const handleProfileUpdate = async (updates) => {
    const result = await updateProfile(updates);
    if (result.success) {
      await refreshUser();
    }
  };

  const handleDelete = async (password) => {
    const result = await deleteAccount(password);
    if (result.success) {
      onClose();
      logout();
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Title order={2}>Account Settings</Title>}
      centered
      size="lg"
    >
      <LoadingOverlay visible={loading} />
      <Stack spacing="xl">
        <Accordion
          value={activeSection}
          onChange={setActiveSection}
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
          })}
        >
          <Accordion.Item value="profile">
            <AccordionControl>Profile</AccordionControl>
            <Accordion.Panel>
              <ProfileSettings
                displayName={user.displayName}
                email={user.email}
                onUpdate={handleProfileUpdate}
                loading={loading}
              />
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="security">
            <AccordionControl>Security</AccordionControl>
            <Accordion.Panel>
              <SecuritySettings
                onUpdate={handleProfileUpdate}
                loading={loading}
              />
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="danger">
            <AccordionControl>Danger Zone</AccordionControl>
            <Accordion.Panel>
              <DangerZone onDelete={handleDelete} loading={loading} />
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default AccountSettings;
