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
  });

  describe('Modal Visibility and Content', () => {
    it('renders modal with correct content when opened', () => {
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
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /delete/i })
      ).toBeInTheDocument();
    });

    it('does not render when closed', () => {
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

    it('toggles visibility correctly when opened prop changes', () => {
      const { rerender } = render(
        <DeleteWorkspaceModal
          opened={false}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          workspaceName="test-workspace"
        />
      );

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

      expect(screen.getByText('Delete Workspace')).toBeInTheDocument();
    });
  });

  describe('Workspace Name Display', () => {
    it('displays various workspace name formats correctly', () => {
      const testCases = [
        'simple',
        'workspace-with-dashes',
        'workspace_with_underscores',
        'workspace with spaces',
        'workspace"with@quotes',
        'ワークスペース', // Unicode
        '', // Empty string
        undefined, // Undefined
      ];

      testCases.forEach((workspaceName) => {
        const { unmount } = render(
          <DeleteWorkspaceModal
            opened={true}
            onClose={mockOnClose}
            onConfirm={mockOnConfirm}
            workspaceName={workspaceName}
          />
        );

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
  });

  describe('User Actions', () => {
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
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('handles multiple rapid clicks gracefully', async () => {
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

      // Rapidly click multiple times
      fireEvent.click(deleteButton);
      fireEvent.click(deleteButton);
      fireEvent.click(deleteButton);

      // Component should remain stable
      expect(screen.getByText('Delete Workspace')).toBeInTheDocument();
      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles deletion errors gracefully without crashing', async () => {
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

      // Component should remain stable after error
      expect(screen.getByText('Delete Workspace')).toBeInTheDocument();
    });
  });
});
