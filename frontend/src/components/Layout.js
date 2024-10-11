import React from 'react';
import { AppShell, Container } from '@mantine/core';
import Header from './Header';
import Sidebar from './Sidebar';
import MainContent from './MainContent';
import { useFileNavigation } from '../hooks/useFileNavigation';

const Layout = () => {
  const { selectedFile, handleFileSelect, handleLinkClick } =
    useFileNavigation();

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Header />
      </AppShell.Header>
      <AppShell.Main>
        <Container
          size="xl"
          p={0}
          style={{
            display: 'flex',
            height: 'calc(100vh - 60px - 2rem)', // Subtracting header height and vertical padding
            overflow: 'hidden', // Prevent scrolling in the container
          }}
        >
          <Sidebar
            selectedFile={selectedFile}
            handleFileSelect={handleFileSelect}
          />
          <MainContent
            selectedFile={selectedFile}
            handleFileSelect={handleFileSelect}
            handleLinkClick={handleLinkClick}
          />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
};

export default Layout;
