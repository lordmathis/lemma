import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render as rtlRender,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';
import DeleteAccountModal from './DeleteAccountModal';

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

describe('DeleteAccountModal', () => {
  const mockOnConfirm = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnConfirm.mockResolvedValue(undefined);
    mockOnClose.mockClear();
  });

  describe('Modal Visibility', () => {
    it('renders modal when opened', () => {
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
      expect(screen.getByTestId('cancel-delete-button')).toBeInTheDocument();
      expect(screen.getByTestId('confirm-delete-button')).toBeInTheDocument();
    });

    it('does not render modal when closed', () => {
      render(
        <DeleteAccountModal
          opened={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(screen.queryByText('Delete Account')).not.toBeInTheDocument();
    });

    it('calls onClose when modal is closed via cancel button', () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const cancelButton = screen.getByTestId('cancel-delete-button');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Form Interaction', () => {
    it('updates password input when typed', () => {
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

    it('handles form submission with valid password', async () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const passwordInput = screen.getByTestId('delete-account-password-input');
      const deleteButton = screen.getByTestId('confirm-delete-button');

      fireEvent.change(passwordInput, { target: { value: 'validpassword' } });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('validpassword');
      });
    });

    it('prevents submission with empty password', () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const deleteButton = screen.getByTestId('confirm-delete-button');
      fireEvent.click(deleteButton);

      // Should not call the function with empty password
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('clears input after successful submission', async () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const passwordInput = screen.getByTestId('delete-account-password-input');
      const deleteButton = screen.getByTestId('confirm-delete-button');

      fireEvent.change(passwordInput, { target: { value: 'testpassword' } });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('testpassword');
      });

      await waitFor(() => {
        expect((passwordInput as HTMLInputElement).value).toBe('');
      });
    });
  });

  describe('Modal Actions', () => {
    it('has cancel and delete buttons', () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const deleteButton = screen.getByTestId('confirm-delete-button');
      const cancelButton = screen.getByTestId('cancel-delete-button');

      expect(deleteButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();

      expect(deleteButton).toHaveRole('button');
      expect(cancelButton).toHaveRole('button');
    });

    it('has proper button styling and colors', () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const deleteButton = screen.getByTestId('confirm-delete-button');
      const cancelButton = screen.getByTestId('cancel-delete-button');

      expect(deleteButton).toHaveTextContent('Delete');
      expect(cancelButton).toHaveTextContent('Cancel');
    });

    it('closes modal when cancel button is clicked', () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const cancelButton = screen.getByTestId('cancel-delete-button');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onConfirm when delete button is clicked with valid input', async () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const passwordInput = screen.getByTestId('delete-account-password-input');
      const deleteButton = screen.getByTestId('confirm-delete-button');

      fireEvent.change(passwordInput, { target: { value: 'mypassword' } });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
        expect(mockOnConfirm).toHaveBeenCalledWith('mypassword');
      });
    });
  });

  describe('Warning Display', () => {
    it('displays the warning message prominently', () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const warningElement = screen.getByText(
        'Warning: This action cannot be undone'
      );
      expect(warningElement).toBeInTheDocument();
    });

    it('displays the confirmation instructions', () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      expect(
        screen.getByText(
          'Please enter your password to confirm account deletion.'
        )
      ).toBeInTheDocument();
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
          <DeleteAccountModal
            opened={true}
            onClose={mockOnClose}
            onConfirm={mockOnConfirm}
          />
        );

        const passwordInput = screen.getByTestId(
          'delete-account-password-input'
        );
        const deleteButton = screen.getByTestId('confirm-delete-button');

        fireEvent.change(passwordInput, { target: { value: password } });
        fireEvent.click(deleteButton);

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
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const passwordInput = screen.getByTestId('delete-account-password-input');
      const deleteButton = screen.getByTestId('confirm-delete-button');

      const unicodePassword = 'パスワード123';
      fireEvent.change(passwordInput, { target: { value: unicodePassword } });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith(unicodePassword);
      });
    });

    it('handles whitespace-only passwords', () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const passwordInput = screen.getByTestId('delete-account-password-input');
      const deleteButton = screen.getByTestId('confirm-delete-button');

      fireEvent.change(passwordInput, { target: { value: '   ' } });
      fireEvent.click(deleteButton);

      // Should not call confirm function for whitespace-only password
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles deletion errors gracefully', async () => {
      mockOnConfirm.mockRejectedValue(new Error('Account deletion failed'));

      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const passwordInput = screen.getByTestId('delete-account-password-input');
      const deleteButton = screen.getByTestId('confirm-delete-button');

      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('wrongpassword');
      });

      // Modal should handle the error gracefully (not crash)
      expect(screen.getByText('Delete Account')).toBeInTheDocument();
    });

    it('does not clear input when deletion fails', async () => {
      mockOnConfirm.mockRejectedValue(new Error('Invalid password'));

      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const passwordInput = screen.getByTestId('delete-account-password-input');
      const deleteButton = screen.getByTestId('confirm-delete-button');

      fireEvent.change(passwordInput, { target: { value: 'testpassword' } });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('testpassword');
      });

      // Input should retain value when deletion fails
      expect((passwordInput as HTMLInputElement).value).toBe('testpassword');
    });

    it('handles authentication errors', async () => {
      mockOnConfirm.mockRejectedValue(new Error('Authentication failed'));

      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const passwordInput = screen.getByTestId('delete-account-password-input');
      const deleteButton = screen.getByTestId('confirm-delete-button');

      fireEvent.change(passwordInput, { target: { value: 'authtest' } });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('authtest');
      });

      // Should not crash the component
      expect(screen.getByText('Delete Account')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and structure', () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const passwordInput = screen.getByTestId('delete-account-password-input');
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput.tagName).toBe('INPUT');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('has proper button roles', () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2); // Cancel and Delete buttons

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const deleteButton = screen.getByRole('button', {
        name: /delete/i,
      });

      expect(cancelButton).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const passwordInput = screen.getByTestId('delete-account-password-input');

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
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      // Modal should have proper title
      expect(screen.getByText('Delete Account')).toBeInTheDocument();

      // Should have form elements
      expect(
        screen.getByTestId('delete-account-password-input')
      ).toBeInTheDocument();
    });

    it('has proper warning styling and visibility', () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const warningText = screen.getByText(
        'Warning: This action cannot be undone'
      );
      expect(warningText).toBeInTheDocument();
    });
  });

  describe('Component Props', () => {
    it('accepts and uses onConfirm prop correctly', async () => {
      const customMockConfirm = vi.fn().mockResolvedValue(undefined);

      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={customMockConfirm}
        />
      );

      const passwordInput = screen.getByTestId('delete-account-password-input');
      const deleteButton = screen.getByTestId('confirm-delete-button');

      fireEvent.change(passwordInput, { target: { value: 'custompassword' } });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(customMockConfirm).toHaveBeenCalledWith('custompassword');
      });
    });

    it('accepts and uses onClose prop correctly', () => {
      const customMockClose = vi.fn();

      render(
        <DeleteAccountModal
          opened={true}
          onClose={customMockClose}
          onConfirm={mockOnConfirm}
        />
      );

      const cancelButton = screen.getByTestId('cancel-delete-button');
      fireEvent.click(cancelButton);

      expect(customMockClose).toHaveBeenCalled();
    });

    it('handles function props correctly', () => {
      const testOnConfirm = vi.fn();
      const testOnClose = vi.fn();

      expect(() => {
        render(
          <DeleteAccountModal
            opened={true}
            onClose={testOnClose}
            onConfirm={testOnConfirm}
          />
        );
      }).not.toThrow();

      expect(screen.getByText('Delete Account')).toBeInTheDocument();
    });

    it('handles opened prop correctly', () => {
      const { rerender } = render(
        <DeleteAccountModal
          opened={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      // Should not be visible when opened is false
      expect(screen.queryByText('Delete Account')).not.toBeInTheDocument();

      rerender(
        <TestWrapper>
          <DeleteAccountModal
            opened={true}
            onClose={mockOnClose}
            onConfirm={mockOnConfirm}
          />
        </TestWrapper>
      );

      // Should be visible when opened is true
      expect(screen.getByText('Delete Account')).toBeInTheDocument();
    });
  });

  describe('User Interaction Flow', () => {
    it('completes full deletion confirmation flow successfully', async () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      // 1. Modal opens and shows warning
      expect(
        screen.getByText('Warning: This action cannot be undone')
      ).toBeInTheDocument();

      // 2. User types password
      const passwordInput = screen.getByTestId('delete-account-password-input');
      fireEvent.change(passwordInput, { target: { value: 'userpassword' } });

      // 3. User clicks delete
      const deleteButton = screen.getByTestId('confirm-delete-button');
      fireEvent.click(deleteButton);

      // 4. Confirmation function is called
      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('userpassword');
      });

      // 5. Input is cleared
      await waitFor(() => {
        expect((passwordInput as HTMLInputElement).value).toBe('');
      });
    });

    it('allows user to cancel account deletion', () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      // User types password but then cancels
      const passwordInput = screen.getByTestId('delete-account-password-input');
      fireEvent.change(passwordInput, {
        target: { value: 'cancelledaction' },
      });

      const cancelButton = screen.getByTestId('cancel-delete-button');
      fireEvent.click(cancelButton);

      // Should close modal without calling confirm function
      expect(mockOnConfirm).not.toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('handles multiple rapid clicks gracefully', () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const passwordInput = screen.getByTestId('delete-account-password-input');
      const deleteButton = screen.getByTestId('confirm-delete-button');

      fireEvent.change(passwordInput, { target: { value: 'rapidtest' } });

      // Rapidly click multiple times - should not crash
      fireEvent.click(deleteButton);
      fireEvent.click(deleteButton);
      fireEvent.click(deleteButton);

      // Verify component is still functional
      expect(screen.getByText('Delete Account')).toBeInTheDocument();
      expect(mockOnConfirm).toHaveBeenCalledWith('rapidtest');
    });

    it('prevents accidental deletion with empty password', () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      // User immediately clicks delete without entering password
      const deleteButton = screen.getByTestId('confirm-delete-button');
      fireEvent.click(deleteButton);

      // Should not proceed with deletion
      expect(mockOnConfirm).not.toHaveBeenCalled();
      expect(screen.getByText('Delete Account')).toBeInTheDocument();
    });
  });

  describe('Security Considerations', () => {
    it('masks password input properly', () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const passwordInput = screen.getByTestId('delete-account-password-input');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('clears password from memory after successful deletion', async () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      const passwordInput = screen.getByTestId('delete-account-password-input');
      const deleteButton = screen.getByTestId('confirm-delete-button');

      fireEvent.change(passwordInput, {
        target: { value: 'sensitivepassword' },
      });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith('sensitivepassword');
      });

      // Password should be cleared from the input
      await waitFor(() => {
        expect((passwordInput as HTMLInputElement).value).toBe('');
      });
    });

    it('requires explicit password confirmation', () => {
      render(
        <DeleteAccountModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      // Should require password input
      const passwordInput = screen.getByTestId('delete-account-password-input');
      expect(passwordInput).toHaveAttribute('required');

      // Should show clear warning
      expect(
        screen.getByText('Warning: This action cannot be undone')
      ).toBeInTheDocument();
    });
  });
});
