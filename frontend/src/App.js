import React, { useState } from 'react';
import {
  MantineProvider,
  createTheme,
  AppShell,
  Container,
} from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import Header from './components/Header';
import MainContent from './components/MainContent';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { ModalProvider } from './contexts/ModalContext';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './App.scss';

const mantineTheme = createTheme({
  /** You can add your Mantine theme overrides here */
});

function AppContent() {
  const { settings, loading } = useSettings();
  const [opened, setOpened] = useState(false);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <MantineProvider theme={mantineTheme} defaultColorScheme={settings.theme}>
      <Notifications />
      <ModalsProvider>
        <AppShell header={{ height: 60 }} padding="md">
          <AppShell.Header>
            <Header />
          </AppShell.Header>
          <AppShell.Main>
            <Container size="xl">
              <MainContent />
            </Container>
          </AppShell.Main>
        </AppShell>
      </ModalsProvider>
    </MantineProvider>
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
