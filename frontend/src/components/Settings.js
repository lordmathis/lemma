import React, { useReducer, useEffect, useCallback, useRef } from 'react';
import { Modal, Spacer, Dot, useToasts } from '@geist-ui/core';
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
  const { settings, updateSettings, updateTheme } = useSettings();
  const { settingsModalVisible, setSettingsModalVisible } = useModalContext();
  const { setToast } = useToasts();
  const [state, dispatch] = useReducer(settingsReducer, initialState);
  const isInitialMount = useRef(true);
  const updateThemeTimeoutRef = useRef(null);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      dispatch({ type: 'INIT_SETTINGS', payload: settings });
    }
  }, [settings]);

  const handleInputChange = useCallback((key, value) => {
    dispatch({ type: 'UPDATE_LOCAL_SETTINGS', payload: { [key]: value } });
  }, []);

  const handleThemeChange = useCallback(() => {
    const newTheme = state.localSettings.theme === 'dark' ? 'light' : 'dark';
    dispatch({ type: 'UPDATE_LOCAL_SETTINGS', payload: { theme: newTheme } });

    // Debounce the theme update
    if (updateThemeTimeoutRef.current) {
      clearTimeout(updateThemeTimeoutRef.current);
    }
    updateThemeTimeoutRef.current = setTimeout(() => {
      updateTheme(newTheme);
    }, 0);
  }, [state.localSettings.theme, updateTheme]);

  const handleSubmit = async () => {
    try {
      await updateSettings(state.localSettings);
      dispatch({ type: 'MARK_SAVED' });
      setToast({ text: 'Settings saved successfully', type: 'success' });
      setSettingsModalVisible(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setToast({
        text: 'Failed to save settings: ' + error.message,
        type: 'error',
      });
    }
  };

  const handleClose = useCallback(() => {
    if (state.hasUnsavedChanges) {
      updateTheme(state.initialSettings.theme); // Revert theme if not saved
      dispatch({ type: 'RESET' });
    }
    setSettingsModalVisible(false);
  }, [
    state.hasUnsavedChanges,
    state.initialSettings.theme,
    updateTheme,
    setSettingsModalVisible,
  ]);

  useEffect(() => {
    return () => {
      if (updateThemeTimeoutRef.current) {
        clearTimeout(updateThemeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Modal visible={settingsModalVisible} onClose={handleClose}>
      <Modal.Title>
        Settings
        {state.hasUnsavedChanges && (
          <Dot type="warning" style={{ marginLeft: '8px' }} />
        )}
      </Modal.Title>
      <Modal.Content>
        <AppearanceSettings
          themeSettings={state.localSettings.theme}
          onThemeChange={handleThemeChange}
        />
        <Spacer h={1} />
        <EditorSettings
          autoSave={state.localSettings.autoSave}
          onAutoSaveChange={(value) => handleInputChange('autoSave', value)}
        />
        <Spacer h={1} />
        <GitSettings
          gitEnabled={state.localSettings.gitEnabled}
          gitUrl={state.localSettings.gitUrl}
          gitUser={state.localSettings.gitUser}
          gitToken={state.localSettings.gitToken}
          gitAutoCommit={state.localSettings.gitAutoCommit}
          gitCommitMsgTemplate={state.localSettings.gitCommitMsgTemplate}
          onInputChange={handleInputChange}
        />
      </Modal.Content>
      <Modal.Action passive onClick={handleClose}>
        Cancel
      </Modal.Action>
      <Modal.Action onClick={handleSubmit}>Save Changes</Modal.Action>
    </Modal>
  );
};

export default Settings;
