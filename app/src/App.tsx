import React from 'react';
import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import Layout from './components/layout/Layout';
import LoginPage from './components/auth/LoginPage';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { ModalProvider } from './contexts/ModalContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './App.scss';

type AuthenticatedContentProps = object;

const AuthenticatedContent: React.FC<AuthenticatedContentProps> = () => {
  const { user, loading, initialized } = useAuth();

  if (!initialized) {
    return null;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <WorkspaceProvider>
      <ModalProvider>
        <Layout />
      </ModalProvider>
    </WorkspaceProvider>
  );
};

type AppProps = object;

const App: React.FC<AppProps> = () => {
  return (
    <>
      <ColorSchemeScript defaultColorScheme="light" />
      <MantineProvider defaultColorScheme="light">
        <Notifications />
        <ModalsProvider>
          <AuthProvider>
            <AuthenticatedContent />
          </AuthProvider>
        </ModalsProvider>
      </MantineProvider>
    </>
  );
};

export default App;
