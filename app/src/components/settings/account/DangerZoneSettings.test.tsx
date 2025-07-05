import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render as rtlRender,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';
import DangerZoneSettings from './DangerZoneSettings';

// Mock the auth context
const mockLogout = vi.fn();
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

// Mock the profile settings hook
const mockDeleteAccount = vi.fn();
vi.mock('../../../hooks/useProfileSettings', () => ({
  useProfileSettings: () => ({ deleteAccount: mockDeleteAccount }),
}));

// Mock the DeleteAccountModal
vi.mock('../../modals/account/DeleteAccountModal', () => ({
  default: ({
    opened,
    onClose,
    onConfirm,
  }: {
    opened: boolean;
    onClose: () => void;
    onConfirm: (password: string) => void;
  }) =>
    opened ? (
      <div data-testid="delete-account-modal">
        <button onClick={onClose} data-testid="modal-close">
          Close
        </button>
        <button
          onClick={() => onConfirm('test-password')}
          data-testid="modal-confirm"
        >
          Confirm Delete
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

describe('DangerZoneSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteAccount.mockResolvedValue(true);
    mockLogout.mockResolvedValue(undefined);
  });

  it('renders delete button with warning text', () => {
    render(<DangerZoneSettings />);

    expect(
      screen.getByRole('button', { name: 'Delete Account' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Once you delete your account, there is no going back. Please be certain.'
      )
    ).toBeInTheDocument();
  });

  it('opens and closes delete modal', () => {
    render(<DangerZoneSettings />);

    const deleteButton = screen.getByRole('button', { name: 'Delete Account' });
    fireEvent.click(deleteButton);

    expect(screen.getByTestId('delete-account-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('modal-close'));
    expect(
      screen.queryByTestId('delete-account-modal')
    ).not.toBeInTheDocument();
  });

  it('completes account deletion and logout flow', async () => {
    render(<DangerZoneSettings />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Account' }));
    fireEvent.click(screen.getByTestId('modal-confirm'));

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledWith('test-password');
    });

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });

    expect(
      screen.queryByTestId('delete-account-modal')
    ).not.toBeInTheDocument();
  });

  it('keeps modal open when deletion fails', async () => {
    mockDeleteAccount.mockResolvedValue(false);

    render(<DangerZoneSettings />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Account' }));
    fireEvent.click(screen.getByTestId('modal-confirm'));

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalled();
    });

    expect(screen.getByTestId('delete-account-modal')).toBeInTheDocument();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('allows cancellation of deletion process', () => {
    render(<DangerZoneSettings />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Account' }));
    fireEvent.click(screen.getByTestId('modal-close'));

    expect(
      screen.queryByTestId('delete-account-modal')
    ).not.toBeInTheDocument();
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });
});
