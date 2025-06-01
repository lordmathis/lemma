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

    // Set up default modal context
    mockUseModalContext.mockReturnValue(mockModalContext);
  });

  describe('Modal Visibility', () => {
    it('renders modal when visible', () => {
      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      expect(screen.getByText('Create New Workspace')).toBeInTheDocument();
      expect(screen.getByTestId('workspace-name-input')).toBeInTheDocument();
      expect(
        screen.getByTestId('cancel-create-workspace-button')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('confirm-create-workspace-button')
      ).toBeInTheDocument();
    });

    it('does not render modal when not visible', () => {
      const hiddenModalContext = {
        ...mockModalContext,
        createWorkspaceModalVisible: false,
      };

      mockUseModalContext.mockReturnValueOnce(hiddenModalContext);

      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      expect(
        screen.queryByText('Create New Workspace')
      ).not.toBeInTheDocument();
    });

    it('calls setCreateWorkspaceModalVisible when modal is closed via cancel button', () => {
      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      const cancelButton = screen.getByTestId('cancel-create-workspace-button');
      fireEvent.click(cancelButton);

      expect(mockSetCreateWorkspaceModalVisible).toHaveBeenCalledWith(false);
    });
  });

  describe('Form Interaction', () => {
    it('updates workspace name input when typed', () => {
      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      const nameInput = screen.getByTestId('workspace-name-input');
      fireEvent.change(nameInput, { target: { value: 'my-workspace' } });

      expect((nameInput as HTMLInputElement).value).toBe('my-workspace');
    });

    it('handles form submission with valid workspace name', async () => {
      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      const nameInput = screen.getByTestId('workspace-name-input');
      const createButton = screen.getByTestId(
        'confirm-create-workspace-button'
      );

      fireEvent.change(nameInput, { target: { value: 'new-workspace' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockCreateWorkspace).toHaveBeenCalledWith('new-workspace');
      });
    });

    it('prevents submission with empty workspace name', async () => {
      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      const createButton = screen.getByTestId(
        'confirm-create-workspace-button'
      );
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockNotificationsShow).toHaveBeenCalledWith({
          title: 'Error',
          message: 'Workspace name is required',
          color: 'red',
        });
      });

      expect(mockCreateWorkspace).not.toHaveBeenCalled();
    });

    it('prevents submission with whitespace-only workspace name', async () => {
      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      const nameInput = screen.getByTestId('workspace-name-input');
      const createButton = screen.getByTestId(
        'confirm-create-workspace-button'
      );

      fireEvent.change(nameInput, { target: { value: '   ' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockNotificationsShow).toHaveBeenCalledWith({
          title: 'Error',
          message: 'Workspace name is required',
          color: 'red',
        });
      });

      expect(mockCreateWorkspace).not.toHaveBeenCalled();
    });

    it('closes modal and clears form after successful creation', async () => {
      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      const nameInput = screen.getByTestId('workspace-name-input');
      const createButton = screen.getByTestId(
        'confirm-create-workspace-button'
      );

      fireEvent.change(nameInput, { target: { value: 'success-workspace' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockCreateWorkspace).toHaveBeenCalledWith('success-workspace');
      });

      await waitFor(() => {
        expect(mockSetCreateWorkspaceModalVisible).toHaveBeenCalledWith(false);
      });

      await waitFor(() => {
        expect((nameInput as HTMLInputElement).value).toBe('');
      });
    });
  });

  describe('Workspace Name Validation', () => {
    it('handles various workspace name formats', async () => {
      const workspaceNames = [
        'simple',
        'workspace-with-dashes',
        'workspace_with_underscores',
        'workspace with spaces',
        'workspace123',
        'Very Long Workspace Name Here',
      ];

      for (const name of workspaceNames) {
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

    it('handles unicode characters in workspace names', async () => {
      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      const nameInput = screen.getByTestId('workspace-name-input');
      const createButton = screen.getByTestId(
        'confirm-create-workspace-button'
      );

      const unicodeName = 'ワークスペース';
      fireEvent.change(nameInput, { target: { value: unicodeName } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockCreateWorkspace).toHaveBeenCalledWith(unicodeName);
      });
    });

    it('trims whitespace from workspace names', async () => {
      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      const nameInput = screen.getByTestId('workspace-name-input');
      const createButton = screen.getByTestId(
        'confirm-create-workspace-button'
      );

      fireEvent.change(nameInput, {
        target: { value: '  trimmed-workspace  ' },
      });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockCreateWorkspace).toHaveBeenCalledWith('trimmed-workspace');
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading state on create button during creation', async () => {
      // Make the API call hang to test loading state
      mockCreateWorkspace.mockImplementation(() => new Promise(() => {}));

      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      const nameInput = screen.getByTestId('workspace-name-input');
      const createButton = screen.getByTestId(
        'confirm-create-workspace-button'
      );

      fireEvent.change(nameInput, { target: { value: 'loading-test' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(createButton).toHaveAttribute('data-loading', 'true');
      });
    });

    it('disables form elements during creation', async () => {
      mockCreateWorkspace.mockImplementation(() => new Promise(() => {}));

      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      const nameInput = screen.getByTestId('workspace-name-input');
      const createButton = screen.getByTestId(
        'confirm-create-workspace-button'
      );
      const cancelButton = screen.getByTestId('cancel-create-workspace-button');

      fireEvent.change(nameInput, { target: { value: 'disabled-test' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(nameInput).toBeDisabled();
        expect(createButton).toBeDisabled();
        expect(cancelButton).toBeDisabled();
      });
    });

    it('handles normal state when not loading', () => {
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

  describe('Success Handling', () => {
    it('shows success notification after workspace creation', async () => {
      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      const nameInput = screen.getByTestId('workspace-name-input');
      const createButton = screen.getByTestId(
        'confirm-create-workspace-button'
      );

      fireEvent.change(nameInput, { target: { value: 'success-workspace' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockNotificationsShow).toHaveBeenCalledWith({
          title: 'Success',
          message: 'Workspace created successfully',
          color: 'green',
        });
      });
    });

    it('calls onWorkspaceCreated callback when provided', async () => {
      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      const nameInput = screen.getByTestId('workspace-name-input');
      const createButton = screen.getByTestId(
        'confirm-create-workspace-button'
      );

      fireEvent.change(nameInput, { target: { value: 'callback-test' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnWorkspaceCreated).toHaveBeenCalledWith(mockWorkspace);
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
    it('handles creation errors gracefully', async () => {
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

      // Modal should remain open when creation fails
      expect(mockSetCreateWorkspaceModalVisible).not.toHaveBeenCalledWith(
        false
      );
      expect(screen.getByText('Create New Workspace')).toBeInTheDocument();
    });

    it('handles network errors', async () => {
      mockCreateWorkspace.mockRejectedValue(new Error('Network error'));

      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      const nameInput = screen.getByTestId('workspace-name-input');
      const createButton = screen.getByTestId(
        'confirm-create-workspace-button'
      );

      fireEvent.change(nameInput, { target: { value: 'network-error-test' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockNotificationsShow).toHaveBeenCalledWith({
          title: 'Error',
          message: 'Failed to create workspace',
          color: 'red',
        });
      });

      // Should not crash the component
      expect(screen.getByText('Create New Workspace')).toBeInTheDocument();
    });

    it('retains form values when creation fails', async () => {
      mockCreateWorkspace.mockRejectedValue(new Error('Creation failed'));

      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      const nameInput = screen.getByTestId('workspace-name-input');
      const createButton = screen.getByTestId(
        'confirm-create-workspace-button'
      );

      fireEvent.change(nameInput, { target: { value: 'persist-error' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockCreateWorkspace).toHaveBeenCalledWith('persist-error');
      });

      // Form should retain values when creation fails
      expect((nameInput as HTMLInputElement).value).toBe('persist-error');
    });

    it('resets loading state after error', async () => {
      mockCreateWorkspace.mockRejectedValue(new Error('Creation failed'));

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

  describe('Accessibility', () => {
    it('has proper form labels and structure', () => {
      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      const nameInput = screen.getByTestId('workspace-name-input');
      expect(nameInput).toBeInTheDocument();
      expect(nameInput.tagName).toBe('INPUT');
      expect(nameInput).toHaveAttribute('type', 'text');
      expect(nameInput).toHaveAccessibleName();
    });

    it('has proper button roles', () => {
      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const createButton = screen.getByRole('button', { name: /create/i });

      expect(cancelButton).toBeInTheDocument();
      expect(createButton).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      const nameInput = screen.getByTestId('workspace-name-input');

      // Check that the input is focusable
      expect(nameInput).not.toHaveAttribute('disabled');
      expect(nameInput).not.toHaveAttribute('readonly');

      // Test keyboard input
      fireEvent.change(nameInput, { target: { value: 'keyboard-test' } });
      expect((nameInput as HTMLInputElement).value).toBe('keyboard-test');
    });

    it('has proper modal structure', () => {
      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      expect(screen.getByText('Create New Workspace')).toBeInTheDocument();
      expect(screen.getByTestId('workspace-name-input')).toBeInTheDocument();
    });
  });

  describe('Component Props', () => {
    it('accepts and uses onWorkspaceCreated prop correctly', async () => {
      const customCallback = vi.fn().mockResolvedValue(undefined);

      render(<CreateWorkspaceModal onWorkspaceCreated={customCallback} />);

      const nameInput = screen.getByTestId('workspace-name-input');
      const createButton = screen.getByTestId(
        'confirm-create-workspace-button'
      );

      fireEvent.change(nameInput, { target: { value: 'custom-callback' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(customCallback).toHaveBeenCalledWith(mockWorkspace);
      });
    });

    it('handles function props correctly', () => {
      const testCallback = vi.fn();

      expect(() => {
        render(<CreateWorkspaceModal onWorkspaceCreated={testCallback} />);
      }).not.toThrow();

      expect(screen.getByText('Create New Workspace')).toBeInTheDocument();
    });
  });

  describe('User Interaction Flow', () => {
    it('completes full workspace creation flow successfully', async () => {
      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      // 1. Modal opens and shows form
      expect(screen.getByText('Create New Workspace')).toBeInTheDocument();

      // 2. User types workspace name
      const nameInput = screen.getByTestId('workspace-name-input');
      fireEvent.change(nameInput, { target: { value: 'complete-flow-test' } });

      // 3. User clicks create
      const createButton = screen.getByTestId(
        'confirm-create-workspace-button'
      );
      fireEvent.click(createButton);

      // 4. API is called
      await waitFor(() => {
        expect(mockCreateWorkspace).toHaveBeenCalledWith('complete-flow-test');
      });

      // 5. Success notification is shown
      await waitFor(() => {
        expect(mockNotificationsShow).toHaveBeenCalledWith({
          title: 'Success',
          message: 'Workspace created successfully',
          color: 'green',
        });
      });

      // 6. Callback is called
      await waitFor(() => {
        expect(mockOnWorkspaceCreated).toHaveBeenCalledWith(mockWorkspace);
      });

      // 7. Modal closes and form clears
      await waitFor(() => {
        expect(mockSetCreateWorkspaceModalVisible).toHaveBeenCalledWith(false);
      });

      await waitFor(() => {
        expect((nameInput as HTMLInputElement).value).toBe('');
      });
    });

    it('allows user to cancel workspace creation', () => {
      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      // User types name but then cancels
      const nameInput = screen.getByTestId('workspace-name-input');
      fireEvent.change(nameInput, { target: { value: 'cancelled-workspace' } });

      const cancelButton = screen.getByTestId('cancel-create-workspace-button');
      fireEvent.click(cancelButton);

      // Should close modal without calling API
      expect(mockCreateWorkspace).not.toHaveBeenCalled();
      expect(mockSetCreateWorkspaceModalVisible).toHaveBeenCalledWith(false);
    });

    it('handles validation error flow', async () => {
      render(
        <CreateWorkspaceModal onWorkspaceCreated={mockOnWorkspaceCreated} />
      );

      // User tries to submit without entering name
      const createButton = screen.getByTestId(
        'confirm-create-workspace-button'
      );
      fireEvent.click(createButton);

      // Should show validation error
      await waitFor(() => {
        expect(mockNotificationsShow).toHaveBeenCalledWith({
          title: 'Error',
          message: 'Workspace name is required',
          color: 'red',
        });
      });

      // Should not call API or close modal
      expect(mockCreateWorkspace).not.toHaveBeenCalled();
      expect(mockSetCreateWorkspaceModalVisible).not.toHaveBeenCalledWith(
        false
      );
      expect(screen.getByText('Create New Workspace')).toBeInTheDocument();
    });
  });
});
