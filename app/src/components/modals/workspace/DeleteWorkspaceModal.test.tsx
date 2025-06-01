import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render as rtlRender,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';
import DeleteWorkspaceModal from './DeleteWorkspaceModal';

// Mock notifications
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

// Helper wrapper component for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider defaultColorScheme="light">{children}</MantineProvider>
);

// Custom render function
const render = (ui: React.ReactElement) => {
  return rtlRender(ui, { wrapper: TestWrapper });
};

describe('DeleteWorkspaceModal', () => {
  const mockOnConfirm = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnConfirm.mockResolvedValue(undefined);
    mockOnClose.mockClear();
  });

  describe('Modal Visibility', () => {
    it('renders modal when opened with workspace name', () => {
      render(
        <DeleteWorkspaceModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          workspaceName="test-workspace"
        />
      );

      expect(screen.getByText('Delete Workspace')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Are you sure you want to delete workspace "test-workspace"? This action cannot be undone and all files in this workspace will be permanently deleted.'
        )
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('cancel-delete-workspace-button')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('confirm-delete-workspace-button')
      ).toBeInTheDocument();
    });

    it('does not render modal when closed', () => {
      render(
        <DeleteWorkspaceModal
          opened={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          workspaceName="test-workspace"
        />
      );

      expect(screen.queryByText('Delete Workspace')).not.toBeInTheDocument();
    });

    it('renders modal with undefined workspace name', () => {
      render(
        <DeleteWorkspaceModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          workspaceName={undefined}
        />
      );

      expect(screen.getByText('Delete Workspace')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Are you sure you want to delete workspace ""? This action cannot be undone and all files in this workspace will be permanently deleted.'
        )
      ).toBeInTheDocument();
    });

    it('calls onClose when modal is closed via cancel button', () => {
      render(
        <DeleteWorkspaceModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          workspaceName="test-workspace"
        />
      );

      const cancelButton = screen.getByTestId('cancel-delete-workspace-button');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Workspace Information Display', () => {
    it('displays correct workspace name in confirmation message', () => {
      render(
        <DeleteWorkspaceModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          workspaceName="my-workspace"
        />
      );

      expect(
        screen.getByText(
          'Are you sure you want to delete workspace "my-workspace"? This action cannot be undone and all files in this workspace will be permanently deleted.'
        )
      ).toBeInTheDocument();
    });

    it('handles various workspace name formats in confirmation message', () => {
      const workspaceNames = [
        'simple',
        'workspace-with-dashes',
        'workspace_with_underscores',
        'workspace with spaces',
        'very-long-workspace-name-here',
      ];

      workspaceNames.forEach((workspaceName) => {
        const { unmount } = render(
          <DeleteWorkspaceModal
            opened={true}
            onClose={mockOnClose}
            onConfirm={mockOnConfirm}
            workspaceName={workspaceName}
          />
        );

        expect(
          screen.getByText(
            `Are you sure you want to delete workspace "${workspaceName}"? This action cannot be undone and all files in this workspace will be permanently deleted.`
          )
        ).toBeInTheDocument();

        unmount();
      });
    });

    it('handles workspace with special characters in name', () => {
      const specialWorkspace = 'workspace"with@quotes';

      render(
        <DeleteWorkspaceModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          workspaceName={specialWorkspace}
        />
      );

      expect(
        screen.getByText(
          'Are you sure you want to delete workspace "workspace"with@quotes"? This action cannot be undone and all files in this workspace will be permanently deleted.'
        )
      ).toBeInTheDocument();
    });

    it('handles unicode characters in workspace name', () => {
      const unicodeWorkspace = 'ワークスペース';

      render(
        <DeleteWorkspaceModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          workspaceName={unicodeWorkspace}
        />
      );

      expect(
        screen.getByText(
          'Are you sure you want to delete workspace "ワークスペース"? This action cannot be undone and all files in this workspace will be permanently deleted.'
        )
      ).toBeInTheDocument();
    });

    it('handles empty workspace name', () => {
      render(
        <DeleteWorkspaceModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          workspaceName=""
        />
      );

      expect(
        screen.getByText(
          'Are you sure you want to delete workspace ""? This action cannot be undone and all files in this workspace will be permanently deleted.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('Modal Actions', () => {
    it('has cancel and delete buttons with correct text', () => {
      render(
        <DeleteWorkspaceModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          workspaceName="test-workspace"
        />
      );

      const cancelButton = screen.getByTestId('cancel-delete-workspace-button');
      const deleteButton = screen.getByTestId(
        'confirm-delete-workspace-button'
      );

      expect(cancelButton).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();

      expect(cancelButton).toHaveTextContent('Cancel');
      expect(deleteButton).toHaveTextContent('Delete');

      expect(cancelButton).toHaveRole('button');
      expect(deleteButton).toHaveRole('button');
    });

    it('calls onConfirm when delete button is clicked', async () => {
      render(
        <DeleteWorkspaceModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          workspaceName="test-workspace"
        />
      );

      const deleteButton = screen.getByTestId(
        'confirm-delete-workspace-button'
      );
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onClose when cancel button is clicked', () => {
      render(
        <DeleteWorkspaceModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          workspaceName="test-workspace"
        />
      );

      const cancelButton = screen.getByTestId('cancel-delete-workspace-button');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles deletion errors gracefully', async () => {
      mockOnConfirm.mockRejectedValue(new Error('Deletion failed'));

      render(
        <DeleteWorkspaceModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          workspaceName="error-workspace"
        />
      );

      const deleteButton = screen.getByTestId(
        'confirm-delete-workspace-button'
      );
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalled();
      });

      // Modal should handle the error gracefully (not crash)
      expect(screen.getByText('Delete Workspace')).toBeInTheDocument();
    });

    it('handles network errors', async () => {
      mockOnConfirm.mockRejectedValue(new Error('Network error'));

      render(
        <DeleteWorkspaceModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          workspaceName="network-error-workspace"
        />
      );

      const deleteButton = screen.getByTestId(
        'confirm-delete-workspace-button'
      );
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalled();
      });

      // Should not crash the component
      expect(screen.getByText('Delete Workspace')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper modal structure', () => {
      render(
        <DeleteWorkspaceModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          workspaceName="test-workspace"
        />
      );

      // Modal should have proper title
      expect(screen.getByText('Delete Workspace')).toBeInTheDocument();

      // Should have confirmation text
      expect(
        screen.getByText(/Are you sure you want to delete workspace/)
      ).toBeInTheDocument();
    });

    it('has proper button roles', () => {
      render(
        <DeleteWorkspaceModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          workspaceName="test-workspace"
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const deleteButton = screen.getByRole('button', {
        name: /delete/i,
      });

      expect(cancelButton).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(
        <DeleteWorkspaceModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          workspaceName="test-workspace"
        />
      );

      const cancelButton = screen.getByTestId('cancel-delete-workspace-button');
      const deleteButton = screen.getByTestId(
        'confirm-delete-workspace-button'
      );

      // Buttons should be focusable
      expect(cancelButton).not.toHaveAttribute('disabled');
      expect(deleteButton).not.toHaveAttribute('disabled');

      // Should handle keyboard events
      fireEvent.keyDown(deleteButton, { key: 'Enter', code: 'Enter' });
      fireEvent.keyDown(cancelButton, { key: 'Escape', code: 'Escape' });
    });

    it('has proper confirmation message structure', () => {
      render(
        <DeleteWorkspaceModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          workspaceName="important-workspace"
        />
      );

      // Check that the workspace name is properly quoted in the message
      expect(
        screen.getByText(
          /Are you sure you want to delete workspace "important-workspace"?/
        )
      ).toBeInTheDocument();
    });
  });

  describe('Component Props', () => {
    it('accepts and uses onConfirm prop correctly', async () => {
      const customMockConfirm = vi.fn().mockResolvedValue(undefined);

      render(
        <DeleteWorkspaceModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={customMockConfirm}
          workspaceName="custom-workspace"
        />
      );

      const deleteButton = screen.getByTestId(
        'confirm-delete-workspace-button'
      );
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(customMockConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it('accepts and uses onClose prop correctly', () => {
      const customMockClose = vi.fn();

      render(
        <DeleteWorkspaceModal
          opened={true}
          onClose={customMockClose}
          onConfirm={mockOnConfirm}
          workspaceName="custom-workspace"
        />
      );

      const cancelButton = screen.getByTestId('cancel-delete-workspace-button');
      fireEvent.click(cancelButton);

      expect(customMockClose).toHaveBeenCalled();
    });

    it('handles function props correctly', () => {
      const testOnConfirm = vi.fn();
      const testOnClose = vi.fn();

      expect(() => {
        render(
          <DeleteWorkspaceModal
            opened={true}
            onClose={testOnClose}
            onConfirm={testOnConfirm}
            workspaceName="test-workspace"
          />
        );
      }).not.toThrow();

      expect(screen.getByText('Delete Workspace')).toBeInTheDocument();
    });

    it('handles different workspace name types correctly', () => {
      const workspaceNames = [
        'normal-workspace',
        'workspace with spaces',
        'workspace_with_underscores',
        'ワークスペース',
        '',
        undefined,
      ];

      workspaceNames.forEach((workspaceName) => {
        const { unmount } = render(
          <DeleteWorkspaceModal
            opened={true}
            onClose={mockOnClose}
            onConfirm={mockOnConfirm}
            workspaceName={workspaceName}
          />
        );

        expect(screen.getByText('Delete Workspace')).toBeInTheDocument();
        const displayName = workspaceName || '';
        expect(
          screen.getByText(
            `Are you sure you want to delete workspace "${displayName}"?`,
            { exact: false }
          )
        ).toBeInTheDocument();
        unmount();
      });
    });

    it('handles opened prop correctly', () => {
      const { rerender } = render(
        <DeleteWorkspaceModal
          opened={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          workspaceName="test-workspace"
        />
      );

      // Should not be visible when opened is false
      expect(screen.queryByText('Delete Workspace')).not.toBeInTheDocument();

      rerender(
        <TestWrapper>
          <DeleteWorkspaceModal
            opened={true}
            onClose={mockOnClose}
            onConfirm={mockOnConfirm}
            workspaceName="test-workspace"
          />
        </TestWrapper>
      );

      // Should be visible when opened is true
      expect(screen.getByText('Delete Workspace')).toBeInTheDocument();
    });
  });

  describe('User Interaction Flow', () => {
    it('completes full deletion confirmation flow successfully', async () => {
      render(
        <DeleteWorkspaceModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          workspaceName="flow-test-workspace"
        />
      );

      // 1. Modal opens and shows workspace information
      expect(screen.getByText('Delete Workspace')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Are you sure you want to delete workspace "flow-test-workspace"? This action cannot be undone and all files in this workspace will be permanently deleted.'
        )
      ).toBeInTheDocument();

      // 2. User clicks delete
      const deleteButton = screen.getByTestId(
        'confirm-delete-workspace-button'
      );
      fireEvent.click(deleteButton);

      // 3. Confirmation function is called
      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      });
    });

    it('allows user to cancel deletion', () => {
      render(
        <DeleteWorkspaceModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          workspaceName="cancel-test-workspace"
        />
      );

      // User clicks cancel instead of delete
      const cancelButton = screen.getByTestId('cancel-delete-workspace-button');
      fireEvent.click(cancelButton);

      // Should close modal without calling confirm function
      expect(mockOnConfirm).not.toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('handles multiple rapid clicks gracefully', () => {
      render(
        <DeleteWorkspaceModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          workspaceName="rapid-click-workspace"
        />
      );

      const deleteButton = screen.getByTestId(
        'confirm-delete-workspace-button'
      );

      // Rapidly click multiple times - should not crash
      fireEvent.click(deleteButton);
      fireEvent.click(deleteButton);
      fireEvent.click(deleteButton);

      // Verify component is still functional
      expect(screen.getByText('Delete Workspace')).toBeInTheDocument();
      expect(mockOnConfirm).toHaveBeenCalled();
    });
  });

  describe('Security Considerations', () => {
    it('clearly shows destructive action warning', () => {
      render(
        <DeleteWorkspaceModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          workspaceName="security-test-workspace"
        />
      );

      expect(
        screen.getByText(
          /This action cannot be undone and all files in this workspace will be permanently deleted/
        )
      ).toBeInTheDocument();
    });

    it('requires explicit confirmation', () => {
      render(
        <DeleteWorkspaceModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          workspaceName="confirmation-test-workspace"
        />
      );

      // Should show clear delete button
      const deleteButton = screen.getByTestId(
        'confirm-delete-workspace-button'
      );
      expect(deleteButton).toHaveTextContent('Delete');
    });

    it('displays workspace name for verification', () => {
      render(
        <DeleteWorkspaceModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          workspaceName="verification-workspace"
        />
      );

      // User should be able to verify they're deleting the right workspace
      expect(
        screen.getByText(/delete workspace "verification-workspace"/)
      ).toBeInTheDocument();
    });

    it('warns about file deletion consequences', () => {
      render(
        <DeleteWorkspaceModal
          opened={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          workspaceName="file-warning-workspace"
        />
      );

      // Should warn about files being deleted
      expect(
        screen.getByText(
          /all files in this workspace will be permanently deleted/
        )
      ).toBeInTheDocument();
    });
  });
});
