import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render as rtlRender,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';
import AccountSettings from './AccountSettings';

// Mock the auth context
const mockUser = {
  id: 1,
  email: 'test@example.com',
  displayName: 'Test User',
  role: 'editor' as const,
};
const mockRefreshUser = vi.fn();
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    refreshUser: mockRefreshUser,
  }),
}));

// Mock the profile settings hook
const mockUpdateProfile = vi.fn();
vi.mock('../../../hooks/useProfileSettings', () => ({
  useProfileSettings: () => ({
    loading: false,
    updateProfile: mockUpdateProfile,
  }),
}));

// Mock notifications
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

// Mock the sub-components
vi.mock('./ProfileSettings', () => ({
  default: ({
    settings,
    onInputChange,
  }: {
    settings: {
      displayName?: string;
      email?: string;
    };
    onInputChange: (field: string, value: string) => void;
  }) => (
    <div data-testid="profile-settings">
      <input
        data-testid="display-name-input"
        value={settings.displayName || ''}
        onChange={(e) => onInputChange('displayName', e.target.value)}
      />
      <input
        data-testid="email-input"
        value={settings.email || ''}
        onChange={(e) => onInputChange('email', e.target.value)}
      />
    </div>
  ),
}));

vi.mock('./SecuritySettings', () => ({
  default: ({
    settings,
    onInputChange,
  }: {
    settings: {
      currentPassword?: string;
      newPassword?: string;
    };
    onInputChange: (field: string, value: string) => void;
  }) => (
    <div data-testid="security-settings">
      <input
        data-testid="current-password-input"
        value={settings.currentPassword || ''}
        onChange={(e) => onInputChange('currentPassword', e.target.value)}
      />
      <input
        data-testid="new-password-input"
        value={settings.newPassword || ''}
        onChange={(e) => onInputChange('newPassword', e.target.value)}
      />
    </div>
  ),
}));

vi.mock('./DangerZoneSettings', () => ({
  default: () => <div data-testid="danger-zone-settings">Danger Zone</div>,
}));

vi.mock('../../modals/account/EmailPasswordModal', () => ({
  default: ({
    opened,
    onConfirm,
  }: {
    opened: boolean;
    onConfirm: (password: string) => void;
  }) =>
    opened ? (
      <div data-testid="email-password-modal">
        <button
          onClick={() => void onConfirm('test-password')}
          data-testid="confirm-email"
        >
          Confirm
        </button>
      </div>
    ) : null,
}));

// Helper wrapper component for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider defaultColorScheme="light">{children}</MantineProvider>
);

// Custom render function
const render = (ui: React.ReactElement) => {
  return rtlRender(ui, { wrapper: TestWrapper });
};

describe('AccountSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateProfile.mockResolvedValue(mockUser);
    mockRefreshUser.mockResolvedValue(undefined);
  });

  it('renders modal with all sections', () => {
    render(<AccountSettings opened={true} onClose={vi.fn()} />);

    expect(screen.getByText('Account Settings')).toBeInTheDocument();
    expect(screen.getByTestId('profile-settings')).toBeInTheDocument();
    expect(screen.getByTestId('security-settings')).toBeInTheDocument();
    expect(screen.getByTestId('danger-zone-settings')).toBeInTheDocument();
  });

  it('shows unsaved changes badge when settings are modified', () => {
    render(<AccountSettings opened={true} onClose={vi.fn()} />);

    const displayNameInput = screen.getByTestId('display-name-input');
    fireEvent.change(displayNameInput, { target: { value: 'Updated Name' } });

    expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
  });

  it('enables save button when there are changes', () => {
    render(<AccountSettings opened={true} onClose={vi.fn()} />);

    const saveButton = screen.getByRole('button', { name: 'Save Changes' });
    expect(saveButton).toBeDisabled();

    const displayNameInput = screen.getByTestId('display-name-input');
    fireEvent.change(displayNameInput, { target: { value: 'Updated Name' } });

    expect(saveButton).not.toBeDisabled();
  });

  it('saves profile changes successfully', async () => {
    const mockOnClose = vi.fn();
    render(<AccountSettings opened={true} onClose={mockOnClose} />);

    const displayNameInput = screen.getByTestId('display-name-input');
    fireEvent.change(displayNameInput, { target: { value: 'Updated Name' } });

    const saveButton = screen.getByRole('button', { name: 'Save Changes' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: 'Updated Name' })
      );
    });

    await waitFor(() => {
      expect(mockRefreshUser).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('opens email confirmation modal for email changes', () => {
    render(<AccountSettings opened={true} onClose={vi.fn()} />);

    const emailInput = screen.getByTestId('email-input');
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });

    const saveButton = screen.getByRole('button', { name: 'Save Changes' });
    fireEvent.click(saveButton);

    expect(screen.getByTestId('email-password-modal')).toBeInTheDocument();
  });

  it('completes email change with password confirmation', async () => {
    const mockOnClose = vi.fn();
    render(<AccountSettings opened={true} onClose={mockOnClose} />);

    const emailInput = screen.getByTestId('email-input');
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });

    const saveButton = screen.getByRole('button', { name: 'Save Changes' });
    fireEvent.click(saveButton);

    const confirmButton = screen.getByTestId('confirm-email');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@example.com',
          currentPassword: 'test-password',
        })
      );
    });

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('closes modal when cancel is clicked', () => {
    const mockOnClose = vi.fn();
    render(<AccountSettings opened={true} onClose={mockOnClose} />);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not render when closed', () => {
    render(<AccountSettings opened={false} onClose={vi.fn()} />);

    expect(screen.queryByText('Account Settings')).not.toBeInTheDocument();
  });
});
