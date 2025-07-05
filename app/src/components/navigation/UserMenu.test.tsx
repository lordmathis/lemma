import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test/utils';
import UserMenu from './UserMenu';
import { UserRole } from '../../types/models';

// Mock the contexts
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock the settings components
vi.mock('../settings/account/AccountSettings', () => ({
  default: ({ opened, onClose }: { opened: boolean; onClose: () => void }) => (
    <div data-testid="account-settings-modal" data-opened={opened}>
      <button onClick={onClose}>Close Account Settings</button>
    </div>
  ),
}));

vi.mock('../settings/admin/AdminDashboard', () => ({
  default: ({ opened, onClose }: { opened: boolean; onClose: () => void }) => (
    <div data-testid="admin-dashboard-modal" data-opened={opened}>
      <button onClick={onClose}>Close Admin Dashboard</button>
    </div>
  ),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);

describe('UserMenu', () => {
  const mockLogout = vi.fn();
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    displayName: 'Test User',
    role: UserRole.Editor,
    createdAt: '2024-01-01T00:00:00Z',
    lastWorkspaceId: 1,
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const { useAuth } = await import('../../contexts/AuthContext');
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      logout: mockLogout,
      loading: false,
      initialized: true,
      login: vi.fn(),
      refreshToken: vi.fn(),
      refreshUser: vi.fn(),
    });
  });

  it('renders user avatar and shows user info when clicked', async () => {
    const { getByLabelText, getByText } = render(
      <TestWrapper>
        <UserMenu />
      </TestWrapper>
    );

    // Find and click the avatar
    const avatar = getByLabelText('User menu');
    fireEvent.click(avatar);

    // Check if user info is displayed in popover
    await waitFor(() => {
      expect(getByText('Test User')).toBeInTheDocument();
    });
  });

  it('shows admin dashboard option for admin users only', async () => {
    // Test admin user sees admin option
    const { useAuth } = await import('../../contexts/AuthContext');
    vi.mocked(useAuth).mockReturnValue({
      user: { ...mockUser, role: UserRole.Admin },
      logout: mockLogout,
      loading: false,
      initialized: true,
      login: vi.fn(),
      refreshToken: vi.fn(),
      refreshUser: vi.fn(),
    });

    const { getByLabelText, getByText } = render(
      <TestWrapper>
        <UserMenu />
      </TestWrapper>
    );

    const avatar = getByLabelText('User menu');
    fireEvent.click(avatar);

    await waitFor(() => {
      expect(getByText('Admin Dashboard')).toBeInTheDocument();
    });
  });

  it('opens account settings modal when clicked', async () => {
    const { getByLabelText, getByText, getByTestId } = render(
      <TestWrapper>
        <UserMenu />
      </TestWrapper>
    );

    const avatar = getByLabelText('User menu');
    fireEvent.click(avatar);

    await waitFor(() => {
      const accountSettingsButton = getByText('Account Settings');
      fireEvent.click(accountSettingsButton);
    });

    await waitFor(() => {
      const modal = getByTestId('account-settings-modal');
      expect(modal).toHaveAttribute('data-opened', 'true');
    });
  });

  it('calls logout when logout button is clicked', async () => {
    const { getByLabelText, getByText } = render(
      <TestWrapper>
        <UserMenu />
      </TestWrapper>
    );

    const avatar = getByLabelText('User menu');
    fireEvent.click(avatar);

    await waitFor(() => {
      const logoutButton = getByText('Logout');
      fireEvent.click(logoutButton);
    });

    expect(mockLogout).toHaveBeenCalledOnce();
  });

  it('displays user email when displayName is not available', async () => {
    const { useAuth } = await import('../../contexts/AuthContext');
    const userWithoutDisplayName = {
      id: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
      createdAt: mockUser.createdAt,
      lastWorkspaceId: mockUser.lastWorkspaceId,
    };

    vi.mocked(useAuth).mockReturnValue({
      user: userWithoutDisplayName,
      logout: mockLogout,
      loading: false,
      initialized: true,
      login: vi.fn(),
      refreshToken: vi.fn(),
      refreshUser: vi.fn(),
    });

    const { getByLabelText, getByText } = render(
      <TestWrapper>
        <UserMenu />
      </TestWrapper>
    );

    const avatar = getByLabelText('User menu');
    fireEvent.click(avatar);

    await waitFor(() => {
      expect(getByText('test@example.com')).toBeInTheDocument();
    });
  });
});
