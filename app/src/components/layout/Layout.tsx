import React from 'react';
import { AppShell, Container, Loader, Center } from '@mantine/core';
import Header from './Header';
import Sidebar from './Sidebar';
import MainContent from './MainContent';
import { useFileNavigation } from '../../hooks/useFileNavigation';
import { useFileList } from '../../hooks/useFileList';
import { useWorkspace } from '../../hooks/useWorkspace';

const Layout: React.FC = () => {
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace();
  const { selectedFile, handleFileSelect } = useFileNavigation();
  const { files, loadFileList } = useFileList();

  if (workspaceLoading) {
    return (
      <Center
        style={{ height: '100vh' }}
        role="status"
        aria-label="Loading workspace"
      >
        <Loader size="xl" />
      </Center>
    );
  }

  if (!currentWorkspace) {
    return <div>No workspace found. Please create a workspace.</div>;
  }

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
            files={files}
            loadFileList={loadFileList}
          />
          <MainContent
            selectedFile={selectedFile}
            handleFileSelect={handleFileSelect}
            loadFileList={loadFileList}
          />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
};

export default Layout;
