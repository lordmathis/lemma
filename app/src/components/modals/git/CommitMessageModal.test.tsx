import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render as rtlRender,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';
import CommitMessageModal from './CommitMessageModal';

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
  deleteFileModalVisible: false,
  setDeleteFileModalVisible: vi.fn(),
  commitMessageModalVisible: true,
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

describe('CommitMessageModal', () => {
  const mockOnCommitAndPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnCommitAndPush.mockResolvedValue(undefined);
    mockModalContext.setCommitMessageModalVisible.mockClear();
  });

  describe('Modal Rendering and Controls', () => {
    it('renders modal with form elements when open', () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      expect(screen.getByText('Enter Commit Message')).toBeInTheDocument();
      expect(screen.getByTestId('commit-message-input')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-commit-button')).toBeInTheDocument();
      expect(screen.getByTestId('commit-button')).toBeInTheDocument();
    });

    it('closes modal when cancel button is clicked', () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const cancelButton = screen.getByTestId('cancel-commit-button');
      fireEvent.click(cancelButton);

      expect(
        mockModalContext.setCommitMessageModalVisible
      ).toHaveBeenCalledWith(false);
    });
  });

  describe('Form Input and Validation', () => {
    it('updates input value when user types', () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const messageInput = screen.getByTestId('commit-message-input');
      fireEvent.change(messageInput, { target: { value: 'Add new feature' } });

      expect((messageInput as HTMLInputElement).value).toBe('Add new feature');
    });

    it('disables commit button when input is empty', () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const commitButton = screen.getByTestId('commit-button');
      expect(commitButton).toBeDisabled();
    });

    it('enables commit button when input has content', () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const messageInput = screen.getByTestId('commit-message-input');
      const commitButton = screen.getByTestId('commit-button');

      fireEvent.change(messageInput, { target: { value: 'Test commit' } });

      expect(commitButton).not.toBeDisabled();
    });

    it('trims whitespace from commit messages', async () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const messageInput = screen.getByTestId('commit-message-input');
      const commitButton = screen.getByTestId('commit-button');

      fireEvent.change(messageInput, {
        target: { value: '  Update README  ' },
      });
      fireEvent.click(commitButton);

      await waitFor(() => {
        expect(mockOnCommitAndPush).toHaveBeenCalledWith('Update README');
      });
    });
  });

  describe('Form Submission', () => {
    it('calls onCommitAndPush with message when commit button clicked', async () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const messageInput = screen.getByTestId('commit-message-input');
      const commitButton = screen.getByTestId('commit-button');

      fireEvent.change(messageInput, {
        target: { value: 'Fix bug in editor' },
      });
      fireEvent.click(commitButton);

      await waitFor(() => {
        expect(mockOnCommitAndPush).toHaveBeenCalledWith('Fix bug in editor');
      });
    });

    it('submits form when Enter key is pressed', async () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const messageInput = screen.getByTestId('commit-message-input');

      fireEvent.change(messageInput, { target: { value: 'Enter key commit' } });
      fireEvent.keyDown(messageInput, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(mockOnCommitAndPush).toHaveBeenCalledWith('Enter key commit');
      });
    });

    it('does not submit when Enter pressed with empty message', () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const messageInput = screen.getByTestId('commit-message-input');
      fireEvent.keyDown(messageInput, { key: 'Enter', code: 'Enter' });

      expect(mockOnCommitAndPush).not.toHaveBeenCalled();
    });

    it('closes modal and clears input after successful commit', async () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const messageInput = screen.getByTestId('commit-message-input');
      const commitButton = screen.getByTestId('commit-button');

      fireEvent.change(messageInput, { target: { value: 'Initial commit' } });
      fireEvent.click(commitButton);

      await waitFor(() => {
        expect(mockOnCommitAndPush).toHaveBeenCalledWith('Initial commit');
      });

      await waitFor(() => {
        expect(
          mockModalContext.setCommitMessageModalVisible
        ).toHaveBeenCalledWith(false);
        expect((messageInput as HTMLInputElement).value).toBe('');
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper form structure with labeled input', () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const messageInput = screen.getByTestId('commit-message-input');

      expect(messageInput).toHaveAttribute('type', 'text');
      expect(messageInput).toHaveAccessibleName();
      expect(messageInput).not.toHaveAttribute('disabled');
    });

    it('has accessible buttons with proper roles', () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const cancelButton = screen.getByTestId('cancel-commit-button');
      const commitButton = screen.getByTestId('commit-button');

      // Mantine buttons are semantic HTML buttons
      expect(cancelButton.tagName).toBe('BUTTON');
      expect(commitButton.tagName).toBe('BUTTON');
    });
  });
});
