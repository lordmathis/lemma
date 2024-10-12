import React from 'react';
import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import Layout from './components/Layout';
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

  return <Layout />;
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
