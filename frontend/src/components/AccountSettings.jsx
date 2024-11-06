import React, { useState, useReducer, useRef } from 'react';
import {
  Modal,
  Badge,
  Button,
  Group,
  Title,
  Stack,
  Accordion,
  TextInput,
  PasswordInput,
  Box,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../contexts/AuthContext';
import { useProfileSettings } from '../hooks/useProfileSettings';

// Reducer for managing settings state
const initialState = {
  localSettings: {},
  initialSettings: {},
  hasUnsavedChanges: false,
};

function settingsReducer(state, action) {
  switch (action.type) {
    case 'INIT_SETTINGS':
      return {
        ...state,
        localSettings: action.payload,
        initialSettings: action.payload,
        hasUnsavedChanges: false,
      };
    case 'UPDATE_LOCAL_SETTINGS':
      const newLocalSettings = { ...state.localSettings, ...action.payload };
      const hasChanges =
        JSON.stringify(newLocalSettings) !==
        JSON.stringify(state.initialSettings);
      return {
        ...state,
        localSettings: newLocalSettings,
        hasUnsavedChanges: hasChanges,
      };
    case 'MARK_SAVED':
      return {
        ...state,
        initialSettings: state.localSettings,
        hasUnsavedChanges: false,
      };
    default:
      return state;
  }
}

// Password confirmation modal for email changes
const EmailPasswordModal = ({ opened, onClose, onConfirm, email }) => {
  const [password, setPassword] = useState('');

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Confirm Password"
      centered
      size="sm"
    >
      <Stack>
        <Text size="sm">
          Please enter your password to confirm changing your email to: {email}
        </Text>
        <PasswordInput
          label="Current Password"
          placeholder="Enter your current password"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          required
        />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirm(password);
              setPassword('');
            }}
          >
            Confirm
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

