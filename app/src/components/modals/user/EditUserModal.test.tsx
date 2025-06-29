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
  });

  describe('Modal Visibility and Form Pre-population', () => {
    it('renders modal when opened with all form elements pre-populated', () => {
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

      // Verify form is pre-populated with user data
      const emailInput = screen.getByTestId('edit-user-email-input');
      const displayNameInput = screen.getByTestId(
        'edit-user-display-name-input'
      );
      const passwordInput = screen.getByTestId('edit-user-password-input');
      const roleSelect = screen.getByTestId('edit-user-role-select');

      expect(emailInput).toHaveValue('test@example.com');
      expect(displayNameInput).toHaveValue('Test User');
      expect(passwordInput).toHaveValue(''); // Password should be empty
      expect(roleSelect).toHaveDisplayValue('Editor');
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

    it('renders modal with null user showing empty form', () => {
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

      const emailInput = screen.getByTestId('edit-user-email-input');
      const displayNameInput = screen.getByTestId(
        'edit-user-display-name-input'
      );

      expect(emailInput).toHaveValue('');
      expect(displayNameInput).toHaveValue('');
    });

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
  });

  describe('Form Input Handling', () => {
    it('updates all input fields when typed', () => {
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

      fireEvent.change(emailInput, {
        target: { value: 'updated@example.com' },
      });
      fireEvent.change(displayNameInput, { target: { value: 'Updated User' } });
      fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });

      expect(emailInput).toHaveValue('updated@example.com');
      expect(displayNameInput).toHaveValue('Updated User');
      expect(passwordInput).toHaveValue('newpassword123');
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

      let emailInput = screen.getByTestId('edit-user-email-input');
      expect(emailInput).toHaveValue('test@example.com');

      const newUser: User = {
        ...mockUser,
        id: 2,
        email: 'newuser@example.com',
        displayName: 'New User',
        role: UserRole.Admin,
      };

      rerender(
        <TestWrapper>
          <EditUserModal
            opened={true}
            onClose={mockOnClose}
            onEditUser={mockOnEditUser}
            loading={false}
            user={newUser}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        emailInput = screen.getByTestId('edit-user-email-input');
        expect(emailInput).toHaveValue('newuser@example.com');
      });

      const displayNameInput = screen.getByTestId(
        'edit-user-display-name-input'
      );
      const roleSelect = screen.getByTestId('edit-user-role-select');

      expect(displayNameInput).toHaveValue('New User');
      expect(roleSelect).toHaveDisplayValue('Admin');
    });
  });

  describe('Form Submission', () => {
    it('submits form with all changes and closes modal on success', async () => {
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

      fireEvent.change(emailInput, {
        target: { value: 'updated@example.com' },
      });
      fireEvent.change(displayNameInput, { target: { value: 'Updated User' } });
      fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });

      fireEvent.click(screen.getByTestId('confirm-edit-user-button'));

      await waitFor(() => {
        expect(mockOnEditUser).toHaveBeenCalledWith(mockUser.id, {
          email: 'updated@example.com',
          displayName: 'Updated User',
          password: 'newpassword123',
          role: mockUser.role,
        });
      });

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('submits form with password change only', async () => {
      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      fireEvent.change(screen.getByTestId('edit-user-password-input'), {
        target: { value: 'newpassword123' },
      });
      fireEvent.click(screen.getByTestId('confirm-edit-user-button'));

      await waitFor(() => {
        expect(mockOnEditUser).toHaveBeenCalledWith(mockUser.id, {
          email: mockUser.email,
          displayName: mockUser.displayName,
          password: 'newpassword123',
          role: mockUser.role,
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

      fireEvent.click(screen.getByTestId('confirm-edit-user-button'));
      expect(mockOnEditUser).not.toHaveBeenCalled();
    });

    it('calls onClose when cancel button is clicked', () => {
      render(
        <EditUserModal
          opened={true}
          onClose={mockOnClose}
          onEditUser={mockOnEditUser}
          loading={false}
          user={mockUser}
        />
      );

      fireEvent.click(screen.getByTestId('cancel-edit-user-button'));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('keeps modal open and preserves form data when edit fails', async () => {
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
      fireEvent.click(screen.getByTestId('confirm-edit-user-button'));

      await waitFor(() => {
        expect(mockOnEditUser).toHaveBeenCalled();
      });

      // Modal should remain open and form data preserved
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(screen.getByText('Edit User')).toBeInTheDocument();
      expect(emailInput).toHaveValue('persist@example.com');
      expect(displayNameInput).toHaveValue('Persist User');
    });
  });

  describe('Loading State', () => {
    it('shows loading state and disables save button when loading', () => {
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
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and input types', () => {
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

    it('has properly labeled buttons', () => {
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
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /save changes/i })
      ).toBeInTheDocument();
    });
  });
});
