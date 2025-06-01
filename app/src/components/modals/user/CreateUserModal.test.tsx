import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render as rtlRender,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';
import CreateUserModal from './CreateUserModal';
import { UserRole } from '@/types/models';
import type { CreateUserRequest } from '@/types/api';

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

describe('CreateUserModal', () => {
  const mockOnCreateUser = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnCreateUser.mockResolvedValue(true);
    mockOnClose.mockClear();
  });

  describe('Modal Visibility', () => {
    it('renders modal when opened', () => {
      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      expect(screen.getByText('Create New User')).toBeInTheDocument();
      expect(screen.getByTestId('create-user-email-input')).toBeInTheDocument();
      expect(
        screen.getByTestId('create-user-display-name-input')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('create-user-password-input')
      ).toBeInTheDocument();
      expect(screen.getByTestId('create-user-role-select')).toBeInTheDocument();
      expect(
        screen.getByTestId('cancel-create-user-button')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('confirm-create-user-button')
      ).toBeInTheDocument();
    });

    it('does not render modal when closed', () => {
      render(
        <CreateUserModal
          opened={false}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      expect(screen.queryByText('Create New User')).not.toBeInTheDocument();
    });

    it('calls onClose when modal is closed via cancel button', () => {
      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      const cancelButton = screen.getByTestId('cancel-create-user-button');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Form Interaction', () => {
    it('updates email input when typed', () => {
      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      const emailInput = screen.getByTestId('create-user-email-input');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      expect((emailInput as HTMLInputElement).value).toBe('test@example.com');
    });

    it('updates display name input when typed', () => {
      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      const displayNameInput = screen.getByTestId(
        'create-user-display-name-input'
      );
      fireEvent.change(displayNameInput, { target: { value: 'John Doe' } });

      expect((displayNameInput as HTMLInputElement).value).toBe('John Doe');
    });

    it('updates password input when typed', () => {
      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      const passwordInput = screen.getByTestId('create-user-password-input');
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      expect((passwordInput as HTMLInputElement).value).toBe('password123');
    });

    it('updates role selection when changed', async () => {
      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      const roleSelect = screen.getByTestId('create-user-role-select');

      // Click to open the select dropdown
      fireEvent.click(roleSelect);

      // Wait for and click on Admin option
      await waitFor(() => {
        const adminOption = screen.getByText('Admin');
        fireEvent.click(adminOption);
      });

      // Verify the selection (check for the label, not the enum value)
      expect(roleSelect).toHaveDisplayValue('Admin');
    });

    it('handles form submission with valid data', async () => {
      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      const emailInput = screen.getByTestId('create-user-email-input');
      const displayNameInput = screen.getByTestId(
        'create-user-display-name-input'
      );
      const passwordInput = screen.getByTestId('create-user-password-input');
      const createButton = screen.getByTestId('confirm-create-user-button');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(displayNameInput, { target: { value: 'Test User' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      fireEvent.click(createButton);

      const expectedUserData: CreateUserRequest = {
        email: 'test@example.com',
        displayName: 'Test User',
        password: 'password123',
        role: UserRole.Viewer, // Default role
      };

      await waitFor(() => {
        expect(mockOnCreateUser).toHaveBeenCalledWith(expectedUserData);
      });
    });

    it('closes modal and clears form after successful creation', async () => {
      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      const emailInput = screen.getByTestId('create-user-email-input');
      const displayNameInput = screen.getByTestId(
        'create-user-display-name-input'
      );
      const passwordInput = screen.getByTestId('create-user-password-input');
      const createButton = screen.getByTestId('confirm-create-user-button');

      fireEvent.change(emailInput, {
        target: { value: 'success@example.com' },
      });
      fireEvent.change(displayNameInput, { target: { value: 'Success User' } });
      fireEvent.change(passwordInput, { target: { value: 'successpass' } });

      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnCreateUser).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });

      // Form should be cleared
      expect((emailInput as HTMLInputElement).value).toBe('');
      expect((displayNameInput as HTMLInputElement).value).toBe('');
      expect((passwordInput as HTMLInputElement).value).toBe('');
    });
  });

  describe('Role Selection', () => {
    it('defaults to Viewer role', () => {
      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      const roleSelect = screen.getByTestId('create-user-role-select');
      expect(roleSelect).toHaveDisplayValue('Viewer');
    });

    it('allows selecting Admin role', async () => {
      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      const roleSelect = screen.getByTestId('create-user-role-select');
      const emailInput = screen.getByTestId('create-user-email-input');
      const passwordInput = screen.getByTestId('create-user-password-input');
      const createButton = screen.getByTestId('confirm-create-user-button');

      // Set role to Admin
      fireEvent.click(roleSelect);
      await waitFor(() => {
        const adminOption = screen.getByText('Admin');
        fireEvent.click(adminOption);
      });

      // Fill required fields
      fireEvent.change(emailInput, { target: { value: 'admin@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'adminpass' } });

      fireEvent.click(createButton);

      const expectedUserData: CreateUserRequest = {
        email: 'admin@example.com',
        displayName: '',
        password: 'adminpass',
        role: UserRole.Admin,
      };

      await waitFor(() => {
        expect(mockOnCreateUser).toHaveBeenCalledWith(expectedUserData);
      });
    });

    it('allows selecting Editor role', async () => {
      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      const roleSelect = screen.getByTestId('create-user-role-select');
      const emailInput = screen.getByTestId('create-user-email-input');
      const passwordInput = screen.getByTestId('create-user-password-input');
      const createButton = screen.getByTestId('confirm-create-user-button');

      // Set role to Editor
      fireEvent.click(roleSelect);
      await waitFor(() => {
        const editorOption = screen.getByText('Editor');
        fireEvent.click(editorOption);
      });

      // Fill required fields
      fireEvent.change(emailInput, { target: { value: 'editor@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'editorpass' } });

      fireEvent.click(createButton);

      const expectedUserData: CreateUserRequest = {
        email: 'editor@example.com',
        displayName: '',
        password: 'editorpass',
        role: UserRole.Editor,
      };

      await waitFor(() => {
        expect(mockOnCreateUser).toHaveBeenCalledWith(expectedUserData);
      });
    });
  });

  describe('Form Validation', () => {
    it('handles empty email field', async () => {
      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      const passwordInput = screen.getByTestId('create-user-password-input');
      const createButton = screen.getByTestId('confirm-create-user-button');

      // Only fill password, leave email empty
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(createButton);

      // Should still call onCreateUser (validation might be handled elsewhere)
      await waitFor(() => {
        expect(mockOnCreateUser).toHaveBeenCalledWith({
          email: '',
          displayName: '',
          password: 'password123',
          role: UserRole.Viewer,
        });
      });
    });

    it('handles empty password field', async () => {
      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      const emailInput = screen.getByTestId('create-user-email-input');
      const createButton = screen.getByTestId('confirm-create-user-button');

      // Only fill email, leave password empty
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnCreateUser).toHaveBeenCalledWith({
          email: 'test@example.com',
          displayName: '',
          password: '',
          role: UserRole.Viewer,
        });
      });
    });

    it('handles various email formats', async () => {
      const emailFormats = [
        'simple@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'very.long.email.address@domain.co.uk',
      ];

      for (const email of emailFormats) {
        const { unmount } = render(
          <CreateUserModal
            opened={true}
            onClose={mockOnClose}
            onCreateUser={mockOnCreateUser}
            loading={false}
          />
        );

        const emailInput = screen.getByTestId('create-user-email-input');
        const passwordInput = screen.getByTestId('create-user-password-input');
        const createButton = screen.getByTestId('confirm-create-user-button');

        fireEvent.change(emailInput, { target: { value: email } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(createButton);

        await waitFor(() => {
          expect(mockOnCreateUser).toHaveBeenCalledWith({
            email,
            displayName: '',
            password: 'password123',
            role: UserRole.Viewer,
          });
        });

        unmount();
        vi.clearAllMocks();
        mockOnCreateUser.mockResolvedValue(true);
      }
    });

    it('handles various display names', async () => {
      const displayNames = [
        'John Doe',
        'María García',
        'Jean-Pierre',
        "O'Connor",
        'Smith Jr.',
        '田中太郎',
      ];

      for (const displayName of displayNames) {
        const { unmount } = render(
          <CreateUserModal
            opened={true}
            onClose={mockOnClose}
            onCreateUser={mockOnCreateUser}
            loading={false}
          />
        );

        const emailInput = screen.getByTestId('create-user-email-input');
        const displayNameInput = screen.getByTestId(
          'create-user-display-name-input'
        );
        const passwordInput = screen.getByTestId('create-user-password-input');
        const createButton = screen.getByTestId('confirm-create-user-button');

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(displayNameInput, { target: { value: displayName } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(createButton);

        await waitFor(() => {
          expect(mockOnCreateUser).toHaveBeenCalledWith({
            email: 'test@example.com',
            displayName,
            password: 'password123',
            role: UserRole.Viewer,
          });
        });

        unmount();
        vi.clearAllMocks();
        mockOnCreateUser.mockResolvedValue(true);
      }
    });
  });

  describe('Loading State', () => {
    it('shows loading state on create button when loading', () => {
      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={true}
        />
      );

      const createButton = screen.getByTestId('confirm-create-user-button');
      expect(createButton).toHaveAttribute('data-loading', 'true');
    });

    it('disables form elements when loading', () => {
      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={true}
        />
      );

      // Button should be disabled during loading
      const createButton = screen.getByTestId('confirm-create-user-button');
      expect(createButton).toBeDisabled();
    });

    it('handles normal state when not loading', () => {
      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      const createButton = screen.getByTestId('confirm-create-user-button');
      expect(createButton).not.toBeDisabled();
      expect(createButton).not.toHaveAttribute('data-loading', 'true');
    });
  });

  describe('Error Handling', () => {
    it('handles creation errors gracefully', async () => {
      mockOnCreateUser.mockResolvedValue(false);

      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      const emailInput = screen.getByTestId('create-user-email-input');
      const passwordInput = screen.getByTestId('create-user-password-input');
      const createButton = screen.getByTestId('confirm-create-user-button');

      fireEvent.change(emailInput, { target: { value: 'error@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'errorpass' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnCreateUser).toHaveBeenCalled();
      });

      // Modal should remain open when creation fails
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(screen.getByText('Create New User')).toBeInTheDocument();
    });

    it('handles creation promise rejection', async () => {
      mockOnCreateUser.mockRejectedValue(new Error('Network error'));

      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      const emailInput = screen.getByTestId('create-user-email-input');
      const passwordInput = screen.getByTestId('create-user-password-input');
      const createButton = screen.getByTestId('confirm-create-user-button');

      fireEvent.change(emailInput, { target: { value: 'reject@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'rejectpass' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnCreateUser).toHaveBeenCalled();
      });

      // Modal should handle the error gracefully (not crash)
      expect(screen.getByText('Create New User')).toBeInTheDocument();
    });

    it('does not clear form when creation fails', async () => {
      mockOnCreateUser.mockResolvedValue(false);

      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      const emailInput = screen.getByTestId('create-user-email-input');
      const displayNameInput = screen.getByTestId(
        'create-user-display-name-input'
      );
      const passwordInput = screen.getByTestId('create-user-password-input');
      const createButton = screen.getByTestId('confirm-create-user-button');

      fireEvent.change(emailInput, {
        target: { value: 'persist@example.com' },
      });
      fireEvent.change(displayNameInput, { target: { value: 'Persist User' } });
      fireEvent.change(passwordInput, { target: { value: 'persistpass' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnCreateUser).toHaveBeenCalled();
      });

      // Form should retain values when creation fails
      expect((emailInput as HTMLInputElement).value).toBe(
        'persist@example.com'
      );
      expect((displayNameInput as HTMLInputElement).value).toBe('Persist User');
      expect((passwordInput as HTMLInputElement).value).toBe('persistpass');
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and structure', () => {
      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      const emailInput = screen.getByTestId('create-user-email-input');
      const displayNameInput = screen.getByTestId(
        'create-user-display-name-input'
      );
      const passwordInput = screen.getByTestId('create-user-password-input');
      const roleSelect = screen.getByTestId('create-user-role-select');

      expect(emailInput).toHaveAccessibleName();
      expect(displayNameInput).toHaveAccessibleName();
      expect(passwordInput).toHaveAccessibleName();
      expect(roleSelect).toHaveAccessibleName();

      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('has proper button roles', () => {
      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const createButton = screen.getByRole('button', { name: /create user/i });

      expect(cancelButton).toBeInTheDocument();
      expect(createButton).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      const emailInput = screen.getByTestId('create-user-email-input');
      const displayNameInput = screen.getByTestId(
        'create-user-display-name-input'
      );
      const passwordInput = screen.getByTestId('create-user-password-input');

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
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      expect(screen.getByText('Create New User')).toBeInTheDocument();
      expect(screen.getByTestId('create-user-email-input')).toBeInTheDocument();
      expect(
        screen.getByTestId('create-user-display-name-input')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('create-user-password-input')
      ).toBeInTheDocument();
      expect(screen.getByTestId('create-user-role-select')).toBeInTheDocument();
    });
  });

  describe('Component Props', () => {
    it('accepts and uses onCreateUser prop correctly', async () => {
      const customMockCreate = vi.fn().mockResolvedValue(true);

      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={customMockCreate}
          loading={false}
        />
      );

      const emailInput = screen.getByTestId('create-user-email-input');
      const passwordInput = screen.getByTestId('create-user-password-input');
      const createButton = screen.getByTestId('confirm-create-user-button');

      fireEvent.change(emailInput, { target: { value: 'custom@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'custompass' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(customMockCreate).toHaveBeenCalledWith({
          email: 'custom@example.com',
          displayName: '',
          password: 'custompass',
          role: UserRole.Viewer,
        });
      });
    });

    it('accepts and uses onClose prop correctly', () => {
      const customMockClose = vi.fn();

      render(
        <CreateUserModal
          opened={true}
          onClose={customMockClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      const cancelButton = screen.getByTestId('cancel-create-user-button');
      fireEvent.click(cancelButton);

      expect(customMockClose).toHaveBeenCalled();
    });

    it('handles function props correctly', () => {
      const testOnCreate = vi.fn();
      const testOnClose = vi.fn();

      expect(() => {
        render(
          <CreateUserModal
            opened={true}
            onClose={testOnClose}
            onCreateUser={testOnCreate}
            loading={false}
          />
        );
      }).not.toThrow();

      expect(screen.getByText('Create New User')).toBeInTheDocument();
    });
  });

  describe('User Interaction Flow', () => {
    it('completes full user creation flow successfully', async () => {
      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      // 1. Modal opens and shows form
      expect(screen.getByText('Create New User')).toBeInTheDocument();

      // 2. User fills out form
      const emailInput = screen.getByTestId('create-user-email-input');
      const displayNameInput = screen.getByTestId(
        'create-user-display-name-input'
      );
      const passwordInput = screen.getByTestId('create-user-password-input');
      const roleSelect = screen.getByTestId('create-user-role-select');

      fireEvent.change(emailInput, {
        target: { value: 'complete@example.com' },
      });
      fireEvent.change(displayNameInput, {
        target: { value: 'Complete User' },
      });
      fireEvent.change(passwordInput, { target: { value: 'completepass' } });

      // 3. Change role to Editor
      fireEvent.click(roleSelect);
      await waitFor(() => {
        const editorOption = screen.getByText('Editor');
        fireEvent.click(editorOption);
      });

      // 4. Submit form
      const createButton = screen.getByTestId('confirm-create-user-button');
      fireEvent.click(createButton);

      // 5. Verify creation call
      await waitFor(() => {
        expect(mockOnCreateUser).toHaveBeenCalledWith({
          email: 'complete@example.com',
          displayName: 'Complete User',
          password: 'completepass',
          role: UserRole.Editor,
        });
      });

      // 6. Modal closes and form clears
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('allows user to cancel user creation', () => {
      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      // User fills form but then cancels
      const emailInput = screen.getByTestId('create-user-email-input');
      fireEvent.change(emailInput, { target: { value: 'cancel@example.com' } });

      const cancelButton = screen.getByTestId('cancel-create-user-button');
      fireEvent.click(cancelButton);

      // Should close modal without calling create function
      expect(mockOnCreateUser).not.toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