// Delete account confirmation modal
const DeleteAccountModal = ({ opened, onClose, onConfirm }) => {
  const [password, setPassword] = useState('');

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Delete Account"
      centered
      size="sm"
    >
      <Stack>
        <Text c="red" fw={500}>
          Warning: This action cannot be undone
        </Text>
        <Text size="sm">
          Please enter your password to confirm account deletion.
        </Text>
        <PasswordInput
          label="Current Password"
          placeholder="Enter your current password"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          required
        />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={() => {
              onConfirm(password);
              setPassword('');
            }}
          >
            Delete Account
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

const AccordionControl = ({ children }) => (
  <Accordion.Control>
    <Title order={4}>{children}</Title>
  </Accordion.Control>
);

const ProfileSettings = ({ settings, onInputChange }) => (
  <Box>
    <Stack spacing="md">
      <TextInput
        label="Display Name"
        value={settings.displayName || ''}
        onChange={(e) => onInputChange('displayName', e.currentTarget.value)}
        placeholder="Enter display name"
      />
      <TextInput
        label="Email"
        value={settings.email || ''}
        onChange={(e) => onInputChange('email', e.currentTarget.value)}
        placeholder="Enter email"
      />
    </Stack>
  </Box>
);

const SecuritySettings = ({ settings, onInputChange }) => {
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handlePasswordChange = (field, value) => {
    if (field === 'confirmNewPassword') {
      setConfirmPassword(value);
      // Check if passwords match when either password field changes
      if (value !== settings.newPassword) {
        setError('Passwords do not match');
      } else {
        setError('');
      }
    } else {
      onInputChange(field, value);
      // Check if passwords match when either password field changes
      if (field === 'newPassword' && value !== confirmPassword) {
        setError('Passwords do not match');
      } else if (value === confirmPassword) {
        setError('');
      }
    }
  };

  return (
    <Box>
      <Stack spacing="md">
        <PasswordInput
          label="Current Password"
          value={settings.currentPassword || ''}
          onChange={(e) =>
            handlePasswordChange('currentPassword', e.currentTarget.value)
          }
          placeholder="Enter current password"
        />
        <PasswordInput
          label="New Password"
          value={settings.newPassword || ''}
          onChange={(e) =>
            handlePasswordChange('newPassword', e.currentTarget.value)
          }
          placeholder="Enter new password"
        />
        <PasswordInput
          label="Confirm New Password"
          value={confirmPassword}
          onChange={(e) =>
            handlePasswordChange('confirmNewPassword', e.currentTarget.value)
          }
          placeholder="Confirm new password"
          error={error}
        />
        <Text size="xs" c="dimmed">
          Password must be at least 8 characters long. Leave password fields
          empty if you don't want to change it.
        </Text>
      </Stack>
    </Box>
  );
};

const DangerZone = ({ onDeleteClick }) => (
  <Box>
    <Button color="red" variant="light" onClick={onDeleteClick} fullWidth>
      Delete Account
    </Button>
  </Box>
);

const AccountSettings = ({ opened, onClose }) => {
  const { user, logout, refreshUser } = useAuth();
  const { loading, updateProfile, deleteAccount } = useProfileSettings();
  const [state, dispatch] = useReducer(settingsReducer, initialState);
  const isInitialMount = useRef(true);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [emailModalOpened, setEmailModalOpened] = useState(false);

  // Initialize settings on mount
  React.useEffect(() => {
    if (isInitialMount.current && user) {
      isInitialMount.current = false;
      const settings = {
        displayName: user.displayName,
        email: user.email,
        currentPassword: '',
        newPassword: '',
      };
      dispatch({ type: 'INIT_SETTINGS', payload: settings });
    }
  }, [user]);

  const handleInputChange = (key, value) => {
    dispatch({ type: 'UPDATE_LOCAL_SETTINGS', payload: { [key]: value } });
  };

  const handleSubmit = async () => {
    const updates = {};
    const needsPasswordConfirmation =
      state.localSettings.email !== state.initialSettings.email;

    // Add display name if changed
    if (state.localSettings.displayName !== state.initialSettings.displayName) {
      updates.displayName = state.localSettings.displayName;
    }

    // Handle password change
    if (state.localSettings.newPassword) {
      if (!state.localSettings.currentPassword) {
        notifications.show({
          title: 'Error',
          message: 'Current password is required to change password',
          color: 'red',
        });
        return;
      }
      updates.newPassword = state.localSettings.newPassword;
      updates.currentPassword = state.localSettings.currentPassword;
    }

    // If we're only changing display name or have password already provided, proceed directly
    if (!needsPasswordConfirmation || state.localSettings.currentPassword) {
      if (needsPasswordConfirmation) {
        updates.email = state.localSettings.email;
        // If we don't have a password change, we still need to include the current password for email change
        if (!updates.currentPassword) {
          updates.currentPassword = state.localSettings.currentPassword;
        }
      }

      const result = await updateProfile(updates);
      if (result.success) {
        await refreshUser();
        dispatch({ type: 'MARK_SAVED' });
        onClose();
      }
    } else {
      // Only show the email confirmation modal if we don't already have the password
      setEmailModalOpened(true);
    }
  };

  const handleEmailConfirm = async (password) => {
    const updates = {
      ...state.localSettings,
      currentPassword: password,
    };
    // Remove any undefined/empty values
    Object.keys(updates).forEach((key) => {
      if (updates[key] === undefined || updates[key] === '') {
        delete updates[key];
      }
    });
    // Remove keys that haven't changed
    if (updates.displayName === state.initialSettings.displayName) {
      delete updates.displayName;
    }
    if (updates.email === state.initialSettings.email) {
      delete updates.email;
    }

    const result = await updateProfile(updates);
    if (result.success) {
      await refreshUser();
      dispatch({ type: 'MARK_SAVED' });
      setEmailModalOpened(false);
      onClose();
    }
  };

  const handleDelete = async (password) => {
    const result = await deleteAccount(password);
    if (result.success) {
      setDeleteModalOpened(false);
      onClose();
      logout();
    }
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title={<Title order={2}>Account Settings</Title>}
        centered
        size="lg"
      >
        <Stack spacing="xl">
          {state.hasUnsavedChanges && (
            <Badge color="yellow" variant="light">
              Unsaved Changes
            </Badge>
          )}

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
            })}
          >
            <Accordion.Item value="profile">
              <AccordionControl>Profile</AccordionControl>
              <Accordion.Panel>
                <ProfileSettings
                  settings={state.localSettings}
                  onInputChange={handleInputChange}
                />
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="security">
              <AccordionControl>Security</AccordionControl>
              <Accordion.Panel>
                <SecuritySettings
                  settings={state.localSettings}
                  onInputChange={handleInputChange}
                />
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="danger">
              <AccordionControl>Danger Zone</AccordionControl>
              <Accordion.Panel>
                <DangerZone onDeleteClick={() => setDeleteModalOpened(true)} />
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              loading={loading}
              disabled={!state.hasUnsavedChanges}
            >
              Save Changes
            </Button>
          </Group>
        </Stack>
      </Modal>

      <EmailPasswordModal
        opened={emailModalOpened}
        onClose={() => setEmailModalOpened(false)}
        onConfirm={handleEmailConfirm}
        email={state.localSettings.email}
      />

      <DeleteAccountModal
        opened={deleteModalOpened}
        onClose={() => setDeleteModalOpened(false)}
        onConfirm={handleDelete}
      />
    </>
  );
};

export default AccountSettings;
