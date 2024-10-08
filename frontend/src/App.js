import React from 'react';
import { GeistProvider, CssBaseline } from '@geist-ui/core';
import { MantineProvider, AppShell, Container } from '@mantine/core';
import Header from './components/Header';
import MainContent from './components/MainContent';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { ModalProvider } from './contexts/ModalContext';
import '@mantine/core/styles.css';
import './App.scss';

function AppContent() {
  const { settings, loading } = useSettings();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <GeistProvider themeType={settings.theme}>
      <MantineProvider
        withGlobalStyles
        withNormalizeCSS
        theme={{
          colorScheme: settings.theme,
          components: {
            Container: {
              defaultProps: {
                sizes: {
                  xs: 540,
                  sm: 720,
                  md: 960,
                  lg: 1140,
                  xl: 1320,
                },
              },
            },
          },
        }}
      >
        <CssBaseline />
        <AppShell header={{ height: 60 }} padding="md">
          <AppShell.Header>
            <Container size="xl">
              <Header />
            </Container>
          </AppShell.Header>

          <AppShell.Main>
            <Container size="xl">
              <MainContent />
            </Container>
          </AppShell.Main>
        </AppShell>
      </MantineProvider>
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
