import React, { useState, useEffect } from 'react';
import { GeistProvider, CssBaseline, Page, useToasts } from '@geist-ui/core';
import Header from './components/Header';
import MainContent from './components/MainContent';
import useFileManagement from './hooks/useFileManagement';
import { fetchUserSettings } from './services/api';
import './App.scss';

function App() {
  const [themeType, setThemeType] = useState('light');
  const [userId, setUserId] = useState(1);
  const [settings, setSettings] = useState({ gitEnabled: false });
  const { setToast } = useToasts();

  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const fetchedSettings = await fetchUserSettings(userId);
        setSettings(fetchedSettings.settings);
        setThemeType(fetchedSettings.settings.theme);
      } catch (error) {
        console.error('Failed to load user settings:', error);
      }
    };

    loadUserSettings();
  }, [userId]);

  const {
    content,
    files,
    selectedFile,
    isNewFile,
    hasUnsavedChanges,
    error,
    handleFileSelect,
    handleContentChange,
    handleSave,
    pullLatestChanges,
    lookupFileByName,
  } = useFileManagement(settings.gitEnabled);

  const handleThemeChange = (newTheme) => {
    setThemeType(newTheme);
  };

  const handleLinkClick = async (filename) => {
    try {
      const filePaths = await lookupFileByName(filename);
      if (filePaths.length === 1) {
        handleFileSelect(filePaths[0]);
      } else if (filePaths.length > 1) {
        setFileOptions(filePaths.map((path) => ({ label: path, value: path })));
        setFileSelectionModalVisible(true);
      } else {
        setToast({ text: `File "${filename}" not found`, type: 'error' });
      }
    } catch (error) {
      console.error('Error looking up file:', error);
      setToast({
        text: 'Failed to lookup file. Please try again.',
        type: 'error',
      });
    }
  };

  return (
    <GeistProvider themeType={themeType}>
      <CssBaseline />
      <Page>
        <Header currentTheme={themeType} onThemeChange={handleThemeChange} />
        <Page.Content className="page-content">
          <MainContent
            content={content}
            files={files}
            selectedFile={selectedFile}
            isNewFile={isNewFile}
            hasUnsavedChanges={hasUnsavedChanges}
            error={error}
            onFileSelect={handleFileSelect}
            onContentChange={handleContentChange}
            onSave={handleSave}
            settings={settings}
            pullLatestChanges={pullLatestChanges}
            onLinkClick={handleLinkClick}
          />
        </Page.Content>
      </Page>
    </GeistProvider>
  );
}

export default App;
