import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render as rtlRender,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';
import EmailPasswordModal from './EmailPasswordModal';

// Helper wrapper component for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider defaultColorScheme="light">{children}</MantineProvider>
);

// Custom render function
const render = (ui: React.ReactElement) => {
  return rtlRender(ui, { wrapper: TestWrapper });
};

describe('EmailPasswordModal', () => {
  const mockOnConfirm = vi.fn();
  const mockOnClose = vi.fn();
  const testEmail = 'newemail@example.com';

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnConfirm.mockResolvedValue(true);
  });

  describe('Modal Visibility and Content', () => {
    it('renders modal with correct content when opened', () => {
      render(
        <EmailPasswordModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          email={testEmail}
        />
      );

      expect(screen.getByText('Confirm Password')).toBeInTheDocument();
      expect(
        screen.getByText(
          `Please enter your password to confirm changing your email to: ${testEmail}`
        )
      ).toBeInTheDocument();
      expect(screen.getByTestId('email-password-input')).toBeInTheDocument();
      expect(
        screen.getByTestId('cancel-email-password-button')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('confirm-email-password-button')
      ).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(
        <EmailPasswordModal
          opened={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          email={testEmail}
        />
      );

      expect(screen.queryByText('Confirm Password')).not.toBeInTheDocument();
    });

    it('displays various email addresses correctly', () => {
      const customEmail = 'user@custom.com';
      render(
        <EmailPasswordModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          email={customEmail}
        />
      );

      expect(
        screen.getByText(
          `Please enter your password to confirm changing your email to: ${customEmail}`
        )
      ).toBeInTheDocument();
    });
  });

  describe('Password Input and Validation', () => {
    it('updates password value when user types', () => {
      render(
        <EmailPasswordModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          email={testEmail}
        />
      );

      const passwordInput = screen.getByTestId('email-password-input');
      fireEvent.change(passwordInput, { target: { value: 'testpassword123' } });

      expect((passwordInput as HTMLInputElement).value).toBe('testpassword123');
    });

    it('prevents submission with empty or whitespace-only password', () => {
      render(
        <EmailPasswordModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          email={testEmail}
        />
      );

      const confirmButton = screen.getByTestId('confirm-email-password-button');

      // Test empty password
      fireEvent.click(confirmButton);
      expect(mockOnConfirm).not.toHaveBeenCalled();

      // Test whitespace-only password
      const passwordInput = screen.getByTestId('email-password-input');
      fireEvent.change(passwordInput, { target: { value: '   ' } });
      fireEvent.click(confirmButton);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('submits with valid password, trims whitespace, and clears field on success', async () => {
      render(
        <EmailPasswordModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          email={testEmail}
        />
      );

      const passwordInput = screen.getByTestId('email-password-input');
      const confirmButton = screen.getByTestId('confirm-email-password-button');

      fireEvent.change(passwordInput, {
        target: { value: '  validpassword  ' },
      });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('validpassword');
      });

      await waitFor(() => {
        expect((passwordInput as HTMLInputElement).value).toBe('');
      });
    });

    it('preserves password in field when submission fails', async () => {
      mockOnConfirm.mockRejectedValue(new Error('Invalid password'));

      render(
        <EmailPasswordModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          email={testEmail}
        />
      );

      const passwordInput = screen.getByTestId('email-password-input');
      const confirmButton = screen.getByTestId('confirm-email-password-button');

      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('wrongpassword');
      });

      expect((passwordInput as HTMLInputElement).value).toBe('wrongpassword');
      expect(screen.getByText('Confirm Password')).toBeInTheDocument();
    });
  });

  describe('User Actions', () => {
    it('closes modal when cancel button is clicked', () => {
      render(
        <EmailPasswordModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          email={testEmail}
        />
      );

      const cancelButton = screen.getByTestId('cancel-email-password-button');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('submits via Enter key press', async () => {
      render(
        <EmailPasswordModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          email={testEmail}
        />
      );

      const passwordInput = screen.getByTestId('email-password-input');
      fireEvent.change(passwordInput, { target: { value: 'enterpassword' } });
      fireEvent.keyDown(passwordInput, { key: 'Enter' });

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('enterpassword');
      });
    });

    it('handles rapid multiple clicks gracefully', () => {
      render(
        <EmailPasswordModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          email={testEmail}
        />
      );

      const passwordInput = screen.getByTestId('email-password-input');
      const confirmButton = screen.getByTestId('confirm-email-password-button');

      fireEvent.change(passwordInput, { target: { value: 'rapidtest' } });

      // Multiple rapid clicks should not break the component
      fireEvent.click(confirmButton);
      fireEvent.click(confirmButton);
      fireEvent.click(confirmButton);

      expect(screen.getByText('Confirm Password')).toBeInTheDocument();
      expect(mockOnConfirm).toHaveBeenCalledWith('rapidtest');
    });
  });

  describe('Accessibility and Security', () => {
    it('has proper form structure and security attributes', () => {
      render(
        <EmailPasswordModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          email={testEmail}
        />
      );

      const passwordInput = screen.getByTestId('email-password-input');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAccessibleName();

      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /confirm/i })
      ).toBeInTheDocument();
    });
  });

  describe('Complete User Flows', () => {
    it('completes successful email change confirmation flow', async () => {
      render(
        <EmailPasswordModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          email={testEmail}
        />
      );

      // 1. User sees email change confirmation
      expect(
        screen.getByText(
          `Please enter your password to confirm changing your email to: ${testEmail}`
        )
      ).toBeInTheDocument();

      // 2. User enters password
      const passwordInput = screen.getByTestId('email-password-input');
      fireEvent.change(passwordInput, { target: { value: 'userpassword' } });

      // 3. User confirms change
      const confirmButton = screen.getByTestId('confirm-email-password-button');
      fireEvent.click(confirmButton);

      // 4. System processes confirmation
      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('userpassword');
      });

      // 5. Password field is cleared for security
      await waitFor(() => {
        expect((passwordInput as HTMLInputElement).value).toBe('');
      });
    });

    it('allows cancellation of email change', () => {
      render(
        <EmailPasswordModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          email={testEmail}
        />
      );

      // User enters password but decides to cancel
      const passwordInput = screen.getByTestId('email-password-input');
      fireEvent.change(passwordInput, { target: { value: 'somepassword' } });

      const cancelButton = screen.getByTestId('cancel-email-password-button');
      fireEvent.click(cancelButton);

      // Modal closes without confirmation
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });
});
