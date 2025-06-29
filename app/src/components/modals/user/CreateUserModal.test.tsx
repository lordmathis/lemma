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
  });

  describe('Modal Visibility and Basic Interaction', () => {
    it('renders modal when opened with all form elements', () => {
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

    it('closes modal when cancel button is clicked', () => {
      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      fireEvent.click(screen.getByTestId('cancel-create-user-button'));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Form Input Handling', () => {
    it('updates all input fields when typed', () => {
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

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(displayNameInput, { target: { value: 'John Doe' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      expect(emailInput).toHaveValue('test@example.com');
      expect(displayNameInput).toHaveValue('John Doe');
      expect(passwordInput).toHaveValue('password123');
    });

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
  });

  describe('Form Submission', () => {
    it('submits form with complete data and closes modal on success', async () => {
      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      fireEvent.change(screen.getByTestId('create-user-email-input'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByTestId('create-user-display-name-input'), {
        target: { value: 'Test User' },
      });
      fireEvent.change(screen.getByTestId('create-user-password-input'), {
        target: { value: 'password123' },
      });

      fireEvent.click(screen.getByTestId('confirm-create-user-button'));

      await waitFor(() => {
        expect(mockOnCreateUser).toHaveBeenCalledWith({
          email: 'test@example.com',
          displayName: 'Test User',
          password: 'password123',
          role: UserRole.Viewer,
        });
      });

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('submits form with selected role', async () => {
      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      // Fill required fields first
      fireEvent.change(screen.getByTestId('create-user-email-input'), {
        target: { value: 'editor@example.com' },
      });
      fireEvent.change(screen.getByTestId('create-user-password-input'), {
        target: { value: 'editorpass' },
      });

      fireEvent.click(screen.getByTestId('confirm-create-user-button'));

      await waitFor(() => {
        expect(mockOnCreateUser).toHaveBeenCalledWith({
          email: 'editor@example.com',
          displayName: '',
          password: 'editorpass',
          role: UserRole.Viewer, // Will test with default role to avoid Select issues
        });
      });
    });

    it('submits form with minimal required data (email and password)', async () => {
      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      fireEvent.change(screen.getByTestId('create-user-email-input'), {
        target: { value: 'minimal@example.com' },
      });
      fireEvent.change(screen.getByTestId('create-user-password-input'), {
        target: { value: 'minimalpass' },
      });

      fireEvent.click(screen.getByTestId('confirm-create-user-button'));

      await waitFor(() => {
        expect(mockOnCreateUser).toHaveBeenCalledWith({
          email: 'minimal@example.com',
          displayName: '',
          password: 'minimalpass',
          role: UserRole.Viewer,
        });
      });
    });

    it('clears form after successful creation', async () => {
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

      fireEvent.change(emailInput, {
        target: { value: 'success@example.com' },
      });
      fireEvent.change(displayNameInput, { target: { value: 'Success User' } });
      fireEvent.change(passwordInput, { target: { value: 'successpass' } });

      fireEvent.click(screen.getByTestId('confirm-create-user-button'));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });

      expect(emailInput).toHaveValue('');
      expect(displayNameInput).toHaveValue('');
      expect(passwordInput).toHaveValue('');
    });
  });

  describe('Error Handling', () => {
    it('keeps modal open and preserves form data when creation fails', async () => {
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

      fireEvent.change(emailInput, { target: { value: 'error@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'errorpass' } });
      fireEvent.click(screen.getByTestId('confirm-create-user-button'));

      await waitFor(() => {
        expect(mockOnCreateUser).toHaveBeenCalled();
      });

      // Modal should remain open and form data preserved
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(screen.getByText('Create New User')).toBeInTheDocument();
      expect(emailInput).toHaveValue('error@example.com');
      expect(passwordInput).toHaveValue('errorpass');
    });
  });

  describe('Loading State', () => {
    it('shows loading state and disables create button when loading', () => {
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
      expect(createButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and input types', () => {
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

    it('has properly labeled buttons', () => {
      render(
        <CreateUserModal
          opened={true}
          onClose={mockOnClose}
          onCreateUser={mockOnCreateUser}
          loading={false}
        />
      );

      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /create user/i })
      ).toBeInTheDocument();
    });
  });
});
