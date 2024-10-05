import React from 'react';
import { GeistProvider, CssBaseline, Page } from '@geist-ui/core';
import Header from './components/Header';
import MainContent from './components/MainContent';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { ModalProvider } from './contexts/ModalContext';
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
        <AppContent />
      </ModalProvider>
    </SettingsProvider>
  );
}

export default App;
