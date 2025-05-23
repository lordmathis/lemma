import React, { useState, useReducer, useRef, useEffect } from 'react';
import {
  Modal,
  Badge,
  Button,
  Group,
  Title,
  Stack,
  Accordion,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useAuth } from '../../../contexts/AuthContext';
import { useProfileSettings } from '../../../hooks/useProfileSettings';
import EmailPasswordModal from '../../modals/account/EmailPasswordModal';
import SecuritySettings from './SecuritySettings';
import ProfileSettings from './ProfileSettings';
import DangerZoneSettings from './DangerZoneSettings';
import AccordionControl from '../AccordionControl';
import {
  type UserProfileSettings,
  type ProfileSettingsState,
  type SettingsAction,
  SettingsActionType,
} from '@/types/models';

interface AccountSettingsProps {
  opened: boolean;
  onClose: () => void;
}

// Reducer for managing settings state
const initialState: ProfileSettingsState = {
  localSettings: {},
  initialSettings: {},
  hasUnsavedChanges: false,
};

function settingsReducer(
  state: ProfileSettingsState,
  action: SettingsAction<UserProfileSettings>
): ProfileSettingsState {
  switch (action.type) {
    case SettingsActionType.INIT_SETTINGS:
      return {
        ...state,
        localSettings: action.payload || {},
        initialSettings: action.payload || {},
        hasUnsavedChanges: false,
      };
    case SettingsActionType.UPDATE_LOCAL_SETTINGS:
      const newLocalSettings = { ...state.localSettings, ...action.payload };
      const hasChanges =
        JSON.stringify(newLocalSettings) !==
        JSON.stringify(state.initialSettings);
      return {
        ...state,
        localSettings: newLocalSettings,
        hasUnsavedChanges: hasChanges,
      };
    case SettingsActionType.MARK_SAVED:
      return {
        ...state,
        initialSettings: state.localSettings,
        hasUnsavedChanges: false,
      };
    default:
      return state;
  }
}

const AccountSettings: React.FC<AccountSettingsProps> = ({
  opened,
  onClose,
}) => {
  const { user, refreshUser } = useAuth();
  const { loading, updateProfile } = useProfileSettings();
  const [state, dispatch] = useReducer(settingsReducer, initialState);
  const isInitialMount = useRef<boolean>(true);
  const [emailModalOpened, setEmailModalOpened] = useState<boolean>(false);

  // Initialize settings on mount
  useEffect(() => {
    if (isInitialMount.current && user) {
      isInitialMount.current = false;
      const settings: UserProfileSettings = {
        displayName: user.displayName || '',
        email: user.email,
        currentPassword: '',
        newPassword: '',
      };
      dispatch({
        type: SettingsActionType.INIT_SETTINGS,
        payload: settings,
      });
    }
  }, [user]);

  const handleInputChange = (
    key: keyof UserProfileSettings,
    value: string
  ): void => {
    dispatch({
      type: SettingsActionType.UPDATE_LOCAL_SETTINGS,
      payload: { [key]: value } as UserProfileSettings,
    });
  };

  const handleSubmit = async (): Promise<void> => {
    const updates: UserProfileSettings = {};
    const needsPasswordConfirmation =
      state.localSettings.email !== state.initialSettings.email;

    // Add display name if changed
    if (state.localSettings.displayName !== state.initialSettings.displayName) {
      updates.displayName = state.localSettings.displayName || '';
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
        updates.email = state.localSettings.email || '';
        // If we don't have a password change, we still need to include the current password for email change
        if (!updates.currentPassword) {
          updates.currentPassword = state.localSettings.currentPassword || '';
        }
      }

      const updatedUser = await updateProfile(updates);
      if (updatedUser) {
        await refreshUser();
        dispatch({ type: SettingsActionType.MARK_SAVED });
        onClose();
      }
    } else {
      // Only show the email confirmation modal if we don't already have the password
      setEmailModalOpened(true);
    }
  };

  const handleEmailConfirm = async (password: string): Promise<void> => {
    const updates: UserProfileSettings = {
      ...state.localSettings,
      currentPassword: password,
    };

    // Remove any undefined/empty values
    Object.keys(updates).forEach((key) => {
      const typedKey = key as keyof UserProfileSettings;
      if (updates[typedKey] === undefined || updates[typedKey] === '') {
        delete updates[typedKey];
      }
    });

    // Remove keys that haven't changed
    if (updates.displayName === state.initialSettings.displayName) {
      delete updates.displayName;
    }
    if (updates.email === state.initialSettings.email) {
      delete updates.email;
    }

    const updatedUser = await updateProfile(updates);
    if (updatedUser) {
      await refreshUser();
      dispatch({ type: SettingsActionType.MARK_SAVED });
      setEmailModalOpened(false);
      onClose();
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
        <Stack gap="xl">
          {state.hasUnsavedChanges && (
            <Badge color="yellow" variant="light">
              Unsaved Changes
            </Badge>
          )}

          <Accordion
            defaultValue={['profile', 'security', 'danger']}
            multiple
            styles={(theme: any) => ({
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
                <DangerZoneSettings />
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
        email={state.localSettings.email || ''}
      />
    </>
  );
};

export default AccountSettings;
