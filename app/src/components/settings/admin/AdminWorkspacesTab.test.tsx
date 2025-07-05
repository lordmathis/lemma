import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen } from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';
import AdminWorkspacesTab from './AdminWorkspacesTab';
import type { WorkspaceStats } from '@/types/models';

// Mock the admin data hook
vi.mock('../../../hooks/useAdminData', () => ({
  useAdminData: vi.fn(),
}));

// Mock the formatBytes utility
vi.mock('../../../utils/formatBytes', () => ({
  formatBytes: (bytes: number) => `${bytes} bytes`,
}));

// Helper wrapper component for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider defaultColorScheme="light">{children}</MantineProvider>
);

// Custom render function
const render = (ui: React.ReactElement) => {
  return rtlRender(ui, { wrapper: TestWrapper });
};

describe('AdminWorkspacesTab', () => {
  const mockWorkspaces: WorkspaceStats[] = [
    {
      workspaceID: 1,
      userID: 1,
      userEmail: 'user1@example.com',
      workspaceName: 'Project Alpha',
      workspaceCreatedAt: '2024-01-15T10:30:00Z',
      fileCountStats: {
        totalFiles: 25,
        totalSize: 1048576, // 1MB
      },
    },
    {
      workspaceID: 2,
      userID: 2,
      userEmail: 'user2@example.com',
      workspaceName: 'Project Beta',
      workspaceCreatedAt: '2024-02-20T14:45:00Z',
      fileCountStats: {
        totalFiles: 42,
        totalSize: 2097152, // 2MB
      },
    },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();

    const { useAdminData } = await import('../../../hooks/useAdminData');
    vi.mocked(useAdminData).mockReturnValue({
      data: mockWorkspaces,
      loading: false,
      error: null,
      reload: vi.fn(),
    });
  });

  it('renders workspace table with all columns', () => {
    render(<AdminWorkspacesTab />);

    expect(screen.getByText('Workspace Management')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Created At')).toBeInTheDocument();
    expect(screen.getByText('Total Files')).toBeInTheDocument();
    expect(screen.getByText('Total Size')).toBeInTheDocument();
  });

  it('displays workspace data correctly', () => {
    render(<AdminWorkspacesTab />);

    expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    expect(screen.getByText('1/15/2024')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('1048576 bytes')).toBeInTheDocument();

    expect(screen.getByText('user2@example.com')).toBeInTheDocument();
    expect(screen.getByText('Project Beta')).toBeInTheDocument();
    expect(screen.getByText('2/20/2024')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('2097152 bytes')).toBeInTheDocument();
  });

  it('shows loading state', async () => {
    const { useAdminData } = await import('../../../hooks/useAdminData');
    vi.mocked(useAdminData).mockReturnValue({
      data: [],
      loading: true,
      error: null,
      reload: vi.fn(),
    });

    render(<AdminWorkspacesTab />);

    expect(
      document.querySelector('.mantine-LoadingOverlay-root')
    ).toBeInTheDocument();
  });

  it('shows error state', async () => {
    const { useAdminData } = await import('../../../hooks/useAdminData');
    vi.mocked(useAdminData).mockReturnValue({
      data: [],
      loading: false,
      error: 'Failed to load workspaces',
      reload: vi.fn(),
    });

    render(<AdminWorkspacesTab />);

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load workspaces')).toBeInTheDocument();
  });

  it('handles empty workspace list', async () => {
    const { useAdminData } = await import('../../../hooks/useAdminData');
    vi.mocked(useAdminData).mockReturnValue({
      data: [],
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    render(<AdminWorkspacesTab />);

    expect(screen.getByText('Workspace Management')).toBeInTheDocument();
    // Table headers should still be present
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
  });
});
