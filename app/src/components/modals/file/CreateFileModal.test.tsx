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

// Mock useFileList hook
const mockLoadFileList = vi.fn();
const mockFiles = [
  {
    id: '1',
    name: 'docs',
    path: 'docs',
    children: [
      {
        id: '2',
        name: 'guides',
        path: 'docs/guides',
        children: [],
      },
    ],
  },
];

vi.mock('../../../hooks/useFileList', () => ({
  useFileList: () => ({
    files: mockFiles,
    loadFileList: mockLoadFileList,
  }),
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
    mockOnCreateFile.mockReset();
    mockOnCreateFile.mockResolvedValue(undefined);
    mockModalContext.setNewFileModalVisible.mockClear();
    mockLoadFileList.mockClear();
    mockLoadFileList.mockResolvedValue(undefined);
  });

  describe('Modal Visibility and Content', () => {
    it('renders modal with correct content when opened', () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      expect(screen.getByText('Create New File')).toBeInTheDocument();
      expect(screen.getByTestId('file-name-input')).toBeInTheDocument();
      expect(
        screen.getByTestId('cancel-create-file-button')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('confirm-create-file-button')
      ).toBeInTheDocument();
    });
  });

  describe('User Actions', () => {
    it('calls onClose when cancel button is clicked', () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      fireEvent.click(screen.getByTestId('cancel-create-file-button'));

      expect(mockModalContext.setNewFileModalVisible).toHaveBeenCalledWith(
        false
      );
    });

    it('updates file name input when typed', () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const fileNameInput = screen.getByTestId('file-name-input');
      fireEvent.change(fileNameInput, { target: { value: 'test-file.md' } });

      expect((fileNameInput as HTMLInputElement).value).toBe('test-file.md');
    });
  });

  describe('Form Validation', () => {
    it('has disabled create button when input is empty', () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const createButton = screen.getByTestId('confirm-create-file-button');
      expect(createButton).toBeDisabled();
    });

    it('enables create button when valid input is provided', () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const fileNameInput = screen.getByTestId('file-name-input');
      const createButton = screen.getByTestId('confirm-create-file-button');

      fireEvent.change(fileNameInput, { target: { value: 'test.md' } });

      expect(createButton).not.toBeDisabled();
    });
  });

  describe('File Creation Flow', () => {
    it('calls onCreateFile when confirmed with valid input', async () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const fileNameInput = screen.getByTestId('file-name-input');
      const createButton = screen.getByTestId('confirm-create-file-button');

      fireEvent.change(fileNameInput, { target: { value: 'new-document.md' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnCreateFile).toHaveBeenCalledWith('new-document.md');
      });

      await waitFor(() => {
        expect(mockModalContext.setNewFileModalVisible).toHaveBeenCalledWith(
          false
        );
        expect((fileNameInput as HTMLInputElement).value).toBe('');
      });
    });

    it('creates file via Enter key press', async () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const fileNameInput = screen.getByTestId('file-name-input');

      fireEvent.change(fileNameInput, { target: { value: 'enter-test.md' } });
      fireEvent.keyDown(fileNameInput, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(mockOnCreateFile).toHaveBeenCalledWith('enter-test.md');
      });
    });

    it('trims whitespace from file names', async () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const fileNameInput = screen.getByTestId('file-name-input');
      const createButton = screen.getByTestId('confirm-create-file-button');

      fireEvent.change(fileNameInput, {
        target: { value: '  spaced-file.md  ' },
      });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnCreateFile).toHaveBeenCalledWith('spaced-file.md');
      });
    });

    it('does not submit when input is empty', () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const fileNameInput = screen.getByTestId('file-name-input');
      fireEvent.keyDown(fileNameInput, { key: 'Enter', code: 'Enter' });

      expect(mockOnCreateFile).not.toHaveBeenCalled();
    });

    it('does not submit when input contains only whitespace', () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const fileNameInput = screen.getByTestId('file-name-input');
      const createButton = screen.getByTestId('confirm-create-file-button');

      fireEvent.change(fileNameInput, { target: { value: '   ' } });

      expect(createButton).toBeDisabled();
      expect(mockOnCreateFile).not.toHaveBeenCalled();
    });
  });

  describe('File Name Variations', () => {
    it.each([
      ['file-with_special.chars (1).md', 'special characters'],
      ['README', 'no extension'],
      ['ファイル名.md', 'unicode characters'],
      ['a'.repeat(100) + '.md', 'long file names'],
    ])('handles %s (%s)', async (fileName, _description) => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const fileNameInput = screen.getByTestId('file-name-input');
      const createButton = screen.getByTestId('confirm-create-file-button');

      fireEvent.change(fileNameInput, { target: { value: fileName } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnCreateFile).toHaveBeenCalledWith(fileName);
      });
    });
  });

  describe('Accessibility', () => {
    it('provides proper keyboard navigation and accessibility features', () => {
      render(<CreateFileModal onCreateFile={mockOnCreateFile} />);

      const fileNameInput = screen.getByTestId('file-name-input');

      // Input should be focusable and accessible
      expect(fileNameInput).not.toHaveAttribute('disabled');
      expect(fileNameInput).not.toHaveAttribute('readonly');
      expect(fileNameInput).toHaveAttribute('type', 'text');
      expect(fileNameInput).toHaveAccessibleName();

      // Buttons should have proper roles
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const createButton = screen.getByRole('button', { name: /create/i });

      expect(cancelButton).toBeInTheDocument();
      expect(createButton).toBeInTheDocument();
    });
  });
});
