import React from 'react';
import {
  MantineProvider,
  ColorSchemeScript,
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

function AppContent() {
  const { loading } = useSettings();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
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
  );
}

function App() {
  return (
    <>
      <ColorSchemeScript defaultColorScheme="light" />
      <MantineProvider defaultColorScheme="light">
        <Notifications />
        <ModalsProvider>
          <SettingsProvider>
            <ModalProvider>
              <AppContent />
            </ModalProvider>
          </SettingsProvider>
        </ModalsProvider>
      </MantineProvider>
    </>
  );
}

export default App;
