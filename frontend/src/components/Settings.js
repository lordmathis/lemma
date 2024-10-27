import React, { useReducer, useEffect, useCallback, useRef } from 'react';
import {
  Modal,
  Badge,
  Button,
  Group,
  Title,
  Stack,
  Divider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useWorkspace } from '../contexts/WorkspaceContext';
import AppearanceSettings from './settings/AppearanceSettings';
import EditorSettings from './settings/EditorSettings';
import GitSettings from './settings/GitSettings';
import GeneralSettings from './settings/GeneralSettings';
import { useModalContext } from '../contexts/ModalContext';
import DangerZoneSettings from './settings/DangerZoneSettings';

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

const Settings = () => {
  const { currentWorkspace, updateSettings } = useWorkspace();
  const { settingsModalVisible, setSettingsModalVisible } = useModalContext();
  const [state, dispatch] = useReducer(settingsReducer, initialState);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      const settings = {
        theme: currentWorkspace.theme,
        autoSave: currentWorkspace.autoSave,
        gitEnabled: currentWorkspace.gitEnabled,
        gitUrl: currentWorkspace.gitUrl,
        gitUser: currentWorkspace.gitUser,
        gitToken: currentWorkspace.gitToken,
        gitAutoCommit: currentWorkspace.gitAutoCommit,
        gitCommitMsgTemplate: currentWorkspace.gitCommitMsgTemplate,
      };
      dispatch({ type: 'INIT_SETTINGS', payload: settings });
    }
  }, [currentWorkspace]);

  const handleInputChange = useCallback((key, value) => {
    dispatch({ type: 'UPDATE_LOCAL_SETTINGS', payload: { [key]: value } });
  }, []);

  const handleSubmit = async () => {
    try {
      await updateSettings(state.localSettings);
      dispatch({ type: 'MARK_SAVED' });
      notifications.show({
        message: 'Settings saved successfully',
        color: 'green',
      });
      setSettingsModalVisible(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      notifications.show({
        message: 'Failed to save settings: ' + error.message,
        color: 'red',
      });
    }
  };

  const handleClose = useCallback(() => {
    setSettingsModalVisible(false);
  }, [setSettingsModalVisible]);

  return (
    <Modal
      opened={settingsModalVisible}
      onClose={handleClose}
      title={<Title order={2}>Settings</Title>}
      centered
      size="lg"
    >
      <Stack spacing="xl">
        {state.hasUnsavedChanges && (
          <Badge color="yellow" variant="light">
            Unsaved Changes
          </Badge>
        )}

        <GeneralSettings />
        <Divider />

        <AppearanceSettings
          themeSettings={state.localSettings.theme}
          onThemeChange={(newTheme) => handleInputChange('theme', newTheme)}
        />
        <Divider />

        <EditorSettings
          autoSave={state.localSettings.autoSave}
          onAutoSaveChange={(value) => handleInputChange('autoSave', value)}
        />
        <Divider />

        <GitSettings
          gitEnabled={state.localSettings.gitEnabled}
          gitUrl={state.localSettings.gitUrl}
          gitUser={state.localSettings.gitUser}
          gitToken={state.localSettings.gitToken}
          gitAutoCommit={state.localSettings.gitAutoCommit}
          gitCommitMsgTemplate={state.localSettings.gitCommitMsgTemplate}
          onInputChange={handleInputChange}
        />

        <DangerZoneSettings />

        <Group justify="flex-end">
          <Button variant="default" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save Changes</Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default Settings;
