import React, { useReducer, useEffect, useCallback, useRef } from 'react';
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
import { useWorkspace } from '../../../contexts/WorkspaceContext';
import AppearanceSettings from './AppearanceSettings';
import EditorSettings from './EditorSettings';
import GitSettings from './GitSettings';
import GeneralSettings from './GeneralSettings';
import { useModalContext } from '../../../contexts/ModalContext';
import DangerZoneSettings from './DangerZoneSettings';
import AccordionControl from '../AccordionControl';

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

const WorkspaceSettings = () => {
  const { currentWorkspace, updateSettings } = useWorkspace();
  const { settingsModalVisible, setSettingsModalVisible } = useModalContext();
  const [state, dispatch] = useReducer(settingsReducer, initialState);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      const settings = {
        name: currentWorkspace.name,
        theme: currentWorkspace.theme,
        autoSave: currentWorkspace.autoSave,
        showHiddenFiles: currentWorkspace.showHiddenFiles,
        gitEnabled: currentWorkspace.gitEnabled,
        gitUrl: currentWorkspace.gitUrl,
        gitUser: currentWorkspace.gitUser,
        gitToken: currentWorkspace.gitToken,
        gitAutoCommit: currentWorkspace.gitAutoCommit,
        gitCommitMsgTemplate: currentWorkspace.gitCommitMsgTemplate,
        gitCommitName: currentWorkspace.gitCommitName,
        gitCommitEmail: currentWorkspace.gitCommitEmail,
      };
      dispatch({ type: 'INIT_SETTINGS', payload: settings });
    }
  }, [currentWorkspace]);

  const handleInputChange = useCallback((key, value) => {
    dispatch({ type: 'UPDATE_LOCAL_SETTINGS', payload: { [key]: value } });
  }, []);

  const handleSubmit = async () => {
    try {
      if (!state.localSettings.name?.trim()) {
        notifications.show({
          message: 'Workspace name cannot be empty',
          color: 'red',
        });
        return;
      }

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
      title={<Title order={2}>Workspace Settings</Title>}
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
          defaultValue={['general', 'appearance', 'editor', 'git', 'danger']}
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
          <Accordion.Item value="general">
            <AccordionControl>General</AccordionControl>
            <Accordion.Panel>
              <GeneralSettings
                name={state.localSettings.name}
                onInputChange={handleInputChange}
              />
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="appearance">
            <AccordionControl>Appearance</AccordionControl>
            <Accordion.Panel>
              <AppearanceSettings
                themeSettings={state.localSettings.theme}
                onThemeChange={(newTheme) =>
                  handleInputChange('theme', newTheme)
                }
              />
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="editor">
            <AccordionControl>Editor</AccordionControl>
            <Accordion.Panel>
              <EditorSettings
                autoSave={state.localSettings.autoSave}
                onAutoSaveChange={(value) =>
                  handleInputChange('autoSave', value)
                }
                showHiddenFiles={state.localSettings.showHiddenFiles}
                onShowHiddenFilesChange={(value) =>
                  handleInputChange('showHiddenFiles', value)
                }
              />
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="git">
            <AccordionControl>Git Integration</AccordionControl>
            <Accordion.Panel>
              <GitSettings
                gitEnabled={state.localSettings.gitEnabled}
                gitUrl={state.localSettings.gitUrl}
                gitUser={state.localSettings.gitUser}
                gitToken={state.localSettings.gitToken}
                gitAutoCommit={state.localSettings.gitAutoCommit}
                gitCommitMsgTemplate={state.localSettings.gitCommitMsgTemplate}
                gitCommitName={state.localSettings.gitCommitName}
                gitCommitEmail={state.localSettings.gitCommitEmail}
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
          <Button variant="default" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save Changes</Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default WorkspaceSettings;
