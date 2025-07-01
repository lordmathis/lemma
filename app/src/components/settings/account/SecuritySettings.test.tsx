import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';
import SecuritySettings from './SecuritySettings';
import type { UserProfileSettings } from '@/types/models';

// Helper wrapper component for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider defaultColorScheme="light">{children}</MantineProvider>
);

// Custom render function
const render = (ui: React.ReactElement) => {
  return rtlRender(ui, { wrapper: TestWrapper });
};

describe('SecuritySettings', () => {
  const mockOnInputChange = vi.fn();

  const defaultSettings: UserProfileSettings = {
    displayName: 'John Doe',
    email: 'john@example.com',
    currentPassword: '',
    newPassword: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all password fields', () => {
    render(
      <SecuritySettings
        settings={defaultSettings}
        onInputChange={mockOnInputChange}
      />
    );

    expect(screen.getByLabelText('Current Password')).toBeInTheDocument();
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
  });

  it('calls onInputChange for current password', () => {
    render(
      <SecuritySettings
        settings={defaultSettings}
        onInputChange={mockOnInputChange}
      />
    );

    const currentPasswordInput = screen.getByLabelText('Current Password');
    fireEvent.change(currentPasswordInput, { target: { value: 'oldpass123' } });

    expect(mockOnInputChange).toHaveBeenCalledWith(
      'currentPassword',
      'oldpass123'
    );
  });

  it('calls onInputChange for new password', () => {
    render(
      <SecuritySettings
        settings={defaultSettings}
        onInputChange={mockOnInputChange}
      />
    );

    const newPasswordInput = screen.getByLabelText('New Password');
    fireEvent.change(newPasswordInput, { target: { value: 'newpass123' } });

    expect(mockOnInputChange).toHaveBeenCalledWith('newPassword', 'newpass123');
  });

  it('shows error when passwords do not match', () => {
    render(
      <SecuritySettings
        settings={{ ...defaultSettings, newPassword: 'password123' }}
        onInputChange={mockOnInputChange}
      />
    );

    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    fireEvent.change(confirmPasswordInput, {
      target: { value: 'different123' },
    });

    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  });

  it('clears error when passwords match', () => {
    render(
      <SecuritySettings
        settings={{ ...defaultSettings, newPassword: 'password123' }}
        onInputChange={mockOnInputChange}
      />
    );

    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');

    // First make them not match
    fireEvent.change(confirmPasswordInput, {
      target: { value: 'different123' },
    });
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();

    // Then make them match
    fireEvent.change(confirmPasswordInput, {
      target: { value: 'password123' },
    });
    expect(
      screen.queryByText('Passwords do not match')
    ).not.toBeInTheDocument();
  });

  it('has correct input types and help text', () => {
    render(
      <SecuritySettings
        settings={defaultSettings}
        onInputChange={mockOnInputChange}
      />
    );

    const currentPasswordInput = screen.getByLabelText('Current Password');
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');

    expect(currentPasswordInput).toHaveAttribute('type', 'password');
    expect(newPasswordInput).toHaveAttribute('type', 'password');
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');

    expect(
      screen.getByText(/Password must be at least 8 characters long/)
    ).toBeInTheDocument();
  });
});
