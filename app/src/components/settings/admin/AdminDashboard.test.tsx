import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';
import AdminDashboard from './AdminDashboard';
import { UserRole, Theme, type User } from '@/types/models';

// Mock the auth context
const mockCurrentUser: User = {
  id: 1,
  email: 'admin@example.com',
  displayName: 'Admin User',
  role: UserRole.Admin,
  theme: Theme.Dark,
  createdAt: '2024-01-01T00:00:00Z',
  lastWorkspaceId: 1,
};

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockCurrentUser,
  }),
}));

// Mock the sub-components
vi.mock('./AdminUsersTab', () => ({
  default: ({ currentUser }: { currentUser: User }) => (
    <div data-testid="admin-users-tab">Users Tab - {currentUser.email}</div>
  ),
}));

vi.mock('./AdminWorkspacesTab', () => ({
  default: () => <div data-testid="admin-workspaces-tab">Workspaces Tab</div>,
}));

vi.mock('./AdminStatsTab', () => ({
  default: () => <div data-testid="admin-stats-tab">Stats Tab</div>,
}));

// Helper wrapper component for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider defaultColorScheme="light">{children}</MantineProvider>
);

// Custom render function
const render = (ui: React.ReactElement) => {
  return rtlRender(ui, { wrapper: TestWrapper });
};

describe('AdminDashboard', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with all tabs', () => {
    render(<AdminDashboard opened={true} onClose={mockOnClose} />);

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /users/i })).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /workspaces/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /statistics/i })
    ).toBeInTheDocument();
  });

  it('shows users tab by default', () => {
    render(<AdminDashboard opened={true} onClose={mockOnClose} />);

    expect(screen.getByTestId('admin-users-tab')).toBeInTheDocument();
    expect(
      screen.getByText('Users Tab - admin@example.com')
    ).toBeInTheDocument();
  });

  it('switches to workspaces tab when clicked', () => {
    render(<AdminDashboard opened={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByRole('tab', { name: /workspaces/i }));

    expect(screen.getByTestId('admin-workspaces-tab')).toBeInTheDocument();
    expect(screen.getByText('Workspaces Tab')).toBeInTheDocument();
  });

  it('switches to statistics tab when clicked', () => {
    render(<AdminDashboard opened={true} onClose={mockOnClose} />);

    fireEvent.click(screen.getByRole('tab', { name: /statistics/i }));

    expect(screen.getByTestId('admin-stats-tab')).toBeInTheDocument();
    expect(screen.getByText('Stats Tab')).toBeInTheDocument();
  });

  it('passes current user to users tab', () => {
    render(<AdminDashboard opened={true} onClose={mockOnClose} />);

    // Should pass current user to AdminUsersTab
    expect(
      screen.getByText('Users Tab - admin@example.com')
    ).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<AdminDashboard opened={false} onClose={mockOnClose} />);

    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
  });
});
