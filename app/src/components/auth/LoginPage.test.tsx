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
const render = async (ui: React.ReactElement) => {
  const result = rtlRender(ui, { wrapper: TestWrapper });

  // Wait for AuthProvider initialization to complete
  await waitFor(() => {
    // The LoginPage should be rendered (indicates AuthProvider has initialized)
    expect(screen.getByText('Welcome to Lemma')).toBeInTheDocument();
  });

  return result;
};

describe('LoginPage', () => {
  let mockNotificationShow: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get the mocked notification function
    const { notifications } = await import('@mantine/notifications');
    mockNotificationShow = vi.mocked(notifications.show);

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
    it('renders the login form with all required elements', async () => {
      await render(<LoginPage />);

      // Check title and subtitle
      expect(screen.getByText('Welcome to Lemma')).toBeInTheDocument();
      expect(
        screen.getByText('Please sign in to continue')
      ).toBeInTheDocument();

      // Check form fields with correct attributes
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByTestId('login-button');

      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('placeholder', 'your@email.com');
      expect(emailInput).toBeRequired();

      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('placeholder', 'Your password');
      expect(passwordInput).toBeRequired();

      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveAttribute('type', 'submit');
      expect(submitButton).not.toHaveAttribute('data-loading', 'true');
    });
  });

  describe('Form Interaction', () => {
    it('updates input values when user types', async () => {
      await render(<LoginPage />);

      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      expect((emailInput as HTMLInputElement).value).toBe('test@example.com');
      expect((passwordInput as HTMLInputElement).value).toBe('password123');
    });

    it('prevents form submission with empty fields due to HTML5 validation', async () => {
      await render(<LoginPage />);

      const submitButton = screen.getByTestId('login-button');
      fireEvent.click(submitButton);

      expect(mockApiLogin).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    const fillAndSubmitForm = (email: string, password: string) => {
      const emailInput = screen.getByTestId('email-input');
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByTestId('login-button');

      fireEvent.change(emailInput, { target: { value: email } });
      fireEvent.change(passwordInput, { target: { value: password } });
      fireEvent.click(submitButton);

      return { emailInput, passwordInput, submitButton };
    };

    it('calls login function with correct credentials on form submit', async () => {
      await render(<LoginPage />);
      fillAndSubmitForm('test@example.com', 'password123');

      await waitFor(() => {
        expect(mockApiLogin).toHaveBeenCalledWith(
          'test@example.com',
          'password123'
        );
      });
    });

    it('shows loading state during login and resets after completion', async () => {
      // Create a controlled promise for login
      let resolveLogin: () => void;
      const loginPromise = new Promise<void>((resolve) => {
        resolveLogin = resolve;
      });
      mockApiLogin.mockReturnValue(loginPromise);

      await render(<LoginPage />);
      const { submitButton } = fillAndSubmitForm(
        'test@example.com',
        'password123'
      );

      // Check loading state appears
      await waitFor(() => {
        expect(submitButton).toHaveAttribute('data-loading', 'true');
      });

      // Resolve the login and check loading state is removed
      resolveLogin!();
      await waitFor(() => {
        expect(submitButton).not.toHaveAttribute('data-loading', 'true');
      });
    });

    it('handles login success with notification', async () => {
      await render(<LoginPage />);
      fillAndSubmitForm('test@example.com', 'password123');

      await waitFor(() => {
        expect(mockApiLogin).toHaveBeenCalled();
      });

      // Verify success notification is shown
      await waitFor(() => {
        expect(mockNotificationShow).toHaveBeenCalledWith({
          title: 'Success',
          message: 'Logged in successfully',
          color: 'green',
        });
      });
    });

    it('handles login errors gracefully with notification', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const errorMessage = 'Invalid credentials';
      mockApiLogin.mockRejectedValue(new Error(errorMessage));

      await render(<LoginPage />);
      const { submitButton } = fillAndSubmitForm(
        'test@example.com',
        'wrongpassword'
      );

      await waitFor(() => {
        expect(mockApiLogin).toHaveBeenCalled();
      });

      // Verify error is logged
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Login failed:',
          expect.any(Error)
        );
      });

      // Verify error notification is shown
      await waitFor(() => {
        expect(mockNotificationShow).toHaveBeenCalledWith({
          title: 'Error',
          message: errorMessage,
          color: 'red',
        });
      });

      // Verify loading state is reset
      await waitFor(() => {
        expect(submitButton).not.toHaveAttribute('data-loading', 'true');
      });

      consoleErrorSpy.mockRestore();
    });

    it('handles special characters in credentials', async () => {
      render(<LoginPage />);

      const specialEmail = 'user+test@example-domain.com';
      const specialPassword = 'P@ssw0rd!#$%';

      fillAndSubmitForm(specialEmail, specialPassword);

      await waitFor(() => {
        expect(mockApiLogin).toHaveBeenCalledWith(
          specialEmail,
          specialPassword
        );
      });
    });
  });
});
