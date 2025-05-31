import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render as rtlRender,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';
import CreateFileModal from './CreateFileModal';

// Mock notifications
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

// Mock ModalContext with modal always open
const mockModalContext = {
  newFileModalVisible: true,
  setNewFileModalVisible: vi.fn(),
  deleteFileModalVisible: false,
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

describe('CreateFileModal', () => {
  const mockOnCreateFile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnCreateFile.mockResolvedValue(undefined);

    // Reset modal context mocks
    mockModalContext.setNewFileModalVisible.mockClear();
  });

  describe('Modal Visibility', () => {
    it('renders modal when open', () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      expect(screen.getByText('Create New File')).toBeInTheDocument();
      expect(screen.getByTestId('file-name-input')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-create-button')).toBeInTheDocument();
      expect(screen.getByTestId('confirm-create-button')).toBeInTheDocument();
    });

    it('calls setNewFileModalVisible when modal is closed', () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const cancelButton = screen.getByTestId('cancel-create-button');
      fireEvent.click(cancelButton);

      expect(mockModalContext.setNewFileModalVisible).toHaveBeenCalledWith(
        false
      );
    });
  });

  describe('Form Interaction', () => {
    it('updates file name input when typed', () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const fileNameInput = screen.getByTestId('file-name-input');
      fireEvent.change(fileNameInput, { target: { value: 'test-file.md' } });

      expect((fileNameInput as HTMLInputElement).value).toBe('test-file.md');
    });

    it('handles form submission with valid file name', async () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const fileNameInput = screen.getByTestId('file-name-input');
      const createButton = screen.getByTestId('confirm-create-button');

      fireEvent.change(fileNameInput, { target: { value: 'new-document.md' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnCreateFile).toHaveBeenCalledWith('new-document.md');
      });
    });

    it('prevents submission with empty file name', () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const createButton = screen.getByTestId('confirm-create-button');
      fireEvent.click(createButton);

      // Should not call the function with empty name
      expect(mockOnCreateFile).not.toHaveBeenCalled();
    });

    it('closes modal after successful file creation', async () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const fileNameInput = screen.getByTestId('file-name-input');
      const createButton = screen.getByTestId('confirm-create-button');

      fireEvent.change(fileNameInput, { target: { value: 'test.md' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnCreateFile).toHaveBeenCalledWith('test.md');
      });

      await waitFor(() => {
        expect(mockModalContext.setNewFileModalVisible).toHaveBeenCalledWith(
          false
        );
      });
    });

    it('clears input after successful submission', async () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const fileNameInput = screen.getByTestId('file-name-input');
      const createButton = screen.getByTestId('confirm-create-button');

      fireEvent.change(fileNameInput, { target: { value: 'test.md' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnCreateFile).toHaveBeenCalledWith('test.md');
      });

      await waitFor(() => {
        expect((fileNameInput as HTMLInputElement).value).toBe('');
      });
    });
  });

  describe('Modal Actions', () => {
    it('has cancel and create buttons', () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const confirmButton = screen.getByTestId('confirm-create-button');
      const cancelButton = screen.getByTestId('cancel-create-button');

      expect(confirmButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();

      expect(confirmButton).toHaveRole('button');
      expect(cancelButton).toHaveRole('button');
    });

    it('closes modal when cancel button is clicked', () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const cancelButton = screen.getByTestId('cancel-create-button');
      fireEvent.click(cancelButton);

      expect(mockModalContext.setNewFileModalVisible).toHaveBeenCalledWith(
        false
      );
    });

    it('calls onCreateFile when create button is clicked with valid input', async () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const fileNameInput = screen.getByTestId('file-name-input');
      const createButton = screen.getByTestId('confirm-create-button');

      fireEvent.change(fileNameInput, { target: { value: 'test.md' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnCreateFile).toHaveBeenCalledTimes(1);
        expect(mockOnCreateFile).toHaveBeenCalledWith('test.md');
      });
    });
  });

  describe('File Name Validation', () => {
    it('handles special characters in file names', async () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const fileNameInput = screen.getByTestId('file-name-input');
      const createButton = screen.getByTestId('confirm-create-button');

      const specialFileName = 'file-with_special.chars (1).md';
      fireEvent.change(fileNameInput, { target: { value: specialFileName } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnCreateFile).toHaveBeenCalledWith(specialFileName);
      });
    });

    it('handles long file names', async () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const fileNameInput = screen.getByTestId('file-name-input');
      const createButton = screen.getByTestId('confirm-create-button');

      const longFileName = 'a'.repeat(100) + '.md';
      fireEvent.change(fileNameInput, { target: { value: longFileName } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnCreateFile).toHaveBeenCalledWith(longFileName);
      });
    });

    it('handles file names without extensions', async () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const fileNameInput = screen.getByTestId('file-name-input');
      const createButton = screen.getByTestId('confirm-create-button');

      fireEvent.change(fileNameInput, { target: { value: 'README' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnCreateFile).toHaveBeenCalledWith('README');
      });
    });

    it('handles unicode characters in file names', async () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const fileNameInput = screen.getByTestId('file-name-input');
      const createButton = screen.getByTestId('confirm-create-button');

      const unicodeFileName = 'ファイル名.md';
      fireEvent.change(fileNameInput, { target: { value: unicodeFileName } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnCreateFile).toHaveBeenCalledWith(unicodeFileName);
      });
    });

    it('trims whitespace from file names', async () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const fileNameInput = screen.getByTestId('file-name-input');
      const createButton = screen.getByTestId('confirm-create-button');

      fireEvent.change(fileNameInput, {
        target: { value: '  spaced-file.md  ' },
      });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnCreateFile).toHaveBeenCalledWith('spaced-file.md');
      });
    });
  });

  describe('Error Handling', () => {
    it('handles creation errors gracefully', async () => {
      mockOnCreateFile.mockRejectedValue(new Error('File creation failed'));

      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const fileNameInput = screen.getByTestId('file-name-input');
      const createButton = screen.getByTestId('confirm-create-button');

      fireEvent.change(fileNameInput, { target: { value: 'test.md' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnCreateFile).toHaveBeenCalledWith('test.md');
      });

      // Modal should handle the error gracefully (not crash)
      expect(screen.getByText('Create New File')).toBeInTheDocument();
    });

    it('does not close modal when creation fails', async () => {
      mockOnCreateFile.mockRejectedValue(new Error('File creation failed'));

      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const fileNameInput = screen.getByTestId('file-name-input');
      const createButton = screen.getByTestId('confirm-create-button');

      fireEvent.change(fileNameInput, { target: { value: 'test.md' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnCreateFile).toHaveBeenCalledWith('test.md');
      });

      // Modal should remain open when creation fails
      expect(mockModalContext.setNewFileModalVisible).not.toHaveBeenCalledWith(
        false
      );
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and structure', () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const fileNameInput = screen.getByTestId('file-name-input');
      expect(fileNameInput).toBeInTheDocument();
      expect(fileNameInput.tagName).toBe('INPUT');
      expect(fileNameInput).toHaveAttribute('type', 'text');
    });

    it('has proper button roles', () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2); // Cancel and Create buttons

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const createButton = screen.getByRole('button', { name: /create/i });

      expect(cancelButton).toBeInTheDocument();
      expect(createButton).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const fileNameInput = screen.getByTestId('file-name-input');

      // Check that the input is focusable (not disabled or readonly)
      expect(fileNameInput).not.toHaveAttribute('disabled');
      expect(fileNameInput).not.toHaveAttribute('readonly');

      // Check that the input can receive keyboard events (more reliable than focus)
      fireEvent.keyDown(fileNameInput, { key: 'a' });
      fireEvent.change(fileNameInput, { target: { value: 'test' } });

      expect((fileNameInput as HTMLInputElement).value).toBe('test');

      // Verify the input is accessible via keyboard navigation
      expect(fileNameInput).toHaveAttribute('type', 'text');
      expect(fileNameInput).toHaveAccessibleName(); // Has proper label
    });

    it('has proper modal structure', () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      // Modal should have proper title
      expect(screen.getByText('Create New File')).toBeInTheDocument();

      // Should have form elements
      expect(screen.getByTestId('file-name-input')).toBeInTheDocument();
    });
  });

  describe('Component Props', () => {
    it('accepts and uses onCreateFile prop correctly', async () => {
      const customMockCreate = vi.fn().mockResolvedValue(undefined);

      render(<CreateFileModal onCreateFile={customMockCreate} />);

      const fileNameInput = screen.getByTestId('file-name-input');
      const createButton = screen.getByTestId('confirm-create-button');

      fireEvent.change(fileNameInput, { target: { value: 'custom-test.md' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(customMockCreate).toHaveBeenCalledWith('custom-test.md');
      });
    });

    it('handles function prop correctly', () => {
      const testFunction = vi.fn();

      expect(() => {
        render(<CreateFileModal onCreateFile={testFunction} />);
      }).not.toThrow();

      expect(screen.getByText('Create New File')).toBeInTheDocument();
    });
  });

  describe('Form Submission Edge Cases', () => {
    it('submits form via Enter key', async () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const fileNameInput = screen.getByTestId('file-name-input');

      fireEvent.change(fileNameInput, { target: { value: 'enter-test.md' } });
      fireEvent.keyDown(fileNameInput, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(mockOnCreateFile).toHaveBeenCalledWith('enter-test.md');
      });
    });

    it('does not submit empty form via Enter key', () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const fileNameInput = screen.getByTestId('file-name-input');
      fireEvent.keyDown(fileNameInput, { key: 'Enter', code: 'Enter' });

      // Should not call the function
      expect(mockOnCreateFile).not.toHaveBeenCalled();
    });
  });
});
