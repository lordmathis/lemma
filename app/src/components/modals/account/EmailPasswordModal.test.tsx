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

describe('EmailPasswordModal', () => {
  const mockOnConfirm = vi.fn();
  const mockOnClose = vi.fn();
  const testEmail = 'newemail@example.com';

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnConfirm.mockResolvedValue(undefined);
    mockOnClose.mockClear();
  });

  describe('Modal Visibility', () => {
    it('renders modal when opened', () => {
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

    it('does not render modal when closed', () => {
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
  });

  describe('Form Interaction', () => {
    it('updates password input when typed', () => {
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

    it('handles form submission with valid password', async () => {
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

      fireEvent.change(passwordInput, { target: { value: 'validpassword' } });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('validpassword');
      });
    });

    it('prevents submission with empty password', () => {
      render(
        <EmailPasswordModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          email={testEmail}
        />
      );

      const confirmButton = screen.getByTestId('confirm-email-password-button');
      fireEvent.click(confirmButton);

      // Should not call the function with empty password
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('clears input after successful submission', async () => {
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

      fireEvent.change(passwordInput, { target: { value: 'testpassword' } });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('testpassword');
      });

      await waitFor(() => {
        expect((passwordInput as HTMLInputElement).value).toBe('');
      });
    });
  });

  describe('Modal Actions', () => {
    it('has cancel and confirm buttons', () => {
      render(
        <EmailPasswordModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          email={testEmail}
        />
      );

      const confirmButton = screen.getByTestId('confirm-email-password-button');
      const cancelButton = screen.getByTestId('cancel-email-password-button');

      expect(confirmButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();

      expect(confirmButton).toHaveRole('button');
      expect(cancelButton).toHaveRole('button');
    });

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
    });

    it('calls onConfirm when confirm button is clicked with valid input', async () => {
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

      fireEvent.change(passwordInput, { target: { value: 'mypassword' } });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
        expect(mockOnConfirm).toHaveBeenCalledWith('mypassword');
      });
    });
  });

  describe('Email Display', () => {
    it('displays the correct email in the confirmation message', () => {
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

    it('handles different email formats', () => {
      const emailFormats = [
        'simple@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'very.long.email.address@domain.co.uk',
      ];

      emailFormats.forEach((email) => {
        const { unmount } = render(
          <EmailPasswordModal
            opened={true}
            onClose={mockOnClose}
            onConfirm={mockOnConfirm}
            email={email}
          />
        );

        expect(
          screen.getByText(
            `Please enter your password to confirm changing your email to: ${email}`
          )
        ).toBeInTheDocument();

        unmount();
      });
    });

    it('handles empty email string', () => {
      render(
        <EmailPasswordModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          email=""
        />
      );

      expect(screen.getByTestId('email-password-message')).toHaveTextContent(
        'Please enter your password to confirm changing your email to:'
      );
    });
  });

  describe('Password Validation', () => {
    it('handles various password formats', async () => {
      const passwords = [
        'simple123',
        'Complex!Password@123',
        'spaces in password',
        '12345',
        'very-long-password-with-many-characters-and-symbols!@#$%^&*()',
      ];

      for (const password of passwords) {
        const { unmount } = render(
          <EmailPasswordModal
            opened={true}
            onClose={mockOnClose}
            onConfirm={mockOnConfirm}
            email={testEmail}
          />
        );

        const passwordInput = screen.getByTestId('email-password-input');
        const confirmButton = screen.getByTestId(
          'confirm-email-password-button'
        );

        fireEvent.change(passwordInput, { target: { value: password } });
        fireEvent.click(confirmButton);

        await waitFor(() => {
          expect(mockOnConfirm).toHaveBeenCalledWith(password);
        });

        unmount();
        vi.clearAllMocks();
        mockOnConfirm.mockResolvedValue(undefined);
      }
    });

    it('handles unicode characters in passwords', async () => {
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

      const unicodePassword = 'パスワード123';
      fireEvent.change(passwordInput, { target: { value: unicodePassword } });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith(unicodePassword);
      });
    });

    it('trims whitespace from passwords', async () => {
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
        target: { value: '  password123  ' },
      });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('password123');
      });
    });
  });

  describe('Error Handling', () => {
    it('handles confirmation errors gracefully', async () => {
      mockOnConfirm.mockRejectedValue(new Error('Authentication failed'));

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

      // Modal should handle the error gracefully (not crash)
      expect(screen.getByText('Confirm Password')).toBeInTheDocument();
    });

    it('does not clear input when confirmation fails', async () => {
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

      fireEvent.change(passwordInput, { target: { value: 'testpassword' } });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('testpassword');
      });

      // Input should retain value when confirmation fails
      expect((passwordInput as HTMLInputElement).value).toBe('testpassword');
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and structure', () => {
      render(
        <EmailPasswordModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          email={testEmail}
        />
      );

      const passwordInput = screen.getByTestId('email-password-input');
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput.tagName).toBe('INPUT');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('has proper button roles', () => {
      render(
        <EmailPasswordModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          email={testEmail}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2); // Cancel and Confirm buttons

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const confirmButton = screen.getByRole('button', { name: /confirm/i });

      expect(cancelButton).toBeInTheDocument();
      expect(confirmButton).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(
        <EmailPasswordModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          email={testEmail}
        />
      );

      const passwordInput = screen.getByTestId('email-password-input');

      // Check that the input is focusable (not disabled or readonly)
      expect(passwordInput).not.toHaveAttribute('disabled');
      expect(passwordInput).not.toHaveAttribute('readonly');

      // Check that the input can receive keyboard events
      fireEvent.keyDown(passwordInput, { key: 'a' });
      fireEvent.change(passwordInput, { target: { value: 'test' } });

      expect((passwordInput as HTMLInputElement).value).toBe('test');

      // Verify the input is accessible via keyboard navigation
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAccessibleName(); // Has proper label
    });

    it('has proper modal structure', () => {
      render(
        <EmailPasswordModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          email={testEmail}
        />
      );

      // Modal should have proper title
      expect(screen.getByText('Confirm Password')).toBeInTheDocument();

      // Should have form elements
      expect(screen.getByTestId('email-password-input')).toBeInTheDocument();
    });
  });

  describe('Component Props', () => {
    it('accepts and uses onConfirm prop correctly', async () => {
      const customMockConfirm = vi.fn().mockResolvedValue(undefined);

      render(
        <EmailPasswordModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={customMockConfirm}
          email={testEmail}
        />
      );

      const passwordInput = screen.getByTestId('email-password-input');
      const confirmButton = screen.getByTestId('confirm-email-password-button');

      fireEvent.change(passwordInput, { target: { value: 'custompassword' } });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(customMockConfirm).toHaveBeenCalledWith('custompassword');
      });
    });

    it('accepts and uses onClose prop correctly', () => {
      const customMockClose = vi.fn();

      render(
        <EmailPasswordModal
          opened={true}
          onClose={customMockClose}
          onConfirm={mockOnConfirm}
          email={testEmail}
        />
      );

      const cancelButton = screen.getByTestId('cancel-email-password-button');
      fireEvent.click(cancelButton);

      expect(customMockClose).toHaveBeenCalled();
    });

    it('handles function props correctly', () => {
      const testOnConfirm = vi.fn();
      const testOnClose = vi.fn();

      expect(() => {
        render(
          <EmailPasswordModal
            opened={true}
            onClose={testOnClose}
            onConfirm={testOnConfirm}
            email={testEmail}
          />
        );
      }).not.toThrow();

      expect(screen.getByText('Confirm Password')).toBeInTheDocument();
    });
  });

  describe('User Interaction Flow', () => {
    it('completes full confirmation flow successfully', async () => {
      render(
        <EmailPasswordModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          email={testEmail}
        />
      );

      // 1. Modal opens and shows email change confirmation
      expect(
        screen.getByText(
          `Please enter your password to confirm changing your email to: ${testEmail}`
        )
      ).toBeInTheDocument();

      // 2. User types password
      const passwordInput = screen.getByTestId('email-password-input');
      fireEvent.change(passwordInput, { target: { value: 'userpassword' } });

      // 3. User clicks confirm
      const confirmButton = screen.getByTestId('confirm-email-password-button');
      fireEvent.click(confirmButton);

      // 4. Confirmation function is called
      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('userpassword');
      });

      // 5. Input is cleared
      await waitFor(() => {
        expect((passwordInput as HTMLInputElement).value).toBe('');
      });
    });

    it('allows user to cancel email change', () => {
      render(
        <EmailPasswordModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          email={testEmail}
        />
      );

      // User types password but then cancels
      const passwordInput = screen.getByTestId('email-password-input');
      fireEvent.change(passwordInput, {
        target: { value: 'cancelleddaction' },
      });

      const cancelButton = screen.getByTestId('cancel-email-password-button');
      fireEvent.click(cancelButton);

      // Should close modal without calling confirm function
      expect(mockOnConfirm).not.toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('handles multiple rapid clicks gracefully', () => {
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

      // Rapidly click multiple times - should not crash
      fireEvent.click(confirmButton);
      fireEvent.click(confirmButton);
      fireEvent.click(confirmButton);

      // Verify component is still functional
      expect(screen.getByText('Confirm Password')).toBeInTheDocument();
      expect(mockOnConfirm).toHaveBeenCalledWith('rapidtest');
    });
  });
});
