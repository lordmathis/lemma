import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render as rtlRender,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';
import DeleteFileModal from './DeleteFileModal';

// Mock notifications
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

// Mock ModalContext with modal always open
const mockModalContext = {
  newFileModalVisible: false,
  setNewFileModalVisible: vi.fn(),
  deleteFileModalVisible: true,
  setDeleteFileModalVisible: vi.fn(),
  commitMessageModalVisible: false,
  setCommitMessageModalVisible: vi.fn(),
  settingsModalVisible: false,
  setSettingsModalVisible: vi.fn(),
  switchWorkspaceModalVisible: false,
  setSwitchWorkspaceModalVisible: vi.fn(),
  createWorkspaceModalVisible: false,
  setCreateWorkspaceModalVisible: vi.fn(),
};

vi.mock('../../../contexts/ModalContext', () => ({
  useModalContext: () => mockModalContext,
}));

// Helper wrapper component for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider defaultColorScheme="light">{children}</MantineProvider>
);

// Custom render function
const render = (ui: React.ReactElement) => {
  return rtlRender(ui, { wrapper: TestWrapper });
};

describe('DeleteFileModal', () => {
  const mockOnDeleteFile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnDeleteFile.mockResolvedValue(undefined);

    // Reset modal context mocks
    mockModalContext.setDeleteFileModalVisible.mockClear();
  });

  describe('Modal Visibility', () => {
    it('renders modal when open with file selected', () => {
      render(
        <DeleteFileModal
          onDeleteFile={mockOnDeleteFile}
          selectedFile="test-file.md"
        />
      );

      expect(screen.getByText('Delete File')).toBeInTheDocument();
      expect(
        screen.getByText(/Are you sure you want to delete "test-file.md"?/)
      ).toBeInTheDocument();
      const cancelButton = screen.getByTestId('cancel-delete-button');
      const deleteButton = screen.getByTestId('confirm-delete-button');

      expect(cancelButton).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();

      expect(cancelButton).toHaveTextContent('Cancel');
      expect(deleteButton).toHaveTextContent('Delete');

      expect(cancelButton).toHaveRole('button');
      expect(deleteButton).toHaveRole('button');
    });

    it('renders modal when open with no file selected', () => {
      render(
        <DeleteFileModal onDeleteFile={mockOnDeleteFile} selectedFile={null} />
      );

      expect(screen.getByText('Delete File')).toBeInTheDocument();
      // Should still render the confirmation text with null file
      expect(
        screen.getByText(/Are you sure you want to delete/)
      ).toBeInTheDocument();
    });

    it('calls setDeleteFileModalVisible when modal is closed', () => {
      render(
        <DeleteFileModal
          onDeleteFile={mockOnDeleteFile}
          selectedFile="test.md"
        />
      );

      const cancelButton = screen.getByTestId('cancel-delete-button');
      fireEvent.click(cancelButton);

      expect(mockModalContext.setDeleteFileModalVisible).toHaveBeenCalledWith(
        false
      );
    });
  });

  describe('File Deletion', () => {
    it('handles file deletion with valid file', async () => {
      render(
        <DeleteFileModal
          onDeleteFile={mockOnDeleteFile}
          selectedFile="document.md"
        />
      );

      const deleteButton = screen.getByTestId('confirm-delete-button');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnDeleteFile).toHaveBeenCalledWith('document.md');
      });
    });

    it('does not call onDeleteFile when no file is selected', () => {
      render(
        <DeleteFileModal onDeleteFile={mockOnDeleteFile} selectedFile={null} />
      );

      const deleteButton = screen.getByTestId('confirm-delete-button');
      fireEvent.click(deleteButton);

      // Should not call the function when no file is selected
      expect(mockOnDeleteFile).not.toHaveBeenCalled();
    });

    it('closes modal after successful file deletion', async () => {
      render(
        <DeleteFileModal
          onDeleteFile={mockOnDeleteFile}
          selectedFile="test.md"
        />
      );

      const deleteButton = screen.getByTestId('confirm-delete-button');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnDeleteFile).toHaveBeenCalledWith('test.md');
      });

      await waitFor(() => {
        expect(mockModalContext.setDeleteFileModalVisible).toHaveBeenCalledWith(
          false
        );
      });
    });

    it('handles deletion of files with special characters', async () => {
      const specialFileName = 'file-with_special.chars (1).md';
      render(
        <DeleteFileModal
          onDeleteFile={mockOnDeleteFile}
          selectedFile={specialFileName}
        />
      );

      expect(
        screen.getByText(
          `Are you sure you want to delete "${specialFileName}"?`
        )
      ).toBeInTheDocument();

      const deleteButton = screen.getByTestId('confirm-delete-button');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnDeleteFile).toHaveBeenCalledWith(specialFileName);
      });
    });

    it('handles deletion of files with unicode characters', async () => {
      const unicodeFileName = 'ファイル名.md';
      render(
        <DeleteFileModal
          onDeleteFile={mockOnDeleteFile}
          selectedFile={unicodeFileName}
        />
      );

      expect(
        screen.getByText(
          `Are you sure you want to delete "${unicodeFileName}"?`
        )
      ).toBeInTheDocument();

      const deleteButton = screen.getByTestId('confirm-delete-button');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnDeleteFile).toHaveBeenCalledWith(unicodeFileName);
      });
    });

    it('handles very long file names', async () => {
      const longFileName = 'a'.repeat(100) + '.md';
      render(
        <DeleteFileModal
          onDeleteFile={mockOnDeleteFile}
          selectedFile={longFileName}
        />
      );

      const deleteButton = screen.getByTestId('confirm-delete-button');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnDeleteFile).toHaveBeenCalledWith(longFileName);
      });
    });
  });

  describe('Modal Actions', () => {
    it('has cancel and delete buttons', () => {
      render(
        <DeleteFileModal
          onDeleteFile={mockOnDeleteFile}
          selectedFile="test.md"
        />
      );

      const cancelButton = screen.getByTestId('cancel-delete-button');
      const deleteButton = screen.getByTestId('confirm-delete-button');

      expect(cancelButton).toHaveRole('button');
      expect(deleteButton).toHaveRole('button');
    });

    it('closes modal when cancel button is clicked', () => {
      render(
        <DeleteFileModal
          onDeleteFile={mockOnDeleteFile}
          selectedFile="test.md"
        />
      );

      const cancelButton = screen.getByTestId('cancel-delete-button');
      fireEvent.click(cancelButton);

      expect(mockModalContext.setDeleteFileModalVisible).toHaveBeenCalledWith(
        false
      );
    });
  });

  describe('Error Handling', () => {
    it('handles deletion errors gracefully', async () => {
      mockOnDeleteFile.mockRejectedValue(new Error('File deletion failed'));

      render(
        <DeleteFileModal
          onDeleteFile={mockOnDeleteFile}
          selectedFile="test.md"
        />
      );

      const deleteButton = screen.getByTestId('confirm-delete-button');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnDeleteFile).toHaveBeenCalledWith('test.md');
      });

      // Modal should handle the error gracefully (not crash)
      expect(screen.getByText('Delete File')).toBeInTheDocument();
    });

    it('does not close modal when deletion fails', async () => {
      mockOnDeleteFile.mockRejectedValue(new Error('File deletion failed'));

      render(
        <DeleteFileModal
          onDeleteFile={mockOnDeleteFile}
          selectedFile="test.md"
        />
      );

      const deleteButton = screen.getByTestId('confirm-delete-button');

      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnDeleteFile).toHaveBeenCalledWith('test.md');
      });

      // Modal should remain open when deletion fails
      expect(
        mockModalContext.setDeleteFileModalVisible
      ).not.toHaveBeenCalledWith(false);
    });
  });

  describe('Accessibility', () => {
    it('has proper modal structure', () => {
      render(
        <DeleteFileModal
          onDeleteFile={mockOnDeleteFile}
          selectedFile="test.md"
        />
      );

      // Modal should have proper title
      expect(screen.getByText('Delete File')).toBeInTheDocument();

      // Should have confirmation text
      expect(
        screen.getByText(/Are you sure you want to delete/)
      ).toBeInTheDocument();
    });

    it('has proper button roles', () => {
      render(
        <DeleteFileModal
          onDeleteFile={mockOnDeleteFile}
          selectedFile="test.md"
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2); // Cancel and Delete buttons

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const deleteButton = screen.getByRole('button', { name: /delete/i });

      expect(cancelButton).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();
    });

    it('has proper confirmation message structure', () => {
      render(
        <DeleteFileModal
          onDeleteFile={mockOnDeleteFile}
          selectedFile="important-file.md"
        />
      );

      // Check that the file name is properly quoted in the message
      expect(
        screen.getByText(/Are you sure you want to delete "important-file.md"?/)
      ).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(
        <DeleteFileModal
          onDeleteFile={mockOnDeleteFile}
          selectedFile="test.md"
        />
      );

      const cancelButton = screen.getByTestId('cancel-delete-button');
      const deleteButton = screen.getByTestId('confirm-delete-button');

      // Buttons should be focusable
      expect(cancelButton).not.toHaveAttribute('disabled');
      expect(deleteButton).not.toHaveAttribute('disabled');

      // Should handle keyboard events
      fireEvent.keyDown(deleteButton, { key: 'Enter', code: 'Enter' });
      fireEvent.keyDown(cancelButton, { key: 'Escape', code: 'Escape' });
    });
  });

  describe('Component Props', () => {
    it('accepts and uses onDeleteFile prop correctly', async () => {
      const customMockDelete = vi.fn().mockResolvedValue(undefined);

      render(
        <DeleteFileModal
          onDeleteFile={customMockDelete}
          selectedFile="custom-test.md"
        />
      );

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(customMockDelete).toHaveBeenCalledWith('custom-test.md');
      });
    });

    it('handles different selectedFile prop values', () => {
      const testCases = [
        'simple.md',
        'folder/nested.md',
        'file with spaces.md',
        'UPPERCASE.MD',
        null,
      ];

      testCases.forEach((fileName) => {
        const { unmount } = render(
          <DeleteFileModal
            onDeleteFile={mockOnDeleteFile}
            selectedFile={fileName}
          />
        );

        expect(screen.getByText('Delete File')).toBeInTheDocument();
        unmount();
      });
    });

    it('handles function prop correctly', () => {
      const testFunction = vi.fn();

      expect(() => {
        render(
          <DeleteFileModal onDeleteFile={testFunction} selectedFile="test.md" />
        );
      }).not.toThrow();

      expect(screen.getByText('Delete File')).toBeInTheDocument();
    });
  });

  describe('File Path Edge Cases', () => {
    it('handles file paths with folders', async () => {
      const nestedFilePath = 'folder/subfolder/deep-file.md';
      render(
        <DeleteFileModal
          onDeleteFile={mockOnDeleteFile}
          selectedFile={nestedFilePath}
        />
      );

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnDeleteFile).toHaveBeenCalledWith(nestedFilePath);
      });
    });

    it('handles files without extensions', async () => {
      render(
        <DeleteFileModal
          onDeleteFile={mockOnDeleteFile}
          selectedFile="README"
        />
      );

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockOnDeleteFile).toHaveBeenCalledWith('README');
      });
    });

    it('handles empty string as selectedFile', () => {
      render(
        <DeleteFileModal onDeleteFile={mockOnDeleteFile} selectedFile="" />
      );

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      // Should not call the function with empty string
      expect(mockOnDeleteFile).not.toHaveBeenCalled();
    });
  });

  describe('User Interaction Flow', () => {
    it('completes full deletion flow successfully', async () => {
      render(
        <DeleteFileModal
          onDeleteFile={mockOnDeleteFile}
          selectedFile="complete-test.md"
        />
      );

      // 1. Modal opens and shows file name
      expect(
        screen.getByText('Are you sure you want to delete "complete-test.md"?')
      ).toBeInTheDocument();

      // 2. User clicks delete
      const deleteButton = screen.getByTestId('confirm-delete-button');
      fireEvent.click(deleteButton);

      // 3. Deletion function is called
      await waitFor(() => {
        expect(mockOnDeleteFile).toHaveBeenCalledWith('complete-test.md');
      });

      // 4. Modal closes
      await waitFor(() => {
        expect(mockModalContext.setDeleteFileModalVisible).toHaveBeenCalledWith(
          false
        );
      });
    });

    it('allows user to cancel deletion', () => {
      render(
        <DeleteFileModal
          onDeleteFile={mockOnDeleteFile}
          selectedFile="cancel-test.md"
        />
      );

      // User clicks cancel instead of delete
      const cancelButton = screen.getByTestId('cancel-delete-button');
      fireEvent.click(cancelButton);

      // Should close modal without calling delete function
      expect(mockOnDeleteFile).not.toHaveBeenCalled();
      expect(mockModalContext.setDeleteFileModalVisible).toHaveBeenCalledWith(
        false
      );
    });
  });
});
