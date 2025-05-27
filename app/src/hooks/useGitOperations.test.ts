import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGitOperations } from './useGitOperations';
import * as gitApi from '@/api/git';

// Mock dependencies
vi.mock('@/api/git');
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

// Mock the workspace context
const mockWorkspaceData: {
  currentWorkspace: { id: number; name: string } | null;
  settings: { gitEnabled: boolean };
} = {
  currentWorkspace: {
    id: 1,
    name: 'test-workspace',
  },
  settings: {
    gitEnabled: true,
  },
};

vi.mock('../contexts/WorkspaceDataContext', () => ({
  useWorkspaceData: () => mockWorkspaceData,
}));

// Import notifications for assertions
import { notifications } from '@mantine/notifications';

describe('useGitOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset workspace data to defaults
    mockWorkspaceData.currentWorkspace = {
      id: 1,
      name: 'test-workspace',
    };
    mockWorkspaceData.settings = {
      gitEnabled: true,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handlePull', () => {
    it('pulls changes successfully and shows success notification', async () => {
      const mockPullChanges = vi.mocked(gitApi.pullChanges);
      mockPullChanges.mockResolvedValue('Successfully pulled latest changes');

      const { result } = renderHook(() => useGitOperations());

      let pullResult: boolean | undefined;
      await act(async () => {
        pullResult = await result.current.handlePull();
      });

      expect(pullResult).toBe(true);
      expect(mockPullChanges).toHaveBeenCalledWith('test-workspace');
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Success',
        message: 'Successfully pulled latest changes',
        color: 'green',
      });
    });

    it('handles pull errors and shows error notification', async () => {
      const mockPullChanges = vi.mocked(gitApi.pullChanges);
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockPullChanges.mockRejectedValue(new Error('Pull failed'));

      const { result } = renderHook(() => useGitOperations());

      let pullResult: boolean | undefined;
      await act(async () => {
        pullResult = await result.current.handlePull();
      });

      expect(pullResult).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to pull latest changes:',
        expect.any(Error)
      );
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to pull latest changes',
        color: 'red',
      });

      consoleSpy.mockRestore();
    });

    it('returns false when no workspace is available', async () => {
      mockWorkspaceData.currentWorkspace = null;

      const { result } = renderHook(() => useGitOperations());

      let pullResult: boolean | undefined;
      await act(async () => {
        pullResult = await result.current.handlePull();
      });

      expect(pullResult).toBe(false);
      expect(gitApi.pullChanges).not.toHaveBeenCalled();
    });

    it('returns false when git is disabled', async () => {
      mockWorkspaceData.settings.gitEnabled = false;

      const { result } = renderHook(() => useGitOperations());

      let pullResult: boolean | undefined;
      await act(async () => {
        pullResult = await result.current.handlePull();
      });

      expect(pullResult).toBe(false);
      expect(gitApi.pullChanges).not.toHaveBeenCalled();
    });

    it('handles pull with different response messages', async () => {
      const mockPullChanges = vi.mocked(gitApi.pullChanges);
      mockPullChanges.mockResolvedValue('Already up to date');

      const { result } = renderHook(() => useGitOperations());

      await act(async () => {
        await result.current.handlePull();
      });

      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Success',
        message: 'Already up to date',
        color: 'green',
      });
    });
  });

  describe('handleCommitAndPush', () => {
    it('commits and pushes successfully with commit hash', async () => {
      const mockCommitAndPush = vi.mocked(gitApi.commitAndPush);
      mockCommitAndPush.mockResolvedValue('abc123def456');

      const { result } = renderHook(() => useGitOperations());

      await act(async () => {
        await result.current.handleCommitAndPush('Add new feature');
      });

      expect(mockCommitAndPush).toHaveBeenCalledWith(
        'test-workspace',
        'Add new feature'
      );
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Success',
        message: 'Successfully committed and pushed changes abc123def456',
        color: 'green',
      });
    });

    it('handles commit errors and shows error notification', async () => {
      const mockCommitAndPush = vi.mocked(gitApi.commitAndPush);
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockCommitAndPush.mockRejectedValue(new Error('Commit failed'));

      const { result } = renderHook(() => useGitOperations());

      await act(async () => {
        await result.current.handleCommitAndPush('Failed commit');
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to commit and push changes:',
        expect.any(Error)
      );
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to commit and push changes',
        color: 'red',
      });

      consoleSpy.mockRestore();
    });

    it('does nothing when no workspace is available', async () => {
      mockWorkspaceData.currentWorkspace = null;

      const { result } = renderHook(() => useGitOperations());

      await act(async () => {
        await result.current.handleCommitAndPush('Test commit');
      });

      expect(gitApi.commitAndPush).not.toHaveBeenCalled();
      expect(notifications.show).not.toHaveBeenCalled();
    });

    it('does nothing when git is disabled', async () => {
      mockWorkspaceData.settings.gitEnabled = false;

      const { result } = renderHook(() => useGitOperations());

      await act(async () => {
        await result.current.handleCommitAndPush('Test commit');
      });

      expect(gitApi.commitAndPush).not.toHaveBeenCalled();
      expect(notifications.show).not.toHaveBeenCalled();
    });

    it('handles empty commit messages', async () => {
      const mockCommitAndPush = vi.mocked(gitApi.commitAndPush);
      mockCommitAndPush.mockResolvedValue('xyz789abc123');

      const { result } = renderHook(() => useGitOperations());

      await act(async () => {
        await result.current.handleCommitAndPush('');
      });

      expect(mockCommitAndPush).toHaveBeenCalledWith('test-workspace', '');
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Success',
        message: 'Successfully committed and pushed changes xyz789abc123',
        color: 'green',
      });
    });

    it('handles long commit messages', async () => {
      const mockCommitAndPush = vi.mocked(gitApi.commitAndPush);
      mockCommitAndPush.mockResolvedValue('longcommithash123456789');

      const longMessage =
        'This is a very long commit message that describes in detail all the changes that were made to the codebase including bug fixes, new features, and documentation updates';

      const { result } = renderHook(() => useGitOperations());

      await act(async () => {
        await result.current.handleCommitAndPush(longMessage);
      });

      expect(mockCommitAndPush).toHaveBeenCalledWith(
        'test-workspace',
        longMessage
      );
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Success',
        message:
          'Successfully committed and pushed changes longcommithash123456789',
        color: 'green',
      });
    });

    it('handles commit with special characters in message', async () => {
      const mockCommitAndPush = vi.mocked(gitApi.commitAndPush);
      mockCommitAndPush.mockResolvedValue('special123hash');

      const specialMessage =
        'Fix: update file with special chars àáâãäå & symbols!@#$%';

      const { result } = renderHook(() => useGitOperations());

      await act(async () => {
        await result.current.handleCommitAndPush(specialMessage);
      });

      expect(mockCommitAndPush).toHaveBeenCalledWith(
        'test-workspace',
        specialMessage
      );
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Success',
        message: 'Successfully committed and pushed changes special123hash',
        color: 'green',
      });
    });
  });

  describe('workspace and settings dependencies', () => {
    it('handles workspace changes correctly', async () => {
      const mockPullChanges = vi.mocked(gitApi.pullChanges);
      mockPullChanges.mockResolvedValue('Success');

      const { result, rerender } = renderHook(() => useGitOperations());

      // Test with initial workspace
      await act(async () => {
        await result.current.handlePull();
      });

      expect(mockPullChanges).toHaveBeenCalledWith('test-workspace');

      // Change workspace
      mockWorkspaceData.currentWorkspace = {
        id: 2,
        name: 'different-workspace',
      };

      rerender();

      await act(async () => {
        await result.current.handlePull();
      });

      expect(mockPullChanges).toHaveBeenCalledWith('different-workspace');
    });

    it('handles git settings changes correctly', async () => {
      const { result, rerender } = renderHook(() => useGitOperations());

      // Initially git is enabled
      expect(mockWorkspaceData.settings.gitEnabled).toBe(true);

      // Disable git
      mockWorkspaceData.settings.gitEnabled = false;
      rerender();

      let pullResult: boolean | undefined;
      await act(async () => {
        pullResult = await result.current.handlePull();
      });

      expect(pullResult).toBe(false);
      expect(gitApi.pullChanges).not.toHaveBeenCalled();
    });
  });

  describe('hook interface', () => {
    it('returns correct function interface', () => {
      const { result } = renderHook(() => useGitOperations());

      expect(typeof result.current.handlePull).toBe('function');
      expect(typeof result.current.handleCommitAndPush).toBe('function');
    });

    it('functions are stable across re-renders', () => {
      const { result, rerender } = renderHook(() => useGitOperations());

      const initialHandlers = {
        handlePull: result.current.handlePull,
        handleCommitAndPush: result.current.handleCommitAndPush,
      };

      rerender();

      expect(result.current.handlePull).toBe(initialHandlers.handlePull);
      expect(result.current.handleCommitAndPush).toBe(
        initialHandlers.handleCommitAndPush
      );
    });
  });

  describe('edge cases', () => {
    it('handles null workspace gracefully', async () => {
      mockWorkspaceData.currentWorkspace = null;

      const { result } = renderHook(() => useGitOperations());

      let pullResult: boolean | undefined;
      await act(async () => {
        pullResult = await result.current.handlePull();
      });

      expect(pullResult).toBe(false);
      expect(gitApi.pullChanges).not.toHaveBeenCalled();
    });

    it('handles undefined workspace name gracefully', async () => {
      mockWorkspaceData.currentWorkspace = {
        id: 1,
        name: undefined as unknown as string,
      };

      const { result } = renderHook(() => useGitOperations());

      let pullResult: boolean | undefined;
      await act(async () => {
        pullResult = await result.current.handlePull();
      });

      expect(pullResult).toBe(false);
      expect(gitApi.pullChanges).not.toHaveBeenCalled();
    });

    it('handles missing settings gracefully', async () => {
      mockWorkspaceData.settings = {
        gitEnabled: undefined as unknown as boolean,
      };

      const { result } = renderHook(() => useGitOperations());

      let pullResult: boolean | undefined;
      await act(async () => {
        pullResult = await result.current.handlePull();
      });

      expect(pullResult).toBe(false);
      expect(gitApi.pullChanges).not.toHaveBeenCalled();
    });

    it('handles API returning non-string commit hash', async () => {
      const mockCommitAndPush = vi.mocked(gitApi.commitAndPush);
      // API might return something unexpected
      mockCommitAndPush.mockResolvedValue(null as unknown as string);

      const { result } = renderHook(() => useGitOperations());

      await act(async () => {
        await result.current.handleCommitAndPush('Test commit');
      });

      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Success',
        message: 'Successfully committed and pushed changes null',
        color: 'green',
      });
    });
  });
});
