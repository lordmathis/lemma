import React, { useReducer, useEffect, useCallback, useRef } from 'react';
import { Modal, Badge, Button, Group, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useSettings } from '../contexts/SettingsContext';
import AppearanceSettings from './settings/AppearanceSettings';
import EditorSettings from './settings/EditorSettings';
import GitSettings from './settings/GitSettings';
import { useModalContext } from '../contexts/ModalContext';

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
    case 'RESET':
      return {
        ...state,
        localSettings: state.initialSettings,
        hasUnsavedChanges: false,
      };
    default:
      return state;
  }
}

const Settings = () => {
  const { settings, updateSettings, colorScheme } = useSettings();
  const { settingsModalVisible, setSettingsModalVisible } = useModalContext();
  const [state, dispatch] = useReducer(settingsReducer, initialState);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      dispatch({ type: 'INIT_SETTINGS', payload: settings });
    }
  }, [settings]);

  useEffect(() => {
    dispatch({
      type: 'UPDATE_LOCAL_SETTINGS',
      payload: { theme: colorScheme },
    });
  }, [colorScheme]);

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
    if (state.hasUnsavedChanges) {
      dispatch({ type: 'RESET' });
    }
    setSettingsModalVisible(false);
  }, [state.hasUnsavedChanges, setSettingsModalVisible]);

  return (
    <Modal
      opened={settingsModalVisible}
      onClose={handleClose}
      title={<Title order={2}>Settings</Title>}
      centered
      size="lg"
    >
      {state.hasUnsavedChanges && (
        <Badge color="yellow" variant="light" mb="md">
          Unsaved Changes
        </Badge>
      )}
      <AppearanceSettings
        themeSettings={state.localSettings.theme}
        onThemeChange={(newTheme) => handleInputChange('theme', newTheme)}
      />
      <EditorSettings
        autoSave={state.localSettings.autoSave}
        onAutoSaveChange={(value) => handleInputChange('autoSave', value)}
      />
      <GitSettings
        gitEnabled={state.localSettings.gitEnabled}
        gitUrl={state.localSettings.gitUrl}
        gitUser={state.localSettings.gitUser}
        gitToken={state.localSettings.gitToken}
        gitAutoCommit={state.localSettings.gitAutoCommit}
        gitCommitMsgTemplate={state.localSettings.gitCommitMsgTemplate}
        onInputChange={handleInputChange}
      />
      <Group justify="flex-end" mt="xl">
        <Button variant="default" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>Save Changes</Button>
      </Group>
    </Modal>
  );
};

export default Settings;
