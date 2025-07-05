import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render as rtlRender,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';
import DeleteAccountModal from './DeleteAccountModal';

// Helper wrapper component for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider defaultColorScheme="light">{children}</MantineProvider>
);

// Custom render function
const render = (ui: React.ReactElement) => {
  return rtlRender(ui, { wrapper: TestWrapper });
};

describe('DeleteAccountModal', () => {
  const mockOnConfirm = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnConfirm.mockResolvedValue(undefined);
  });

  describe('Modal Visibility and Content', () => {
    it('renders modal with correct content when opened', () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.getByText('Delete Account')).toBeInTheDocument();
      expect(
        screen.getByText('Warning: This action cannot be undone')
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'Please enter your password to confirm account deletion.'
        )
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('delete-account-password-input')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('cancel-delete-account-button')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('confirm-delete-account-button')
      ).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(
        <DeleteAccountModal
          opened={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.queryByText('Delete Account')).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('updates password value when user types', () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const passwordInput = screen.getByTestId('delete-account-password-input');
      fireEvent.change(passwordInput, { target: { value: 'testpassword123' } });

      expect((passwordInput as HTMLInputElement).value).toBe('testpassword123');
    });

    it('prevents submission with empty or whitespace-only password', () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const passwordInput = screen.getByTestId('delete-account-password-input');
      const deleteButton = screen.getByTestId('confirm-delete-account-button');

      // Test empty password
      fireEvent.click(deleteButton);
      expect(mockOnConfirm).not.toHaveBeenCalled();

      // Test whitespace-only password
      fireEvent.change(passwordInput, { target: { value: '   ' } });
      fireEvent.click(deleteButton);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  describe('User Actions', () => {
    it('calls onConfirm with valid password and clears field on success', async () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const passwordInput = screen.getByTestId('delete-account-password-input');
      const deleteButton = screen.getByTestId('confirm-delete-account-button');

      fireEvent.change(passwordInput, { target: { value: 'validpassword' } });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('validpassword');
      });

      await waitFor(() => {
        expect((passwordInput as HTMLInputElement).value).toBe('');
      });
    });

    it('calls onClose when cancel button is clicked', () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      fireEvent.click(screen.getByTestId('cancel-delete-account-button'));
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('preserves password in field when submission fails', async () => {
      mockOnConfirm.mockRejectedValue(new Error('Invalid password'));

      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const passwordInput = screen.getByTestId('delete-account-password-input');
      const deleteButton = screen.getByTestId('confirm-delete-account-button');

      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('wrongpassword');
      });

      expect((passwordInput as HTMLInputElement).value).toBe('wrongpassword');
      expect(screen.getByText('Delete Account')).toBeInTheDocument();
    });
  });

  describe('User Actions', () => {
    it('closes modal when cancel button is clicked', () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const cancelButton = screen.getByTestId('cancel-delete-account-button');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('handles rapid multiple clicks gracefully', async () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const passwordInput = screen.getByTestId('delete-account-password-input');
      const deleteButton = screen.getByTestId('confirm-delete-account-button');

      fireEvent.change(passwordInput, { target: { value: 'testpassword' } });

      // Multiple rapid clicks should not break the component
      act(() => {
        fireEvent.click(deleteButton);
        fireEvent.click(deleteButton);
        fireEvent.click(deleteButton);
      });

      expect(screen.getByText('Delete Account')).toBeInTheDocument();
      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('testpassword');
      });
    });
  });

  describe('Accessibility and Security', () => {
    it('has proper form structure and security attributes', () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const passwordInput = screen.getByTestId('delete-account-password-input');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAccessibleName();

      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /delete/i })
      ).toBeInTheDocument();
    });
  });

  describe('Complete User Flows', () => {
    it('completes successful account deletion flow', async () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      // 1. User sees warning
      expect(
        screen.getByText('Warning: This action cannot be undone')
      ).toBeInTheDocument();

      // 2. User enters password
      const passwordInput = screen.getByTestId('delete-account-password-input');
      fireEvent.change(passwordInput, { target: { value: 'userpassword' } });

      // 3. User confirms deletion
      const deleteButton = screen.getByTestId('confirm-delete-account-button');
      fireEvent.click(deleteButton);

      // 4. System processes deletion
      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('userpassword');
      });

      // 5. Password field is cleared for security
      await waitFor(() => {
        expect((passwordInput as HTMLInputElement).value).toBe('');
      });
    });

    it('allows cancellation of account deletion', () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      // User enters password but decides to cancel
      const passwordInput = screen.getByTestId('delete-account-password-input');
      fireEvent.change(passwordInput, { target: { value: 'somepassword' } });

      const cancelButton = screen.getByTestId('cancel-delete-account-button');
      fireEvent.click(cancelButton);

      // Modal closes without deletion
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });
});
