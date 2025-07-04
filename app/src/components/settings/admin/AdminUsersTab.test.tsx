import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render as rtlRender,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';
import AdminUsersTab from './AdminUsersTab';
import { UserRole, type User } from '@/types/models';

// Mock the user admin hook
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock('../../../hooks/useUserAdmin', () => ({
  useUserAdmin: vi.fn(),
}));

// Mock notifications
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

// Mock the user modals
vi.mock('../../modals/user/CreateUserModal', () => ({
  default: ({
    opened,
    onCreateUser,
  }: {
    opened: boolean;
    onCreateUser: (userData: {
      email: string;
      password: string;
      displayName: string;
      role: UserRole;
    }) => Promise<boolean>;
  }) =>
    opened ? (
      <div data-testid="create-user-modal">
        <button
          onClick={() =>
            void onCreateUser({
              email: 'new@example.com',
              password: 'pass',
              displayName: 'New User',
              role: UserRole.Editor,
            })
          }
          data-testid="create-user-button"
        >
          Create User
        </button>
      </div>
    ) : null,
}));

vi.mock('../../modals/user/EditUserModal', () => ({
  default: ({
    opened,
    onEditUser,
    user,
  }: {
    opened: boolean;
    onEditUser: (
      userId: number,
      userData: { email: string }
    ) => Promise<boolean>;
    user: User | null;
  }) =>
    opened ? (
      <div data-testid="edit-user-modal">
        <span data-testid="edit-user-email">{user?.email}</span>
        <button
          onClick={() =>
            void onEditUser(user?.id || 0, { email: 'updated@example.com' })
          }
          data-testid="edit-user-button"
        >
          Update User
        </button>
      </div>
    ) : null,
}));

vi.mock('../../modals/user/DeleteUserModal', () => ({
  default: ({
    opened,
    onConfirm,
  }: {
    opened: boolean;
    onConfirm: () => Promise<void>;
  }) =>
    opened ? (
      <div data-testid="delete-user-modal">
        <button
          onClick={() => void onConfirm()}
          data-testid="delete-user-button"
        >
          Delete User
        </button>
      </div>
    ) : null,
}));

// Helper wrapper component for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider defaultColorScheme="light">{children}</MantineProvider>
);

// Custom render function
const render = (ui: React.ReactElement) => {
  return rtlRender(ui, { wrapper: TestWrapper });
};

describe('AdminUsersTab', () => {
  const mockCurrentUser: User = {
    id: 1,
    email: 'admin@example.com',
    displayName: 'Admin User',
    role: UserRole.Admin,
    createdAt: '2024-01-01T00:00:00Z',
    lastWorkspaceId: 1,
  };

  const mockUsers: User[] = [
    mockCurrentUser,
    {
      id: 2,
      email: 'editor@example.com',
      displayName: 'Editor User',
      role: UserRole.Editor,
      createdAt: '2024-01-15T00:00:00Z',
      lastWorkspaceId: 2,
    },
    {
      id: 3,
      email: 'viewer@example.com',
      displayName: 'Viewer User',
      role: UserRole.Viewer,
      createdAt: '2024-02-01T00:00:00Z',
      lastWorkspaceId: 3,
    },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue(true);
    mockUpdate.mockResolvedValue(true);
    mockDelete.mockResolvedValue(true);

    const { useUserAdmin } = await import('../../../hooks/useUserAdmin');
    vi.mocked(useUserAdmin).mockReturnValue({
      users: mockUsers,
      loading: false,
      error: null,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
    });
  });

  it('renders users table with all users', () => {
    render(<AdminUsersTab currentUser={mockCurrentUser} />);

    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('editor@example.com')).toBeInTheDocument();
    expect(screen.getByText('viewer@example.com')).toBeInTheDocument();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('Editor User')).toBeInTheDocument();
    expect(screen.getByText('Viewer User')).toBeInTheDocument();
  });

  it('shows create user button', () => {
    render(<AdminUsersTab currentUser={mockCurrentUser} />);

    expect(
      screen.getByRole('button', { name: /create user/i })
    ).toBeInTheDocument();
  });

  it('opens create user modal when create button is clicked', () => {
    render(<AdminUsersTab currentUser={mockCurrentUser} />);

    fireEvent.click(screen.getByRole('button', { name: /create user/i }));

    expect(screen.getByTestId('create-user-modal')).toBeInTheDocument();
  });

  it('creates new user successfully', async () => {
    render(<AdminUsersTab currentUser={mockCurrentUser} />);

    fireEvent.click(screen.getByRole('button', { name: /create user/i }));
    fireEvent.click(screen.getByTestId('create-user-button'));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'pass',
        displayName: 'New User',
        role: UserRole.Editor,
      });
    });
  });

  it('opens edit modal when edit button is clicked', () => {
    render(<AdminUsersTab currentUser={mockCurrentUser} />);

    const editButtons = screen.getAllByLabelText(/edit/i);
    expect(editButtons[0]).toBeDefined();
    fireEvent.click(editButtons[0]!); // Click first edit button

    expect(screen.getByTestId('edit-user-modal')).toBeInTheDocument();
    expect(screen.getByTestId('edit-user-email')).toHaveTextContent(
      'admin@example.com'
    );
  });

  it('updates user successfully', async () => {
    render(<AdminUsersTab currentUser={mockCurrentUser} />);

    const editButtons = screen.getAllByLabelText(/edit/i);
    expect(editButtons[0]).toBeDefined();
    fireEvent.click(editButtons[0]!);
    fireEvent.click(screen.getByTestId('edit-user-button'));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(1, {
        email: 'updated@example.com',
      });
    });
  });

  it('prevents deleting current user', () => {
    render(<AdminUsersTab currentUser={mockCurrentUser} />);

    const deleteButtons = screen.getAllByLabelText(/delete/i);
    const currentUserDeleteButton = deleteButtons[0]; // First user is current user

    expect(currentUserDeleteButton).toBeDefined();
    expect(currentUserDeleteButton).toBeDisabled();
  });

  it('allows deleting other users', () => {
    render(<AdminUsersTab currentUser={mockCurrentUser} />);

    const deleteButtons = screen.getAllByLabelText(/delete/i);
    expect(deleteButtons[1]).toBeDefined();
    fireEvent.click(deleteButtons[1]!); // Click delete for second user

    expect(screen.getByTestId('delete-user-modal')).toBeInTheDocument();
  });

  it('deletes user successfully', async () => {
    render(<AdminUsersTab currentUser={mockCurrentUser} />);

    const deleteButtons = screen.getAllByLabelText(/delete/i);
    expect(deleteButtons[1]).toBeDefined();
    fireEvent.click(deleteButtons[1]!);
    fireEvent.click(screen.getByTestId('delete-user-button'));

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(2); // Second user's ID
    });
  });

  it('shows error state when loading fails', async () => {
    const { useUserAdmin } = await import('../../../hooks/useUserAdmin');
    vi.mocked(useUserAdmin).mockReturnValue({
      users: [],
      loading: false,
      error: 'Failed to load users',
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
    });

    render(<AdminUsersTab currentUser={mockCurrentUser} />);

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load users')).toBeInTheDocument();
  });
});
