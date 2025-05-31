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

    // Reset modal context mocks
    mockModalContext.setCommitMessageModalVisible.mockClear();
  });

  describe('Modal Visibility', () => {
    it('renders modal when open', () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      expect(screen.getByText('Enter Commit Message')).toBeInTheDocument();
      expect(screen.getByTestId('commit-message-input')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-commit-button')).toBeInTheDocument();
      expect(screen.getByTestId('commit-button')).toBeInTheDocument();
    });

    it('calls setCommitMessageModalVisible when modal is closed', () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(
        mockModalContext.setCommitMessageModalVisible
      ).toHaveBeenCalledWith(false);
    });
  });

  describe('Form Interaction', () => {
    it('updates commit message input when typed', () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const messageInput = screen.getByTestId('commit-message-input');
      fireEvent.change(messageInput, { target: { value: 'Add new feature' } });

      expect((messageInput as HTMLInputElement).value).toBe('Add new feature');
    });

    it('handles form submission with valid commit message', async () => {
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

    it('prevents submission with empty commit message', () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const commitButton = screen.getByTestId('commit-button');
      fireEvent.click(commitButton);

      // Should not call the function with empty message
      expect(mockOnCommitAndPush).not.toHaveBeenCalled();
    });

    it('closes modal after successful commit', async () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const messageInput = screen.getByTestId('commit-message-input');
      const commitButton = screen.getByTestId('commit-button');

      fireEvent.change(messageInput, {
        target: { value: 'Update documentation' },
      });
      fireEvent.click(commitButton);

      await waitFor(() => {
        expect(mockOnCommitAndPush).toHaveBeenCalledWith(
          'Update documentation'
        );
      });

      await waitFor(() => {
        expect(
          mockModalContext.setCommitMessageModalVisible
        ).toHaveBeenCalledWith(false);
      });
    });

    it('clears input after successful submission', async () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const messageInput = screen.getByTestId('commit-message-input');
      const commitButton = screen.getByTestId('commit-button');

      fireEvent.change(messageInput, { target: { value: 'Initial commit' } });
      fireEvent.click(commitButton);

      await waitFor(() => {
        expect(mockOnCommitAndPush).toHaveBeenCalledWith('Initial commit');
      });

      await waitFor(() => {
        expect((messageInput as HTMLInputElement).value).toBe('');
      });
    });
  });

  describe('Modal Actions', () => {
    it('has cancel and commit buttons', () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const commitButton = screen.getByTestId('commit-button');
      expect(commitButton).toHaveRole('button');

      const cancelButton = screen.getByTestId('cancel-commit-button');
      expect(cancelButton).toHaveRole('button');
    });

    it('closes modal when cancel button is clicked', () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const cancelButton = screen.getByTestId('cancel-commit-button');
      fireEvent.click(cancelButton);

      expect(
        mockModalContext.setCommitMessageModalVisible
      ).toHaveBeenCalledWith(false);
    });

    it('calls onCommitAndPush when commit button is clicked with valid input', async () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const messageInput = screen.getByTestId('commit-message-input');
      const commitButton = screen.getByTestId('commit-button');

      fireEvent.change(messageInput, {
        target: { value: 'Refactor components' },
      });
      fireEvent.click(commitButton);

      await waitFor(() => {
        expect(mockOnCommitAndPush).toHaveBeenCalledTimes(1);
        expect(mockOnCommitAndPush).toHaveBeenCalledWith('Refactor components');
      });
    });
  });

  describe('Commit Message Validation', () => {
    it('handles short commit messages', async () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const messageInput = screen.getByTestId('commit-message-input');
      const commitButton = screen.getByTestId('commit-button');

      fireEvent.change(messageInput, { target: { value: 'Fix' } });
      fireEvent.click(commitButton);

      await waitFor(() => {
        expect(mockOnCommitAndPush).toHaveBeenCalledWith('Fix');
      });
    });

    it('handles long commit messages', async () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const messageInput = screen.getByTestId('commit-message-input');
      const commitButton = screen.getByTestId('commit-button');

      const longMessage =
        'This is a very long commit message that describes all the changes made in great detail including what was changed, why it was changed, and how it affects the overall system architecture';
      fireEvent.change(messageInput, { target: { value: longMessage } });
      fireEvent.click(commitButton);

      await waitFor(() => {
        expect(mockOnCommitAndPush).toHaveBeenCalledWith(longMessage);
      });
    });

    it('handles commit messages with special characters', async () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const messageInput = screen.getByTestId('commit-message-input');
      const commitButton = screen.getByTestId('commit-button');

      const specialMessage = 'Fix: issue #123 - handle "quotes" & symbols!';
      fireEvent.change(messageInput, { target: { value: specialMessage } });
      fireEvent.click(commitButton);

      await waitFor(() => {
        expect(mockOnCommitAndPush).toHaveBeenCalledWith(specialMessage);
      });
    });

    it('handles commit messages with unicode characters', async () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const messageInput = screen.getByTestId('commit-message-input');
      const commitButton = screen.getByTestId('commit-button');

      const unicodeMessage = '修正: エラーを修正しました 🐛';
      fireEvent.change(messageInput, { target: { value: unicodeMessage } });
      fireEvent.click(commitButton);

      await waitFor(() => {
        expect(mockOnCommitAndPush).toHaveBeenCalledWith(unicodeMessage);
      });
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

  describe('Error Handling', () => {
    it('handles commit errors gracefully', async () => {
      mockOnCommitAndPush.mockRejectedValue(new Error('Git push failed'));

      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const messageInput = screen.getByTestId('commit-message-input');
      const commitButton = screen.getByTestId('commit-button');

      fireEvent.change(messageInput, { target: { value: 'Test commit' } });
      fireEvent.click(commitButton);

      await waitFor(() => {
        expect(mockOnCommitAndPush).toHaveBeenCalledWith('Test commit');
      });

      // Modal should handle the error gracefully (not crash)
      expect(screen.getByText('Enter Commit Message')).toBeInTheDocument();
    });

    it('does not close modal when commit fails', async () => {
      mockOnCommitAndPush.mockRejectedValue(new Error('Network error'));

      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const messageInput = screen.getByTestId('commit-message-input');
      const commitButton = screen.getByTestId('commit-button');

      fireEvent.change(messageInput, { target: { value: 'Failed commit' } });
      fireEvent.click(commitButton);

      await waitFor(() => {
        expect(mockOnCommitAndPush).toHaveBeenCalledWith('Failed commit');
      });

      // Modal should remain open when commit fails
      expect(
        mockModalContext.setCommitMessageModalVisible
      ).not.toHaveBeenCalledWith(false);
    });

    it('handles authentication errors', async () => {
      mockOnCommitAndPush.mockRejectedValue(new Error('Authentication failed'));

      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const messageInput = screen.getByTestId('commit-message-input');
      const commitButton = screen.getByTestId('commit-button');

      fireEvent.change(messageInput, { target: { value: 'Auth test' } });
      fireEvent.click(commitButton);

      await waitFor(() => {
        expect(mockOnCommitAndPush).toHaveBeenCalledWith('Auth test');
      });

      // Should not crash the component
      expect(screen.getByText('Enter Commit Message')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and structure', () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const messageInput = screen.getByTestId('commit-message-input');
      expect(messageInput).toBeInTheDocument();
      expect(messageInput.tagName).toBe('INPUT');
      expect(messageInput).toHaveAttribute('type', 'text');
    });

    it('has proper button roles', () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2); // Cancel and Commit buttons

      const cancelButton = screen.getByTestId('cancel-commit-button');
      const commitButton = screen.getByTestId('commit-button');

      expect(cancelButton).toBeInTheDocument();
      expect(commitButton).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const messageInput = screen.getByTestId('commit-message-input');

      // Check that the input is focusable (not disabled or readonly)
      expect(messageInput).not.toHaveAttribute('disabled');
      expect(messageInput).not.toHaveAttribute('readonly');

      // Check that the input can receive keyboard events
      fireEvent.keyDown(messageInput, { key: 'a' });
      fireEvent.change(messageInput, { target: { value: 'test' } });

      expect((messageInput as HTMLInputElement).value).toBe('test');

      // Verify the input is accessible via keyboard navigation
      expect(messageInput).toHaveAttribute('type', 'text');
      expect(messageInput).toHaveAccessibleName(); // Has proper label
    });

    it('has proper modal structure', () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      // Modal should have proper title
      expect(screen.getByText('Enter Commit Message')).toBeInTheDocument();

      // Should have form elements
      expect(screen.getByTestId('commit-message-input')).toBeInTheDocument();
    });
  });

  describe('Component Props', () => {
    it('accepts and uses onCommitAndPush prop correctly', async () => {
      const customMockCommit = vi.fn().mockResolvedValue(undefined);

      render(<CommitMessageModal onCommitAndPush={customMockCommit} />);

      const messageInput = screen.getByTestId('commit-message-input');
      const commitButton = screen.getByTestId('commit-button');

      fireEvent.change(messageInput, {
        target: { value: 'Custom commit message' },
      });
      fireEvent.click(commitButton);

      await waitFor(() => {
        expect(customMockCommit).toHaveBeenCalledWith('Custom commit message');
      });
    });

    it('handles function prop correctly', () => {
      const testFunction = vi.fn();

      expect(() => {
        render(<CommitMessageModal onCommitAndPush={testFunction} />);
      }).not.toThrow();

      expect(screen.getByText('Enter Commit Message')).toBeInTheDocument();
    });
  });

  describe('Form Submission Edge Cases', () => {
    it('submits form via Enter key', async () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const messageInput = screen.getByTestId('commit-message-input');

      fireEvent.change(messageInput, { target: { value: 'Enter key commit' } });
      fireEvent.keyDown(messageInput, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(mockOnCommitAndPush).toHaveBeenCalledWith('Enter key commit');
      });
    });

    it('does not submit empty form via Enter key', () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const messageInput = screen.getByTestId('commit-message-input');
      fireEvent.keyDown(messageInput, { key: 'Enter', code: 'Enter' });

      // Should not call the function
      expect(mockOnCommitAndPush).not.toHaveBeenCalled();
    });

    it('handles rapid successive submissions without crashing', () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      const messageInput = screen.getByTestId('commit-message-input');
      const commitButton = screen.getByTestId('commit-button');

      fireEvent.change(messageInput, { target: { value: 'Rapid commit' } });

      // Rapidly click multiple times - should not crash
      fireEvent.click(commitButton);
      fireEvent.click(commitButton);
      fireEvent.click(commitButton);

      // Verify component is still functional
      expect(screen.getByText('Enter Commit Message')).toBeInTheDocument();
      expect(mockOnCommitAndPush).toHaveBeenCalledWith('Rapid commit');
    });
  });

  describe('User Interaction Flow', () => {
    it('completes full commit flow successfully', async () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      // 1. Modal opens and shows input
      expect(screen.getByTestId('commit-message-input')).toBeInTheDocument();

      // 2. User types commit message
      const messageInput = screen.getByTestId('commit-message-input');
      fireEvent.change(messageInput, {
        target: { value: 'Complete flow test' },
      });

      // 3. User clicks commit
      const commitButton = screen.getByTestId('commit-button');
      fireEvent.click(commitButton);

      // 4. Commit function is called
      await waitFor(() => {
        expect(mockOnCommitAndPush).toHaveBeenCalledWith('Complete flow test');
      });

      // 5. Modal closes and input clears
      await waitFor(() => {
        expect(
          mockModalContext.setCommitMessageModalVisible
        ).toHaveBeenCalledWith(false);
      });
    });

    it('allows user to cancel commit', () => {
      render(<CommitMessageModal onCommitAndPush={mockOnCommitAndPush} />);

      // User types message but then cancels
      const messageInput = screen.getByTestId('commit-message-input');
      fireEvent.change(messageInput, {
        target: { value: 'Cancel this commit' },
      });

      const cancelButton = screen.getByTestId('cancel-commit-button');
      fireEvent.click(cancelButton);

      // Should close modal without calling commit function
      expect(mockOnCommitAndPush).not.toHaveBeenCalled();
      expect(
        mockModalContext.setCommitMessageModalVisible
      ).toHaveBeenCalledWith(false);
    });
  });
});
