// App.js
import React from 'react';
import { GeistProvider, CssBaseline, Page } from '@geist-ui/core';
import Header from './components/Header';
import MainContent from './components/MainContent';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { FileContentProvider } from './contexts/FileContentContext';
import { FileListProvider } from './contexts/FileListContext';
import { GitOperationsProvider } from './contexts/GitOperationsContext';
import { UIStateProvider } from './contexts/UIStateContext';
import './App.scss';

function AppContent() {
  const { settings, loading } = useSettings();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <GeistProvider themeType={settings.theme}>
      <CssBaseline />
      <Page>
        <Header />
        <Page.Content className="page-content">
          <MainContent />
        </Page.Content>
      </Page>
    </GeistProvider>
  );
}

function App() {
  return (
    <SettingsProvider>
      <FileListProvider>
        <FileContentProvider>
          <GitOperationsProvider>
            <UIStateProvider>
              <AppContent />
            </UIStateProvider>
          </GitOperationsProvider>
        </FileContentProvider>
      </FileListProvider>
    </SettingsProvider>
  );
}

export default App;
