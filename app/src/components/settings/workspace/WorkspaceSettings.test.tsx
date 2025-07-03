import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render as rtlRender,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';
import WorkspaceSettings from './WorkspaceSettings';
import { Theme } from '@/types/models';

const mockUpdateSettings = vi.fn();
vi.mock('../../../hooks/useWorkspace', () => ({
  useWorkspace: vi.fn(),
}));

const mockSetSettingsModalVisible = vi.fn();
vi.mock('../../../contexts/ModalContext', () => ({
  useModalContext: () => ({
    settingsModalVisible: true,
    setSettingsModalVisible: mockSetSettingsModalVisible,
  }),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

vi.mock('./GeneralSettings', () => ({
  default: ({
    name,
    onInputChange,
  }: {
    name: string;
    onInputChange: (key: string, value: string) => void;
  }) => (
    <div data-testid="general-settings">
      <input
        data-testid="workspace-name-input"
        value={name}
        onChange={(e) => onInputChange('name', e.target.value)}
      />
    </div>
  ),
}));

vi.mock('./AppearanceSettings', () => ({
  default: ({ onThemeChange }: { onThemeChange: (theme: string) => void }) => (
    <div data-testid="appearance-settings">
      <button onClick={() => onThemeChange('dark')} data-testid="theme-toggle">
        Toggle Theme
      </button>
    </div>
  ),
}));

vi.mock('./EditorSettings', () => ({
  default: () => <div data-testid="editor-settings">Editor Settings</div>,
}));

vi.mock('./GitSettings', () => ({
  default: () => <div data-testid="git-settings">Git Settings</div>,
}));

vi.mock('./DangerZoneSettings', () => ({
  default: () => <div data-testid="danger-zone-settings">Danger Zone</div>,
}));

// Helper wrapper component for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider defaultColorScheme="light">{children}</MantineProvider>
);

// Custom render function
const render = (ui: React.ReactElement) => {
  return rtlRender(ui, { wrapper: TestWrapper });
};

describe('WorkspaceSettings', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockUpdateSettings.mockResolvedValue(undefined);

    const { useWorkspace } = await import('../../../hooks/useWorkspace');
    vi.mocked(useWorkspace).mockReturnValue({
      currentWorkspace: {
        name: 'Test Workspace',
        createdAt: '2024-01-01T00:00:00Z',
        theme: Theme.Light,
        autoSave: false,
        showHiddenFiles: false,
        gitEnabled: false,
        gitUrl: '',
        gitUser: '',
        gitToken: '',
        gitAutoCommit: false,
        gitCommitMsgTemplate: '',
        gitCommitName: '',
        gitCommitEmail: '',
      },
      workspaces: [],
      settings: {
        id: 1,
        userId: 1,
        name: 'Test Workspace',
        createdAt: '2024-01-01T00:00:00Z',
        theme: Theme.Light,
        autoSave: false,
        showHiddenFiles: false,
        gitEnabled: false,
        gitUrl: '',
        gitUser: '',
        gitToken: '',
        gitAutoCommit: false,
        gitCommitMsgTemplate: '',
        gitCommitName: '',
        gitCommitEmail: '',
      },
      updateSettings: mockUpdateSettings,
      loading: false,
      colorScheme: 'light',
      updateColorScheme: vi.fn(),
      switchWorkspace: vi.fn(),
      deleteCurrentWorkspace: vi.fn(),
    });
  });

  it('renders modal with all setting sections', () => {
    render(<WorkspaceSettings />);

    expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    expect(screen.getByTestId('general-settings')).toBeInTheDocument();
    expect(screen.getByTestId('appearance-settings')).toBeInTheDocument();
    expect(screen.getByTestId('editor-settings')).toBeInTheDocument();
    expect(screen.getByTestId('git-settings')).toBeInTheDocument();
    expect(screen.getByTestId('danger-zone-settings')).toBeInTheDocument();
  });

  it('shows unsaved changes badge when settings are modified', () => {
    render(<WorkspaceSettings />);

    const nameInput = screen.getByTestId('workspace-name-input');
    fireEvent.change(nameInput, { target: { value: 'Updated Workspace' } });

    expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
  });

  it('saves settings successfully', async () => {
    render(<WorkspaceSettings />);

    const nameInput = screen.getByTestId('workspace-name-input');
    fireEvent.change(nameInput, { target: { value: 'Updated Workspace' } });

    const saveButton = screen.getByRole('button', { name: 'Save Changes' });
    expect(saveButton).toBeDefined();
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Updated Workspace' })
      );
    });

    await waitFor(() => {
      expect(mockSetSettingsModalVisible).toHaveBeenCalledWith(false);
    });
  });

  it('handles theme changes', () => {
    render(<WorkspaceSettings />);

    const themeToggle = screen.getByTestId('theme-toggle');
    fireEvent.click(themeToggle);

    expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
  });

  it('closes modal when cancel is clicked', () => {
    render(<WorkspaceSettings />);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(mockSetSettingsModalVisible).toHaveBeenCalledWith(false);
  });

  it('prevents saving with empty workspace name', async () => {
    const { notifications } = await import('@mantine/notifications');

    render(<WorkspaceSettings />);

    const nameInput = screen.getByTestId('workspace-name-input');
    fireEvent.change(nameInput, { target: { value: '   ' } }); // Empty/whitespace

    const saveButton = screen.getByRole('button', { name: 'Save Changes' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Workspace name cannot be empty',
          color: 'red',
        })
      );
    });

    expect(mockUpdateSettings).not.toHaveBeenCalled();
  });
});
