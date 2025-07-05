import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';
import ProfileSettings from './ProfileSettings';
import type { UserProfileSettings } from '@/types/models';

// Helper wrapper component for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider defaultColorScheme="light">{children}</MantineProvider>
);

// Custom render function
const render = (ui: React.ReactElement) => {
  return rtlRender(ui, { wrapper: TestWrapper });
};

describe('ProfileSettings', () => {
  const mockOnInputChange = vi.fn();

  const defaultSettings: UserProfileSettings = {
    displayName: 'John Doe',
    email: 'john.doe@example.com',
    currentPassword: '',
    newPassword: '',
  };

  const emptySettings: UserProfileSettings = {
    displayName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields with current values', () => {
    render(
      <ProfileSettings
        settings={defaultSettings}
        onInputChange={mockOnInputChange}
      />
    );

    const displayNameInput = screen.getByTestId('display-name-input');
    const emailInput = screen.getByTestId('email-input');

    expect(displayNameInput).toHaveValue('John Doe');
    expect(emailInput).toHaveValue('john.doe@example.com');
  });

  it('renders with empty settings', () => {
    render(
      <ProfileSettings
        settings={emptySettings}
        onInputChange={mockOnInputChange}
      />
    );

    const displayNameInput = screen.getByTestId('display-name-input');
    const emailInput = screen.getByTestId('email-input');

    expect(displayNameInput).toHaveValue('');
    expect(emailInput).toHaveValue('');
  });

  it('calls onInputChange when display name is modified', () => {
    render(
      <ProfileSettings
        settings={defaultSettings}
        onInputChange={mockOnInputChange}
      />
    );

    const displayNameInput = screen.getByTestId('display-name-input');
    fireEvent.change(displayNameInput, { target: { value: 'Jane Smith' } });

    expect(mockOnInputChange).toHaveBeenCalledWith('displayName', 'Jane Smith');
  });

  it('calls onInputChange when email is modified', () => {
    render(
      <ProfileSettings
        settings={defaultSettings}
        onInputChange={mockOnInputChange}
      />
    );

    const emailInput = screen.getByTestId('email-input');
    fireEvent.change(emailInput, { target: { value: 'jane@example.com' } });

    expect(mockOnInputChange).toHaveBeenCalledWith('email', 'jane@example.com');
  });

  it('has correct input types and accessibility', () => {
    render(
      <ProfileSettings
        settings={defaultSettings}
        onInputChange={mockOnInputChange}
      />
    );

    const displayNameInput = screen.getByTestId('display-name-input');
    const emailInput = screen.getByTestId('email-input');

    expect(displayNameInput).toHaveAttribute('type', 'text');
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(displayNameInput).toHaveAccessibleName();
    expect(emailInput).toHaveAccessibleName();
  });
});
