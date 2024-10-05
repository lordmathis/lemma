import React from 'react';
import { GeistProvider, CssBaseline, Page } from '@geist-ui/core';
import Header from './components/Header';
import MainContent from './components/MainContent';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { ModalProvider } from './contexts/ModalContext';
import { FileSelectionProvider } from './contexts/FileSelectionContext';
import { EditorContentProvider } from './contexts/EditorContentContext';
import { FileManagementProvider } from './contexts/FileManagementContext';
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
      <ModalProvider>
        <FileManagementProvider>
          <FileSelectionProvider>
            <EditorContentProvider>
              <AppContent />
            </EditorContentProvider>
          </FileSelectionProvider>
        </FileManagementProvider>
      </ModalProvider>
    </SettingsProvider>
  );
}

export default App;
