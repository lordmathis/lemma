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
import { UserRole, type User } from '@/types/models';

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
    createdAt: '2024-01-01T00:00:00Z',
    lastWorkspaceId: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnConfirm.mockResolvedValue(undefined);
    mockOnClose.mockClear();
  });

  describe('Modal Visibility', () => {
    it('renders modal when opened with user data', () => {
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

    it('renders modal with null user', () => {
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

    it('calls onClose when modal is closed via cancel button', () => {
      render(
        <DeleteUserModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={mockUser}
          loading={false}
        />
      );

      const cancelButton = screen.getByTestId('cancel-delete-user-button');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('User Information Display', () => {
    it('displays correct user email in confirmation message', () => {
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
        screen.getByText(
          'Are you sure you want to delete user "test@example.com"? This action cannot be undone and all associated data will be permanently deleted.'
        )
      ).toBeInTheDocument();
    });

    it('handles various email formats in confirmation message', () => {
      const emailFormats = [
        'simple@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'very.long.email.address@domain.co.uk',
      ];

      emailFormats.forEach((email) => {
        const userWithEmail = { ...mockUser, email };
        const { unmount } = render(
          <DeleteUserModal
            opened={true}
            onClose={mockOnClose}
            onConfirm={mockOnConfirm}
            user={userWithEmail}
            loading={false}
          />
        );

        expect(
          screen.getByText(
            `Are you sure you want to delete user "${email}"? This action cannot be undone and all associated data will be permanently deleted.`
          )
        ).toBeInTheDocument();

        unmount();
      });
    });

    it('handles user with special characters in email', () => {
      const specialUser = { ...mockUser, email: 'user"with@quotes.com' };

      render(
        <DeleteUserModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={specialUser}
          loading={false}
        />
      );

      expect(
        screen.getByText(
          'Are you sure you want to delete user "user"with@quotes.com"? This action cannot be undone and all associated data will be permanently deleted.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('Modal Actions', () => {
    it('has cancel and delete buttons with correct text', () => {
      render(
        <DeleteUserModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={mockUser}
          loading={false}
        />
      );

      const cancelButton = screen.getByTestId('cancel-delete-user-button');
      const deleteButton = screen.getByTestId('confirm-delete-user-button');

      expect(cancelButton).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();

      expect(cancelButton).toHaveTextContent('Cancel');
      expect(deleteButton).toHaveTextContent('Delete');

      expect(cancelButton).toHaveRole('button');
      expect(deleteButton).toHaveRole('button');
    });

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

      const deleteButton = screen.getByTestId('confirm-delete-user-button');
      fireEvent.click(deleteButton);

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

      const cancelButton = screen.getByTestId('cancel-delete-user-button');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('shows loading state on delete button when loading', () => {
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
    });

    it('disables delete button when loading', () => {
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
      expect(deleteButton).toBeDisabled();
    });

    it('handles normal state when not loading', () => {
      render(
        <DeleteUserModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={mockUser}
          loading={false}
        />
      );

      const deleteButton = screen.getByTestId('confirm-delete-user-button');
      expect(deleteButton).not.toBeDisabled();
      expect(deleteButton).not.toHaveAttribute('data-loading', 'true');
    });
  });

  describe('Error Handling', () => {
    it('handles deletion errors gracefully', async () => {
      mockOnConfirm.mockRejectedValue(new Error('Deletion failed'));

      render(
        <DeleteUserModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={mockUser}
          loading={false}
        />
      );

      const deleteButton = screen.getByTestId('confirm-delete-user-button');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalled();
      });

      // Modal should handle the error gracefully (not crash)
      expect(screen.getByText('Delete User')).toBeInTheDocument();
    });

    it('handles network errors', async () => {
      mockOnConfirm.mockRejectedValue(new Error('Network error'));

      render(
        <DeleteUserModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={mockUser}
          loading={false}
        />
      );

      const deleteButton = screen.getByTestId('confirm-delete-user-button');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalled();
      });

      // Should not crash the component
      expect(screen.getByText('Delete User')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper modal structure', () => {
      render(
        <DeleteUserModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={mockUser}
          loading={false}
        />
      );

      // Modal should have proper title
      expect(screen.getByText('Delete User')).toBeInTheDocument();

      // Should have confirmation text
      expect(
        screen.getByText(/Are you sure you want to delete user/)
      ).toBeInTheDocument();
    });

    it('has proper button roles', () => {
      render(
        <DeleteUserModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={mockUser}
          loading={false}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const deleteButton = screen.getByRole('button', { name: /delete/i });

      expect(cancelButton).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(
        <DeleteUserModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={mockUser}
          loading={false}
        />
      );

      const cancelButton = screen.getByTestId('cancel-delete-user-button');
      const deleteButton = screen.getByTestId('confirm-delete-user-button');

      // Buttons should be focusable
      expect(cancelButton).not.toHaveAttribute('disabled');
      expect(deleteButton).not.toHaveAttribute('disabled');

      // Should handle keyboard events
      fireEvent.keyDown(deleteButton, { key: 'Enter', code: 'Enter' });
      fireEvent.keyDown(cancelButton, { key: 'Escape', code: 'Escape' });
    });

    it('has proper confirmation message structure', () => {
      render(
        <DeleteUserModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={mockUser}
          loading={false}
        />
      );

      // Check that the user email is properly quoted in the message
      expect(
        screen.getByText(
          /Are you sure you want to delete user "test@example.com"?/
        )
      ).toBeInTheDocument();
    });
  });

  describe('Component Props', () => {
    it('accepts and uses onConfirm prop correctly', async () => {
      const customMockConfirm = vi.fn().mockResolvedValue(undefined);

      render(
        <DeleteUserModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={customMockConfirm}
          user={mockUser}
          loading={false}
        />
      );

      const deleteButton = screen.getByTestId('confirm-delete-user-button');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(customMockConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it('accepts and uses onClose prop correctly', () => {
      const customMockClose = vi.fn();

      render(
        <DeleteUserModal
          opened={true}
          onClose={customMockClose}
          onConfirm={mockOnConfirm}
          user={mockUser}
          loading={false}
        />
      );

      const cancelButton = screen.getByTestId('cancel-delete-user-button');
      fireEvent.click(cancelButton);

      expect(customMockClose).toHaveBeenCalled();
    });

    it('handles function props correctly', () => {
      const testOnConfirm = vi.fn();
      const testOnClose = vi.fn();

      expect(() => {
        render(
          <DeleteUserModal
            opened={true}
            onClose={testOnClose}
            onConfirm={testOnConfirm}
            user={mockUser}
            loading={false}
          />
        );
      }).not.toThrow();

      expect(screen.getByText('Delete User')).toBeInTheDocument();
    });

    it('handles different user objects correctly', () => {
      const users = [
        { ...mockUser, role: UserRole.Admin },
        { ...mockUser, role: UserRole.Viewer },
        { ...mockUser, email: 'admin@example.com' },
        { ...mockUser, displayName: 'Admin User' },
      ];

      users.forEach((user) => {
        const { unmount } = render(
          <DeleteUserModal
            opened={true}
            onClose={mockOnClose}
            onConfirm={mockOnConfirm}
            user={user}
            loading={false}
          />
        );

        expect(screen.getByText('Delete User')).toBeInTheDocument();
        expect(
          screen.getByText(
            `Are you sure you want to delete user "${user.email}"?`,
            { exact: false }
          )
        ).toBeInTheDocument();
        unmount();
      });
    });

    it('handles opened prop correctly', () => {
      const { rerender } = render(
        <DeleteUserModal
          opened={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={mockUser}
          loading={false}
        />
      );

      // Should not be visible when opened is false
      expect(screen.queryByText('Delete User')).not.toBeInTheDocument();

      rerender(
        <TestWrapper>
          <DeleteUserModal
            opened={true}
            onClose={mockOnClose}
            onConfirm={mockOnConfirm}
            user={mockUser}
            loading={false}
          />
        </TestWrapper>
      );

      // Should be visible when opened is true
      expect(screen.getByText('Delete User')).toBeInTheDocument();
    });
  });

  describe('User Interaction Flow', () => {
    it('completes full deletion confirmation flow successfully', async () => {
      render(
        <DeleteUserModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={mockUser}
          loading={false}
        />
      );

      // 1. Modal opens and shows user information
      expect(screen.getByText('Delete User')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Are you sure you want to delete user "test@example.com"? This action cannot be undone and all associated data will be permanently deleted.'
        )
      ).toBeInTheDocument();

      // 2. User clicks delete
      const deleteButton = screen.getByTestId('confirm-delete-user-button');
      fireEvent.click(deleteButton);

      // 3. Confirmation function is called
      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it('allows user to cancel deletion', () => {
      render(
        <DeleteUserModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={mockUser}
          loading={false}
        />
      );

      // User clicks cancel instead of delete
      const cancelButton = screen.getByTestId('cancel-delete-user-button');
      fireEvent.click(cancelButton);

      // Should close modal without calling confirm function
      expect(mockOnConfirm).not.toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('handles multiple rapid clicks gracefully', () => {
      render(
        <DeleteUserModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={mockUser}
          loading={false}
        />
      );

      const deleteButton = screen.getByTestId('confirm-delete-user-button');

      // Rapidly click multiple times - should not crash
      fireEvent.click(deleteButton);
      fireEvent.click(deleteButton);
      fireEvent.click(deleteButton);

      // Verify component is still functional
      expect(screen.getByText('Delete User')).toBeInTheDocument();
      expect(mockOnConfirm).toHaveBeenCalled();
    });
  });

  describe('Security Considerations', () => {
    it('clearly shows destructive action warning', () => {
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
        screen.getByText(
          /This action cannot be undone and all associated data will be permanently deleted/
        )
      ).toBeInTheDocument();
    });

    it('requires explicit confirmation', () => {
      render(
        <DeleteUserModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={mockUser}
          loading={false}
        />
      );

      // Should show clear delete button
      const deleteButton = screen.getByTestId('confirm-delete-user-button');
      expect(deleteButton).toHaveTextContent('Delete');
    });

    it('displays user identifier for verification', () => {
      render(
        <DeleteUserModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={mockUser}
          loading={false}
        />
      );

      // User should be able to verify they're deleting the right user
      expect(
        screen.getByText(/delete user "test@example.com"/)
      ).toBeInTheDocument();
    });
  });
});
