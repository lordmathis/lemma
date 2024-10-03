import React from 'react';
import { GeistProvider, CssBaseline, Page, useToasts } from '@geist-ui/core';
import Header from './components/Header';
import MainContent from './components/MainContent';
import { useFileManagement } from './hooks/useFileManagement';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { lookupFileByName } from './services/api';
import './App.scss';

function AppContent() {
  const { settings, loading } = useSettings();
  const { setToast } = useToasts();

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
  } = useFileManagement(settings.gitEnabled);

  const handleLinkClick = async (filename) => {
    try {
      const filePaths = await lookupFileByName(filename);
      if (filePaths.length === 1) {
        handleFileSelect(filePaths[0]);
      } else if (filePaths.length > 1) {
        // Handle multiple file options (you may want to show a modal or dropdown)
        console.log('Multiple files found:', filePaths);
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

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <GeistProvider themeType={settings.theme}>
      <CssBaseline />
      <Page>
        <Header />
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
            lookupFileByName={lookupFileByName}
          />
        </Page.Content>
      </Page>
    </GeistProvider>
  );
}

function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}

export default App;
