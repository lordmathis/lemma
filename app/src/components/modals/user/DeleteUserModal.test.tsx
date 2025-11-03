import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render as rtlRender,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';
import DeleteUserModal from './DeleteUserModal';
import { UserRole, Theme, type User } from '@/types/models';

// Mock notifications
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

// Helper wrapper component for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider defaultColorScheme="light">{children}</MantineProvider>
);

// Custom render function
const render = (ui: React.ReactElement) => {
  return rtlRender(ui, { wrapper: TestWrapper });
};

describe('DeleteUserModal', () => {
  const mockOnConfirm = vi.fn();
  const mockOnClose = vi.fn();

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    displayName: 'Test User',
    role: UserRole.Editor,
    theme: Theme.Dark,
    createdAt: '2024-01-01T00:00:00Z',
    lastWorkspaceId: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnConfirm.mockResolvedValue(undefined);
  });

  describe('Modal Visibility and Content', () => {
    it('renders modal when opened with user data and confirmation message', () => {
      render(
        <DeleteUserModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={mockUser}
          loading={false}
        />
      );

      expect(screen.getByText('Delete User')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Are you sure you want to delete user "test@example.com"? This action cannot be undone and all associated data will be permanently deleted.'
        )
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('cancel-delete-user-button')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('confirm-delete-user-button')
      ).toBeInTheDocument();
    });

    it('does not render modal when closed', () => {
      render(
        <DeleteUserModal
          opened={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={mockUser}
          loading={false}
        />
      );

      expect(screen.queryByText('Delete User')).not.toBeInTheDocument();
    });

    it('renders modal with null user showing empty email', () => {
      render(
        <DeleteUserModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={null}
          loading={false}
        />
      );

      expect(screen.getByText('Delete User')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Are you sure you want to delete user ""? This action cannot be undone and all associated data will be permanently deleted.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('Modal Actions', () => {
    it('calls onConfirm when delete button is clicked', async () => {
      render(
        <DeleteUserModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={mockUser}
          loading={false}
        />
      );

      fireEvent.click(screen.getByTestId('confirm-delete-user-button'));

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onClose when cancel button is clicked', () => {
      render(
        <DeleteUserModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={mockUser}
          loading={false}
        />
      );

      fireEvent.click(screen.getByTestId('cancel-delete-user-button'));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('shows loading state and disables delete button when loading', () => {
      render(
        <DeleteUserModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={mockUser}
          loading={true}
        />
      );

      const deleteButton = screen.getByTestId('confirm-delete-user-button');
      expect(deleteButton).toHaveAttribute('data-loading', 'true');
      expect(deleteButton).toBeDisabled();
    });
  });

  describe('Accessibility and Security', () => {
    it('has properly labeled buttons and destructive action warning', () => {
      render(
        <DeleteUserModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={mockUser}
          loading={false}
        />
      );

      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /delete/i })
      ).toBeInTheDocument();

      // Security: Clear warning about destructive action
      expect(
        screen.getByText(
          /This action cannot be undone and all associated data will be permanently deleted/
        )
      ).toBeInTheDocument();

      // Security: User identifier for verification
      expect(
        screen.getByText(/delete user "test@example.com"/)
      ).toBeInTheDocument();
    });
  });
});
