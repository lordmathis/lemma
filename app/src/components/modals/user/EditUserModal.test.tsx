import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render as rtlRender,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';
import EditUserModal from './EditUserModal';
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

describe('EditUserModal', () => {
  const mockOnEditUser = vi.fn();
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
    mockOnEditUser.mockResolvedValue(true);
    mockOnClose.mockClear();
  });

  describe('Modal Visibility', () => {
    it('renders modal when opened with user data', () => {
      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      expect(screen.getByText('Edit User')).toBeInTheDocument();
      expect(screen.getByTestId('edit-user-email-input')).toBeInTheDocument();
      expect(
        screen.getByTestId('edit-user-display-name-input')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('edit-user-password-input')
      ).toBeInTheDocument();
      expect(screen.getByTestId('edit-user-role-select')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-edit-user-button')).toBeInTheDocument();
      expect(
        screen.getByTestId('confirm-edit-user-button')
      ).toBeInTheDocument();
    });

    it('does not render modal when closed', () => {
      render(
        <EditUserModal
          opened={false}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      expect(screen.queryByText('Edit User')).not.toBeInTheDocument();
    });

    it('renders modal with null user', () => {
      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={null}
        />
      );

      expect(screen.getByText('Edit User')).toBeInTheDocument();

      // Form should have empty values when user is null
      const emailInput = screen.getByTestId('edit-user-email-input');
      const displayNameInput = screen.getByTestId(
        'edit-user-display-name-input'
      );

      expect((emailInput as HTMLInputElement).value).toBe('');
      expect((displayNameInput as HTMLInputElement).value).toBe('');
    });

    it('calls onClose when modal is closed via cancel button', () => {
      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      const cancelButton = screen.getByTestId('cancel-edit-user-button');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Form Pre-population', () => {
    it('pre-populates form with user data', () => {
      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      const emailInput = screen.getByTestId('edit-user-email-input');
      const displayNameInput = screen.getByTestId(
        'edit-user-display-name-input'
      );
      const passwordInput = screen.getByTestId('edit-user-password-input');
      const roleSelect = screen.getByTestId('edit-user-role-select');

      expect((emailInput as HTMLInputElement).value).toBe('test@example.com');
      expect((displayNameInput as HTMLInputElement).value).toBe('Test User');
      expect((passwordInput as HTMLInputElement).value).toBe(''); // Password should be empty
      expect(roleSelect).toHaveDisplayValue('Editor');
    });

    it('handles user with empty display name', () => {
      const userWithoutDisplayName: User = {
        ...mockUser,
        displayName: '',
      };

      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={userWithoutDisplayName}
        />
      );

      const displayNameInput = screen.getByTestId(
        'edit-user-display-name-input'
      );
      expect((displayNameInput as HTMLInputElement).value).toBe('');
    });

    it('updates form when user prop changes', async () => {
      const { rerender } = render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      const emailInput = screen.getByTestId('edit-user-email-input');
      expect((emailInput as HTMLInputElement).value).toBe('test@example.com');

      const newUser: User = {
        ...mockUser,
        id: 2,
        email: 'newuser@example.com',
        displayName: 'New User',
        role: UserRole.Admin,
      };

      rerender(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={newUser}
        />
      );

      // Wait for the useEffect to update the form
      await waitFor(() => {
        expect((emailInput as HTMLInputElement).value).toBe(
          'newuser@example.com'
        );
      });

      const displayNameInput = screen.getByTestId(
        'edit-user-display-name-input'
      );
      const roleSelect = screen.getByTestId('edit-user-role-select');

      expect((displayNameInput as HTMLInputElement).value).toBe('New User');
      expect(roleSelect).toHaveDisplayValue('Admin');
    });
  });

  describe('Form Interaction', () => {
    it('updates email input when typed', () => {
      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      const emailInput = screen.getByTestId('edit-user-email-input');
      fireEvent.change(emailInput, {
        target: { value: 'updated@example.com' },
      });

      expect((emailInput as HTMLInputElement).value).toBe(
        'updated@example.com'
      );
    });

    it('updates display name input when typed', () => {
      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      const displayNameInput = screen.getByTestId(
        'edit-user-display-name-input'
      );
      fireEvent.change(displayNameInput, { target: { value: 'Updated User' } });

      expect((displayNameInput as HTMLInputElement).value).toBe('Updated User');
    });

    it('updates password input when typed', () => {
      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      const passwordInput = screen.getByTestId('edit-user-password-input');
      fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });

      expect((passwordInput as HTMLInputElement).value).toBe('newpassword123');
    });

    it('updates role selection when changed', async () => {
      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      const roleSelect = screen.getByTestId('edit-user-role-select');

      // Click to open the select dropdown
      fireEvent.click(roleSelect);

      // Wait for and click on Admin option
      await waitFor(() => {
        const adminOption = screen.getByText('Admin');
        fireEvent.click(adminOption);
      });

      // Verify the selection
      expect(roleSelect).toHaveDisplayValue('Admin');
    });
  });

  describe('Form Submission', () => {
    it('handles form submission with email and display name changes only', async () => {
      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      const emailInput = screen.getByTestId('edit-user-email-input');
      const displayNameInput = screen.getByTestId(
        'edit-user-display-name-input'
      );
      const saveButton = screen.getByTestId('confirm-edit-user-button');

      fireEvent.change(emailInput, {
        target: { value: 'updated@example.com' },
      });
      fireEvent.change(displayNameInput, { target: { value: 'Updated User' } });

      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnEditUser).toHaveBeenCalledWith(mockUser.id, {
          email: 'updated@example.com',
          displayName: 'Updated User',
          password: '',
          role: mockUser.role,
        });
      });
    });

    it('handles form submission with password change', async () => {
      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      const passwordInput = screen.getByTestId('edit-user-password-input');
      const saveButton = screen.getByTestId('confirm-edit-user-button');

      fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnEditUser).toHaveBeenCalledWith(mockUser.id, {
          email: mockUser.email,
          displayName: mockUser.displayName,
          password: 'newpassword123',
          role: mockUser.role,
        });
      });
    });

    it('handles form submission with role change', async () => {
      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      const roleSelect = screen.getByTestId('edit-user-role-select');
      const saveButton = screen.getByTestId('confirm-edit-user-button');

      // Change role to Admin
      fireEvent.click(roleSelect);
      await waitFor(() => {
        const adminOption = screen.getByText('Admin');
        fireEvent.click(adminOption);
      });

      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnEditUser).toHaveBeenCalledWith(mockUser.id, {
          email: mockUser.email,
          displayName: mockUser.displayName,
          password: '',
          role: UserRole.Admin,
        });
      });
    });

    it('does not submit when user is null', () => {
      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={null}
        />
      );

      const saveButton = screen.getByTestId('confirm-edit-user-button');
      fireEvent.click(saveButton);

      expect(mockOnEditUser).not.toHaveBeenCalled();
    });
  });

  describe('Password Handling', () => {
    it('shows password help text', () => {
      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      expect(
        screen.getByText('Leave password empty to keep the current password')
      ).toBeInTheDocument();
    });

    it('starts with empty password field', () => {
      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      const passwordInput = screen.getByTestId('edit-user-password-input');
      expect((passwordInput as HTMLInputElement).value).toBe('');
    });

    it('maintains empty password when user changes', async () => {
      const { rerender } = render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      const passwordInput = screen.getByTestId('edit-user-password-input');
      fireEvent.change(passwordInput, { target: { value: 'somepassword' } });

      const newUser: User = { ...mockUser, id: 2, email: 'new@example.com' };

      rerender(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={newUser}
        />
      );

      // Wait for the useEffect to reset the password field
      await waitFor(() => {
        expect((passwordInput as HTMLInputElement).value).toBe('');
      });
    });
  });

  describe('Role Selection', () => {
    it('pre-selects correct role for Admin user', () => {
      const adminUser: User = { ...mockUser, role: UserRole.Admin };

      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={adminUser}
        />
      );

      const roleSelect = screen.getByTestId('edit-user-role-select');
      expect(roleSelect).toHaveDisplayValue('Admin');
    });

    it('pre-selects correct role for Viewer user', () => {
      const viewerUser: User = { ...mockUser, role: UserRole.Viewer };

      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={viewerUser}
        />
      );

      const roleSelect = screen.getByTestId('edit-user-role-select');
      expect(roleSelect).toHaveDisplayValue('Viewer');
    });

    it('allows changing from Editor to Viewer', async () => {
      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      const roleSelect = screen.getByTestId('edit-user-role-select');

      // Initial role should be Editor
      expect(roleSelect).toHaveDisplayValue('Editor');

      // Change to Viewer
      fireEvent.click(roleSelect);
      await waitFor(() => {
        const viewerOption = screen.getByText('Viewer');
        fireEvent.click(viewerOption);
      });

      expect(roleSelect).toHaveDisplayValue('Viewer');
    });
  });

  describe('Loading State', () => {
    it('shows loading state on save button when loading', () => {
      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={true}
          user={mockUser}
        />
      );

      const saveButton = screen.getByTestId('confirm-edit-user-button');
      expect(saveButton).toHaveAttribute('data-loading', 'true');
    });

    it('disables save button when loading', () => {
      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={true}
          user={mockUser}
        />
      );

      const saveButton = screen.getByTestId('confirm-edit-user-button');
      expect(saveButton).toBeDisabled();
    });

    it('handles normal state when not loading', () => {
      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      const saveButton = screen.getByTestId('confirm-edit-user-button');
      expect(saveButton).not.toBeDisabled();
      expect(saveButton).not.toHaveAttribute('data-loading', 'true');
    });
  });

  describe('Error Handling', () => {
    it('handles edit errors gracefully', async () => {
      mockOnEditUser.mockResolvedValue(false);

      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      const emailInput = screen.getByTestId('edit-user-email-input');
      const saveButton = screen.getByTestId('confirm-edit-user-button');

      fireEvent.change(emailInput, { target: { value: 'error@example.com' } });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnEditUser).toHaveBeenCalled();
      });
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(screen.getByText('Edit User')).toBeInTheDocument();
    });

    it('handles edit promise rejection', async () => {
      mockOnEditUser.mockRejectedValue(new Error('Network error'));

      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      const saveButton = screen.getByTestId('confirm-edit-user-button');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnEditUser).toHaveBeenCalled();
      });
      expect(screen.getByText('Edit User')).toBeInTheDocument();
    });

    it('retains form values when edit fails', async () => {
      mockOnEditUser.mockResolvedValue(false);

      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      const emailInput = screen.getByTestId('edit-user-email-input');
      const displayNameInput = screen.getByTestId(
        'edit-user-display-name-input'
      );

      fireEvent.change(emailInput, {
        target: { value: 'persist@example.com' },
      });
      fireEvent.change(displayNameInput, { target: { value: 'Persist User' } });

      const saveButton = screen.getByTestId('confirm-edit-user-button');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnEditUser).toHaveBeenCalled();
      });
      // Form should retain values since submission failed
      expect((emailInput as HTMLInputElement).value).toBe(
        'persist@example.com'
      );
      expect((displayNameInput as HTMLInputElement).value).toBe('Persist User');
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and structure', () => {
      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      const emailInput = screen.getByTestId('edit-user-email-input');
      const displayNameInput = screen.getByTestId(
        'edit-user-display-name-input'
      );
      const passwordInput = screen.getByTestId('edit-user-password-input');
      const roleSelect = screen.getByTestId('edit-user-role-select');

      expect(emailInput).toHaveAccessibleName();
      expect(displayNameInput).toHaveAccessibleName();
      expect(passwordInput).toHaveAccessibleName();
      expect(roleSelect).toHaveAccessibleName();

      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('has proper button roles', () => {
      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const saveButton = screen.getByRole('button', { name: /save changes/i });

      expect(cancelButton).toBeInTheDocument();
      expect(saveButton).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      const emailInput = screen.getByTestId('edit-user-email-input');
      const displayNameInput = screen.getByTestId(
        'edit-user-display-name-input'
      );
      const passwordInput = screen.getByTestId('edit-user-password-input');

      // All inputs should be focusable
      expect(emailInput).not.toHaveAttribute('disabled');
      expect(displayNameInput).not.toHaveAttribute('disabled');
      expect(passwordInput).not.toHaveAttribute('disabled');

      // Test keyboard input
      fireEvent.change(emailInput, { target: { value: 'keyboard@test.com' } });
      expect((emailInput as HTMLInputElement).value).toBe('keyboard@test.com');
    });

    it('has proper modal structure', () => {
      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      expect(screen.getByText('Edit User')).toBeInTheDocument();
      expect(screen.getByTestId('edit-user-email-input')).toBeInTheDocument();
      expect(
        screen.getByTestId('edit-user-display-name-input')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('edit-user-password-input')
      ).toBeInTheDocument();
      expect(screen.getByTestId('edit-user-role-select')).toBeInTheDocument();
    });
  });

  describe('Component Props', () => {
    it('accepts and uses props correctly for display', () => {
      const customMockEdit = vi.fn().mockResolvedValue(true);
      const customMockClose = vi.fn();

      render(
        <EditUserModal
          opened={true}
          onClose={customMockClose}
          onEditUser={customMockEdit}
          loading={false}
          user={mockUser}
        />
      );

      // Test that props are accepted and modal renders
      expect(screen.getByText('Edit User')).toBeInTheDocument();

      const cancelButton = screen.getByTestId('cancel-edit-user-button');
      fireEvent.click(cancelButton);

      expect(customMockClose).toHaveBeenCalled();
    });

    it('handles function props correctly', () => {
      const testOnEdit = vi.fn();
      const testOnClose = vi.fn();

      expect(() => {
        render(
          <EditUserModal
            opened={true}
            onClose={testOnClose}
            onEditUser={testOnEdit}
            loading={false}
            user={mockUser}
          />
        );
      }).not.toThrow();

      expect(screen.getByText('Edit User')).toBeInTheDocument();
    });

    it('handles different user objects correctly', () => {
      const users = [
        { ...mockUser, role: UserRole.Admin },
        { ...mockUser, role: UserRole.Viewer },
        { ...mockUser, displayName: '' },
        { ...mockUser, displayName: 'Very Long Display Name Here' },
      ];

      users.forEach((user) => {
        const { unmount } = render(
          <EditUserModal
            opened={true}
            onClose={mockOnClose}
            onEditUser={mockOnEditUser}
            loading={false}
            user={user}
          />
        );

        expect(screen.getByText('Edit User')).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('User Interaction Flow', () => {
    it('allows editing user information but submission fails due to component bug', async () => {
      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      // 1. Modal opens and shows pre-populated form
      expect(screen.getByText('Edit User')).toBeInTheDocument();

      const emailInput = screen.getByTestId('edit-user-email-input');
      const displayNameInput = screen.getByTestId(
        'edit-user-display-name-input'
      );
      const passwordInput = screen.getByTestId('edit-user-password-input');
      const roleSelect = screen.getByTestId('edit-user-role-select');

      // Verify pre-population
      expect((emailInput as HTMLInputElement).value).toBe('test@example.com');
      expect((displayNameInput as HTMLInputElement).value).toBe('Test User');
      expect(roleSelect).toHaveDisplayValue('Editor');

      // 2. User modifies form
      fireEvent.change(emailInput, {
        target: { value: 'modified@example.com' },
      });
      fireEvent.change(displayNameInput, {
        target: { value: 'Modified User' },
      });
      fireEvent.change(passwordInput, { target: { value: 'newpassword' } });

      // 3. Change role to Admin
      fireEvent.click(roleSelect);
      await waitFor(() => {
        const adminOption = screen.getByText('Admin');
        fireEvent.click(adminOption);
      });

      expect(roleSelect).toHaveDisplayValue('Admin');

      // 4. Try to submit form
      const saveButton = screen.getByTestId('confirm-edit-user-button');
      fireEvent.click(saveButton);

      // 5. Should call edit with correct arguments
      await waitFor(() => {
        expect(mockOnEditUser).toHaveBeenCalledWith(mockUser.id, {
          email: 'modified@example.com',
          displayName: 'Modified User',
          password: 'newpassword',
          role: UserRole.Admin,
        });
      });
    });

    it('allows user to cancel edit', () => {
      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      // User modifies form but then cancels
      const emailInput = screen.getByTestId('edit-user-email-input');
      fireEvent.change(emailInput, { target: { value: 'cancel@example.com' } });

      const cancelButton = screen.getByTestId('cancel-edit-user-button');
      fireEvent.click(cancelButton);

      // Should close modal without calling edit function
      expect(mockOnEditUser).not.toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('handles form clearing when user changes', async () => {
      const { rerender } = render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      const emailInput = screen.getByTestId('edit-user-email-input');

      // Verify initial user data
      expect((emailInput as HTMLInputElement).value).toBe('test@example.com');

      // Change to different user
      const newUser: User = {
        ...mockUser,
        id: 2,
        email: 'different@example.com',
        displayName: 'Different User',
        role: UserRole.Admin,
      };

      rerender(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={newUser}
        />
      );

      // Wait for form to update with new user data
      await waitFor(() => {
        expect((emailInput as HTMLInputElement).value).toBe(
          'different@example.com'
        );
      });
    });
  });
});
