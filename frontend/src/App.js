// App.js
import React from 'react';
import { GeistProvider, CssBaseline, Page } from '@geist-ui/core';
import Header from './components/Header';
import MainContent from './components/MainContent';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { ModalProvider } from './contexts/ModalContext';
import { TabProvider } from './contexts/TabContext';
import { GitOperationsProvider } from './contexts/GitOperationsContext';
import { FileListProvider } from './contexts/FileListContext';
import { FileSelectionProvider } from './contexts/FileSelectionContext';
import { FileOperationsProvider } from './contexts/FileOperationsContext';
import { EditorContentProvider } from './contexts/EditorContentContext';
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
        <TabProvider>
          <GitOperationsProvider>
            <FileListProvider>
              <FileSelectionProvider>
                <FileOperationsProvider>
                  <EditorContentProvider>
                    <AppContent />
                  </EditorContentProvider>
                </FileOperationsProvider>
              </FileSelectionProvider>
            </FileListProvider>
          </GitOperationsProvider>
        </TabProvider>
      </ModalProvider>
    </SettingsProvider>
  );
}

export default App;
