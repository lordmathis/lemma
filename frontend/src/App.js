import React from 'react';
import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import Layout from './components/Layout';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { ModalProvider } from './contexts/ModalContext';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './App.scss';

function AppContent() {
  return <Layout />;
}

function App() {
  return (
    <>
      <ColorSchemeScript defaultColorScheme="light" />
      <MantineProvider defaultColorScheme="light">
        <Notifications />
        <ModalsProvider>
          <WorkspaceProvider>
            <ModalProvider>
              <AppContent />
            </ModalProvider>
          </WorkspaceProvider>
        </ModalsProvider>
      </MantineProvider>
    </>
  );
}

export default App;
