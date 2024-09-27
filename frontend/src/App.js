import React, { useState, useEffect } from 'react';
import { GeistProvider, CssBaseline, Page } from '@geist-ui/core';
import Header from './components/Header';
import MainContent from './components/MainContent';
import useFileManagement from './hooks/useFileManagement';
import { fetchUserSettings } from './services/api';
import './App.scss';

function App() {
  const [themeType, setThemeType] = useState('light');
  const [userId, setUserId] = useState(1);
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
  } = useFileManagement();

  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const settings = await fetchUserSettings(userId);
        setThemeType(settings.settings.theme);
      } catch (error) {
        console.error('Failed to load user settings:', error);
      }
    };

    loadUserSettings();
  }, [userId]);

  const setTheme = (newTheme) => {
    setThemeType(newTheme);
  };

  return (
    <GeistProvider themeType={themeType}>
      <CssBaseline />
      <Page>
        <Header currentTheme={themeType} onThemeChange={setTheme} />
        <Page.Content>
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
          />
        </Page.Content>
      </Page>
    </GeistProvider>
  );
}

export default App;