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
import { Theme } from '@/types/models';

const mockDeleteCurrentWorkspace = vi.fn();

vi.mock('../../../hooks/useWorkspace', () => ({
  useWorkspace: vi.fn(),
}));

const mockSetSettingsModalVisible = vi.fn();
vi.mock('../../../contexts/ModalContext', () => ({
  useModalContext: () => ({
    setSettingsModalVisible: mockSetSettingsModalVisible,
  }),
}));

vi.mock('../../modals/workspace/DeleteWorkspaceModal', () => ({
  default: ({
    opened,
    onClose,
    onConfirm,
    workspaceName,
  }: {
    opened: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    workspaceName: string | undefined;
  }) =>
    opened ? (
      <div data-testid="delete-workspace-modal">
        <span data-testid="workspace-name">{workspaceName}</span>
        <button onClick={onClose} data-testid="modal-close">
          Close
        </button>
        <button onClick={() => void onConfirm()} data-testid="modal-confirm">
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

describe('DangerZoneSettings (Workspace)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockDeleteCurrentWorkspace.mockResolvedValue(undefined);

    const { useWorkspace } = await import('../../../hooks/useWorkspace');
    vi.mocked(useWorkspace).mockReturnValue({
      currentWorkspace: {
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
      workspaces: [
        {
          id: 1,
          userId: 1,
          name: 'Workspace 1',
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
        {
          id: 2,
          userId: 1,
          name: 'Workspace 2',
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
      ],
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
      updateSettings: vi.fn(),
      loading: false,
      colorScheme: 'light',
      updateColorScheme: vi.fn(),
      switchWorkspace: vi.fn(),
      deleteCurrentWorkspace: mockDeleteCurrentWorkspace,
    });
  });

  it('renders delete button when multiple workspaces exist', () => {
    render(<DangerZoneSettings />);

    const deleteButton = screen.getByRole('button', {
      name: 'Delete Workspace',
    });
    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).not.toBeDisabled();
  });

  it('disables delete button when only one workspace exists', async () => {
    const { useWorkspace } = await import('../../../hooks/useWorkspace');
    vi.mocked(useWorkspace).mockReturnValue({
      currentWorkspace: {
        id: 1,
        userId: 1,
        name: 'Last Workspace',
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
      workspaces: [
        {
          id: 1,
          userId: 1,
          name: 'Last Workspace',
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
      ],
      settings: {
        id: 1,
        userId: 1,
        name: 'Last Workspace',
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
      updateSettings: vi.fn(),
      loading: false,
      colorScheme: 'light',
      updateColorScheme: vi.fn(),
      switchWorkspace: vi.fn(),
      deleteCurrentWorkspace: mockDeleteCurrentWorkspace,
    });

    render(<DangerZoneSettings />);

    const deleteButton = screen.getByRole('button', {
      name: 'Delete Workspace',
    });
    expect(deleteButton).toBeDisabled();
    expect(deleteButton).toHaveAttribute(
      'title',
      'Cannot delete the last workspace'
    );
  });

  it('opens and closes delete modal', () => {
    render(<DangerZoneSettings />);

    const deleteButton = screen.getByRole('button', {
      name: 'Delete Workspace',
    });
    fireEvent.click(deleteButton);

    expect(screen.getByTestId('delete-workspace-modal')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-name')).toHaveTextContent(
      'Test Workspace'
    );

    fireEvent.click(screen.getByTestId('modal-close'));
    expect(
      screen.queryByTestId('delete-workspace-modal')
    ).not.toBeInTheDocument();
  });

  it('completes workspace deletion flow', async () => {
    render(<DangerZoneSettings />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Workspace' }));
    fireEvent.click(screen.getByTestId('modal-confirm'));

    await waitFor(() => {
      expect(mockDeleteCurrentWorkspace).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockSetSettingsModalVisible).toHaveBeenCalledWith(false);
    });

    expect(
      screen.queryByTestId('delete-workspace-modal')
    ).not.toBeInTheDocument();
  });

  it('allows cancellation of deletion process', () => {
    render(<DangerZoneSettings />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Workspace' }));
    fireEvent.click(screen.getByTestId('modal-close'));

    expect(
      screen.queryByTestId('delete-workspace-modal')
    ).not.toBeInTheDocument();
    expect(mockDeleteCurrentWorkspace).not.toHaveBeenCalled();
    expect(mockSetSettingsModalVisible).not.toHaveBeenCalled();
  });
});
