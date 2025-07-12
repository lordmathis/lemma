import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render as rtlRender,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';
import CreateWorkspaceModal from './CreateWorkspaceModal';
import { Theme, type Workspace } from '@/types/models';
import { notifications } from '@mantine/notifications';
import { useModalContext } from '../../../contexts/ModalContext';
import { createWorkspace } from '@/api/workspace';

// Mock notifications
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

// Mock ModalContext
vi.mock('../../../contexts/ModalContext', () => ({
  useModalContext: vi.fn(),
}));

// Mock workspace API
vi.mock('@/api/workspace', () => ({
  createWorkspace: vi.fn(),
}));

// Helper wrapper component for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider defaultColorScheme="light">{children}</MantineProvider>
);

// Custom render function
const render = (ui: React.ReactElement) => {
  return rtlRender(ui, { wrapper: TestWrapper });
};

describe('CreateWorkspaceModal', () => {
  const mockOnWorkspaceCreated = vi.fn();
  const mockNotificationsShow = vi.mocked(notifications.show);
  const mockUseModalContext = vi.mocked(useModalContext);
  const mockCreateWorkspace = vi.mocked(createWorkspace);

  const mockSetCreateWorkspaceModalVisible = vi.fn();
  const mockModalContext = {
    newFileModalVisible: false,
    setNewFileModalVisible: vi.fn(),
    deleteFileModalVisible: false,
    setDeleteFileModalVisible: vi.fn(),
    renameFileModalVisible: false,
    setRenameFileModalVisible: vi.fn(),
    commitMessageModalVisible: false,
    setCommitMessageModalVisible: vi.fn(),
    settingsModalVisible: false,
    setSettingsModalVisible: vi.fn(),
    switchWorkspaceModalVisible: false,
    setSwitchWorkspaceModalVisible: vi.fn(),
    createWorkspaceModalVisible: true,
    setCreateWorkspaceModalVisible: mockSetCreateWorkspaceModalVisible,
  };

  const mockWorkspace: Workspace = {
    id: 1,
    userId: 1,
    name: 'test-workspace',
    createdAt: '2024-01-01T00:00:00Z',
    theme: Theme.Light,
    autoSave: false,
    showHiddenFiles: false,
    gitEnabled: false,
    gitUrl: '',
    gitUser: '',
    gitToken: '',
    gitAutoCommit: false,
    gitCommitMsgTemplate: '${action} ${filename}',
    gitCommitName: '',
    gitCommitEmail: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateWorkspace.mockResolvedValue(mockWorkspace);
    mockOnWorkspaceCreated.mockResolvedValue(undefined);
    mockSetCreateWorkspaceModalVisible.mockClear();
    mockNotificationsShow.mockClear();
    mockUseModalContext.mockReturnValue(mockModalContext);
  });

  describe('Modal Visibility and Content', () => {
    it('renders modal with correct content when opened', () => {
      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      expect(screen.getByText('Create New Workspace')).toBeInTheDocument();
      expect(screen.getByTestId('workspace-name-input')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /create/i })
      ).toBeInTheDocument();
    });

    it('does not render when modal is closed', () => {
      mockUseModalContext.mockReturnValueOnce({
        ...mockModalContext,
        createWorkspaceModalVisible: false,
      });

      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      expect(
        screen.queryByText('Create New Workspace')
      ).not.toBeInTheDocument();
    });
  });

  describe('User Actions', () => {
    it('calls onClose when cancel button is clicked', () => {
      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      fireEvent.click(screen.getByTestId('cancel-create-workspace-button'));
      expect(mockSetCreateWorkspaceModalVisible).toHaveBeenCalledWith(false);
    });

    it('updates workspace name input when typed', () => {
      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      const nameInput = screen.getByTestId('workspace-name-input');
      fireEvent.change(nameInput, { target: { value: 'my-workspace' } });

      expect((nameInput as HTMLInputElement).value).toBe('my-workspace');
    });
  });

  describe('Form Validation', () => {
    it('prevents submission with empty or whitespace-only names', async () => {
      const testCases = ['', '   ', '\t\n  '];

      for (const testValue of testCases) {
        const { unmount } = render(
          <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
        );

        const nameInput = screen.getByTestId('workspace-name-input');
        const createButton = screen.getByTestId(
          'confirm-create-workspace-button'
        );

        fireEvent.change(nameInput, { target: { value: testValue } });
        fireEvent.click(createButton);

        await waitFor(() => {
          expect(mockNotificationsShow).toHaveBeenCalledWith({
            title: 'Error',
            message: 'Workspace name is required',
            color: 'red',
          });
        });

        expect(mockCreateWorkspace).not.toHaveBeenCalled();

        unmount();
        vi.clearAllMocks();
      }
    });

    it('trims whitespace from workspace names before submission', async () => {
      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      const nameInput = screen.getByTestId('workspace-name-input');
      const createButton = screen.getByTestId(
        'confirm-create-workspace-button'
      );

      fireEvent.change(nameInput, { target: { value: '  valid-workspace  ' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockCreateWorkspace).toHaveBeenCalledWith('valid-workspace');
      });
    });

    it('accepts various valid workspace name formats', async () => {
      const validNames = [
        'simple',
        'workspace-with-dashes',
        'workspace_with_underscores',
        'workspace with spaces',
        'workspace123',
        'ワークスペース', // Unicode
      ];

      for (const name of validNames) {
        const { unmount } = render(
          <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
        );

        const nameInput = screen.getByTestId('workspace-name-input');
        const createButton = screen.getByTestId(
          'confirm-create-workspace-button'
        );

        fireEvent.change(nameInput, { target: { value: name } });
        fireEvent.click(createButton);

        await waitFor(() => {
          expect(mockCreateWorkspace).toHaveBeenCalledWith(name);
        });

        unmount();
        vi.clearAllMocks();
        mockCreateWorkspace.mockResolvedValue(mockWorkspace);
      }
    });
  });

  describe('Loading States and UI Behavior', () => {
    it('disables form elements and shows loading during workspace creation', async () => {
      mockCreateWorkspace.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      const nameInput = screen.getByTestId('workspace-name-input');
      const createButton = screen.getByTestId(
        'confirm-create-workspace-button'
      );
      const cancelButton = screen.getByTestId('cancel-create-workspace-button');

      fireEvent.change(nameInput, { target: { value: 'loading-test' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(nameInput).toBeDisabled();
        expect(createButton).toBeDisabled();
        expect(cancelButton).toBeDisabled();
        expect(createButton).toHaveAttribute('data-loading', 'true');
      });
    });

    it('maintains normal state when not loading', () => {
      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      const nameInput = screen.getByTestId('workspace-name-input');
      const createButton = screen.getByTestId(
        'confirm-create-workspace-button'
      );
      const cancelButton = screen.getByTestId('cancel-create-workspace-button');

      expect(nameInput).not.toBeDisabled();
      expect(createButton).not.toBeDisabled();
      expect(cancelButton).not.toBeDisabled();
      expect(createButton).not.toHaveAttribute('data-loading', 'true');
    });
  });

  describe('Workspace Creation Flow', () => {
    it('completes full successful creation flow', async () => {
      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      const nameInput = screen.getByTestId('workspace-name-input');
      const createButton = screen.getByTestId(
        'confirm-create-workspace-button'
      );

      fireEvent.change(nameInput, { target: { value: 'new-workspace' } });
      fireEvent.click(createButton);

      // API called with correct name
      await waitFor(() => {
        expect(mockCreateWorkspace).toHaveBeenCalledWith('new-workspace');
      });

      // Success notification shown
      await waitFor(() => {
        expect(mockNotificationsShow).toHaveBeenCalledWith({
          title: 'Success',
          message: 'Workspace created successfully',
          color: 'green',
        });
      });

      // Callback invoked
      await waitFor(() => {
        expect(mockOnWorkspaceCreated).toHaveBeenCalledWith(mockWorkspace);
      });

      // Modal closed and form cleared
      await waitFor(() => {
        expect(mockSetCreateWorkspaceModalVisible).toHaveBeenCalledWith(false);
        expect((nameInput as HTMLInputElement).value).toBe('');
      });
    });

    it('works without onWorkspaceCreated callback', async () => {
      render(<CreateWorkspaceModal />);

      const nameInput = screen.getByTestId('workspace-name-input');
      const createButton = screen.getByTestId(
        'confirm-create-workspace-button'
      );

      fireEvent.change(nameInput, { target: { value: 'no-callback-test' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockCreateWorkspace).toHaveBeenCalledWith('no-callback-test');
      });

      await waitFor(() => {
        expect(mockNotificationsShow).toHaveBeenCalledWith({
          title: 'Success',
          message: 'Workspace created successfully',
          color: 'green',
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      mockCreateWorkspace.mockRejectedValue(new Error('Creation failed'));

      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      const nameInput = screen.getByTestId('workspace-name-input');
      const createButton = screen.getByTestId(
        'confirm-create-workspace-button'
      );

      fireEvent.change(nameInput, { target: { value: 'error-workspace' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockNotificationsShow).toHaveBeenCalledWith({
          title: 'Error',
          message: 'Failed to create workspace',
          color: 'red',
        });
      });

      // Modal remains open and form retains values
      expect(mockSetCreateWorkspaceModalVisible).not.toHaveBeenCalledWith(
        false
      );
      expect(screen.getByText('Create New Workspace')).toBeInTheDocument();
      expect((nameInput as HTMLInputElement).value).toBe('error-workspace');
    });

    it('resets loading state after error', async () => {
      mockCreateWorkspace.mockRejectedValue(new Error('Network error'));

      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      const nameInput = screen.getByTestId('workspace-name-input');
      const createButton = screen.getByTestId(
        'confirm-create-workspace-button'
      );

      fireEvent.change(nameInput, { target: { value: 'loading-error' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockCreateWorkspace).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(createButton).not.toHaveAttribute('data-loading', 'true');
        expect(nameInput).not.toBeDisabled();
      });
    });
  });

  describe('Keyboard Interactions', () => {
    it('supports keyboard input in the name field', () => {
      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      const nameInput = screen.getByTestId('workspace-name-input');

      expect(nameInput).not.toHaveAttribute('disabled');
      expect(nameInput).not.toHaveAttribute('readonly');

      fireEvent.change(nameInput, { target: { value: 'keyboard-test' } });
      expect((nameInput as HTMLInputElement).value).toBe('keyboard-test');
    });
  });
});
