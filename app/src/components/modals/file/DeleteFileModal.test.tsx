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
    mockOnDeleteFile.mockReset();
    mockOnDeleteFile.mockResolvedValue(undefined);
    mockModalContext.setDeleteFileModalVisible.mockClear();
  });

  describe('Basic functionality', () => {
    it('renders modal with file confirmation and action buttons', () => {
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
      expect(screen.getByTestId('cancel-delete-button')).toBeInTheDocument();
      expect(screen.getByTestId('confirm-delete-button')).toBeInTheDocument();
    });

    it('renders modal with null file selection', () => {
      render(
        <DeleteFileModal onDeleteFile={mockOnDeleteFile} selectedFile={null} />
      );

      expect(screen.getByText('Delete File')).toBeInTheDocument();
      expect(
        screen.getByText(/Are you sure you want to delete/)
      ).toBeInTheDocument();
    });

    it('closes modal when cancel button is clicked', () => {
      render(
        <DeleteFileModal
          onDeleteFile={mockOnDeleteFile}
          selectedFile="test.md"
        />
      );

      fireEvent.click(screen.getByTestId('cancel-delete-button'));

      expect(mockModalContext.setDeleteFileModalVisible).toHaveBeenCalledWith(
        false
      );
    });
  });

  describe('File deletion flow', () => {
    it('deletes file successfully when confirmed', async () => {
      render(
        <DeleteFileModal
          onDeleteFile={mockOnDeleteFile}
          selectedFile="document.md"
        />
      );

      fireEvent.click(screen.getByTestId('confirm-delete-button'));

      await waitFor(() => {
        expect(mockOnDeleteFile).toHaveBeenCalledWith('document.md');
      });

      await waitFor(() => {
        expect(mockModalContext.setDeleteFileModalVisible).toHaveBeenCalledWith(
          false
        );
      });
    });

    it('does not delete when no file is selected', () => {
      render(
        <DeleteFileModal onDeleteFile={mockOnDeleteFile} selectedFile={null} />
      );

      fireEvent.click(screen.getByTestId('confirm-delete-button'));

      expect(mockOnDeleteFile).not.toHaveBeenCalled();
    });

    it('does not delete when selectedFile is empty string', () => {
      render(
        <DeleteFileModal onDeleteFile={mockOnDeleteFile} selectedFile="" />
      );

      fireEvent.click(screen.getByTestId('confirm-delete-button'));

      expect(mockOnDeleteFile).not.toHaveBeenCalled();
    });

    it('allows user to cancel deletion', () => {
      render(
        <DeleteFileModal
          onDeleteFile={mockOnDeleteFile}
          selectedFile="cancel-test.md"
        />
      );

      fireEvent.click(screen.getByTestId('cancel-delete-button'));

      expect(mockOnDeleteFile).not.toHaveBeenCalled();
      expect(mockModalContext.setDeleteFileModalVisible).toHaveBeenCalledWith(
        false
      );
    });
  });

  describe('File name variations', () => {
    it.each([
      ['file-with_special.chars (1).md', 'special characters'],
      ['ファイル名.md', 'unicode characters'],
      ['folder/subfolder/deep-file.md', 'nested path'],
      ['README', 'no extension'],
      ['a'.repeat(100) + '.md', 'long file name'],
    ])('handles %s (%s)', async (fileName, _description) => {
      render(
        <DeleteFileModal
          onDeleteFile={mockOnDeleteFile}
          selectedFile={fileName}
        />
      );

      expect(
        screen.getByText(`Are you sure you want to delete "${fileName}"?`)
      ).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('confirm-delete-button'));

      await waitFor(() => {
        expect(mockOnDeleteFile).toHaveBeenCalledWith(fileName);
      });
    });
  });

  describe('Accessibility', () => {
    it('provides proper modal structure and button accessibility', () => {
      render(
        <DeleteFileModal
          onDeleteFile={mockOnDeleteFile}
          selectedFile="test.md"
        />
      );

      // Modal structure
      expect(screen.getByText('Delete File')).toBeInTheDocument();
      expect(
        screen.getByText(/Are you sure you want to delete "test.md"?/)
      ).toBeInTheDocument();

      // Button accessibility
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const deleteButton = screen.getByRole('button', { name: /delete/i });

      expect(cancelButton).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();
      expect(cancelButton).not.toHaveAttribute('disabled');
      expect(deleteButton).not.toHaveAttribute('disabled');
    });
  });
});
