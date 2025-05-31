import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render as rtlRender,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';
import { AuthProvider } from '@/contexts/AuthContext';
import LoginPage from './LoginPage';

// Mock the auth API functions
const mockApiLogin = vi.fn();
const mockApiLogout = vi.fn();
const mockApiRefreshToken = vi.fn();
const mockGetCurrentUser = vi.fn();

vi.mock('@/api/auth', () => ({
  login: (...args: unknown[]): unknown => mockApiLogin(...args),
  logout: (...args: unknown[]): unknown => mockApiLogout(...args),
  refreshToken: (...args: unknown[]): unknown => mockApiRefreshToken(...args),
  getCurrentUser: (...args: unknown[]): unknown => mockGetCurrentUser(...args),
}));

// Mock notifications
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

// Helper wrapper component for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider defaultColorScheme="light">
    <AuthProvider>{children}</AuthProvider>
  </MantineProvider>
);

// Custom render function
const render = (ui: React.ReactElement) => {
  return rtlRender(ui, { wrapper: TestWrapper });
};

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    mockGetCurrentUser.mockRejectedValue(new Error('No user session'));
    mockApiLogin.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      role: 'editor',
      createdAt: '2024-01-01T00:00:00Z',
      lastWorkspaceId: 1,
    });
  });

  describe('Initial Render', () => {
    it('renders the login form with all required elements', () => {
      render(<LoginPage />);

      // Check title and subtitle
      expect(screen.getByText('Welcome to Lemma')).toBeInTheDocument();
      expect(
        screen.getByText('Please sign in to continue')
      ).toBeInTheDocument();

      // Check form fields
      expect(screen.getByTestId('email-input')).toBeInTheDocument();
      expect(screen.getByTestId('password-input')).toBeInTheDocument();

      // Check submit button
      expect(screen.getByTestId('login-button')).toBeInTheDocument();
    });

    it('renders form fields with correct placeholders', () => {
      render(<LoginPage />);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');

      expect(emailInput).toHaveAttribute('placeholder', 'your@email.com');
      expect(passwordInput).toHaveAttribute('placeholder', 'Your password');
    });

    it('renders required fields as required', () => {
      render(<LoginPage />);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');

      expect(emailInput).toBeRequired();
      expect(passwordInput).toBeRequired();
    });

    it('submit button is not loading initially', () => {
      render(<LoginPage />);

      const submitButton = screen.getByTestId('login-button');
      expect(submitButton).toHaveRole('button');
      expect(submitButton).not.toHaveAttribute('data-loading', 'true');
    });
  });

  describe('Form Interaction', () => {
    it('updates email input value when typed', () => {
      render(<LoginPage />);

      const emailInput = screen.getByTestId('email-input');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      expect((emailInput as HTMLInputElement).value).toBe('test@example.com');
    });

    it('updates password input value when typed', () => {
      render(<LoginPage />);

      const passwordInput = screen.getByTestId('password-input');
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      expect((passwordInput as HTMLInputElement).value).toBe('password123');
    });

    it('clears form values when inputs are cleared', () => {
      render(<LoginPage />);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');

      // Set values
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      // Clear values
      fireEvent.change(emailInput, { target: { value: '' } });
      fireEvent.change(passwordInput, { target: { value: '' } });

      expect((emailInput as HTMLInputElement).value).toBe('');
      expect((passwordInput as HTMLInputElement).value).toBe('');
    });
  });

  describe('Form Submission', () => {
    it('calls login function with correct credentials on form submit', async () => {
      render(<LoginPage />);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByTestId('login-button');

      // Fill in the form
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      // Submit the form
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockApiLogin).toHaveBeenCalledWith(
          'test@example.com',
          'password123'
        );
      });
    });

    it('calls login function when form is submitted via Enter key', async () => {
      render(<LoginPage />);

      const form = screen.getByRole('form');
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');

      // Fill in the form
      fireEvent.change(emailInput, { target: { value: 'user@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'testpass' } });

      // Submit via form submission (Enter key)
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockApiLogin).toHaveBeenCalledWith('user@test.com', 'testpass');
      });
    });

    it('shows loading state during login process', async () => {
      // Create a promise we can control
      let resolveLogin: () => void;
      const loginPromise = new Promise<void>((resolve) => {
        resolveLogin = resolve;
      });
      mockApiLogin.mockReturnValue(loginPromise);

      render(<LoginPage />);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByTestId('login-button');

      // Fill in the form
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      // Submit the form
      fireEvent.click(submitButton);

      // Check loading state
      await waitFor(() => {
        expect(submitButton).toHaveAttribute('data-loading', 'true');
      });

      // Resolve the login
      resolveLogin!();

      // Wait for loading to finish
      await waitFor(() => {
        expect(submitButton).not.toHaveAttribute('data-loading', 'true');
      });
    });

    it('handles login errors gracefully', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockApiLogin.mockRejectedValue(new Error('Login failed'));

      render(<LoginPage />);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByTestId('login-button');

      // Fill in the form
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

      // Submit the form
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockApiLogin).toHaveBeenCalledWith(
          'test@example.com',
          'wrongpassword'
        );
      });

      // Wait for error handling
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Login failed:',
          expect.any(Error)
        );
      });

      // Loading state should be reset
      await waitFor(() => {
        expect(submitButton).not.toHaveAttribute('data-loading', 'true');
      });

      consoleErrorSpy.mockRestore();
    });

    it('prevents form submission with empty fields', () => {
      render(<LoginPage />);

      const submitButton = screen.getByTestId('login-button');

      // Try to submit without filling fields
      fireEvent.click(submitButton);

      // Login should not be called due to HTML5 validation
      expect(mockApiLogin).not.toHaveBeenCalled();
    });

    it('prevents form submission with only email filled', () => {
      render(<LoginPage />);

      const emailInput = screen.getByTestId('email-input');
      const submitButton = screen.getByTestId('login-button');

      // Fill only email
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      // Try to submit
      fireEvent.click(submitButton);

      // Login should not be called due to HTML5 validation
      expect(mockApiLogin).not.toHaveBeenCalled();
    });

    it('prevents form submission with only password filled', () => {
      render(<LoginPage />);

      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByTestId('login-button');

      // Fill only password
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      // Try to submit
      fireEvent.click(submitButton);

      // Login should not be called due to HTML5 validation
      expect(mockApiLogin).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles special characters in email and password', async () => {
      render(<LoginPage />);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByTestId('login-button');

      const specialEmail = 'user+test@example-domain.com';
      const specialPassword = 'P@ssw0rd!#$%';

      fireEvent.change(emailInput, { target: { value: specialEmail } });
      fireEvent.change(passwordInput, { target: { value: specialPassword } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockApiLogin).toHaveBeenCalledWith(
          specialEmail,
          specialPassword
        );
      });
    });

    it('handles very long email and password values', async () => {
      render(<LoginPage />);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByTestId('login-button');

      const longEmail = 'a'.repeat(100) + '@example.com';
      const longPassword = 'p'.repeat(200);

      fireEvent.change(emailInput, { target: { value: longEmail } });
      fireEvent.change(passwordInput, { target: { value: longPassword } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockApiLogin).toHaveBeenCalledWith(longEmail, longPassword);
      });
    });

    it('resets loading state after successful login', async () => {
      render(<LoginPage />);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByTestId('login-button');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockApiLogin).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(submitButton).not.toHaveAttribute('data-loading', 'true');
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper form structure with labels', () => {
      render(<LoginPage />);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');

      expect(emailInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();
      expect(emailInput.tagName).toBe('INPUT');
      expect(passwordInput.tagName).toBe('INPUT');
    });

    it('has proper input types', () => {
      render(<LoginPage />);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('submit button has proper type', () => {
      render(<LoginPage />);

      const submitButton = screen.getByTestId('login-button');
      expect(submitButton).toHaveAttribute('type', 'submit');
    });
  });
});
