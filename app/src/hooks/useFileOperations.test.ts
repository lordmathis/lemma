import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileOperations } from './useFileOperations';
import * as fileApi from '@/api/file';

// Mock dependencies
vi.mock('@/api/file');
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

// Mock the workspace context and git operations
const mockWorkspaceData: {
  currentWorkspace: {
    id: number;
    name: string;
    gitAutoCommit?: boolean;
    gitEnabled?: boolean;
    gitCommitMsgTemplate?: string;
  } | null;
} = {
  currentWorkspace: {
    id: 1,
    name: 'test-workspace',
    gitAutoCommit: false,
    gitEnabled: false,
    gitCommitMsgTemplate: '${action}: ${filename}',
  },
};

const mockGitOperations = {
  handleCommitAndPush: vi.fn(),
};

vi.mock('../contexts/WorkspaceDataContext', () => ({
  useWorkspaceData: () => mockWorkspaceData,
}));

vi.mock('./useGitOperations', () => ({
  useGitOperations: () => mockGitOperations,
}));

// Import notifications for assertions
import { notifications } from '@mantine/notifications';

describe('useFileOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset workspace data to defaults
    mockWorkspaceData.currentWorkspace = {
      id: 1,
      name: 'test-workspace',
      gitAutoCommit: false,
      gitEnabled: false,
      gitCommitMsgTemplate: '${action} ${filename}',
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handleSave', () => {
    it('saves file successfully and shows success notification', async () => {
      const mockSaveFile = vi.mocked(fileApi.saveFile);
      mockSaveFile.mockResolvedValue({
        filePath: 'test.md',
        size: 1024,
        updatedAt: '2024-01-01T00:00:00Z',
      });

      const { result } = renderHook(() => useFileOperations());

      let saveResult: boolean | undefined;
      await act(async () => {
        saveResult = await result.current.handleSave(
          'test.md',
          '# Test Content'
        );
      });

      expect(saveResult).toBe(true);
      expect(mockSaveFile).toHaveBeenCalledWith(
        'test-workspace',
        'test.md',
        '# Test Content'
      );
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Success',
        message: 'File saved successfully',
        color: 'green',
      });
    });

    it('handles save errors and shows error notification', async () => {
      const mockSaveFile = vi.mocked(fileApi.saveFile);
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockSaveFile.mockRejectedValue(new Error('Save failed'));

      const { result } = renderHook(() => useFileOperations());

      let saveResult: boolean | undefined;
      await act(async () => {
        saveResult = await result.current.handleSave(
          'test.md',
          '# Test Content'
        );
      });

      expect(saveResult).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error saving file:',
        expect.any(Error)
      );
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to save file',
        color: 'red',
      });

      consoleSpy.mockRestore();
    });

    it('returns false when no workspace is available', async () => {
      mockWorkspaceData.currentWorkspace = null;

      const { result } = renderHook(() => useFileOperations());

      let saveResult: boolean | undefined;
      await act(async () => {
        saveResult = await result.current.handleSave(
          'test.md',
          '# Test Content'
        );
      });

      expect(saveResult).toBe(false);
      expect(fileApi.saveFile).not.toHaveBeenCalled();
    });

    it('triggers auto-commit when enabled', async () => {
      const mockSaveFile = vi.mocked(fileApi.saveFile);
      mockSaveFile.mockResolvedValue({
        filePath: 'test.md',
        size: 1024,
        updatedAt: '2024-01-01T00:00:00Z',
      });

      // Enable auto-commit
      mockWorkspaceData.currentWorkspace!.gitAutoCommit = true;
      mockWorkspaceData.currentWorkspace!.gitEnabled = true;

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleSave('test.md', '# Test Content');
      });

      expect(mockGitOperations.handleCommitAndPush).toHaveBeenCalledWith(
        'Update test.md'
      );
    });

    it('uses custom commit message template', async () => {
      const mockSaveFile = vi.mocked(fileApi.saveFile);
      mockSaveFile.mockResolvedValue({
        filePath: 'docs/readme.md',
        size: 1024,
        updatedAt: '2024-01-01T00:00:00Z',
      });

      // Enable auto-commit with custom template
      mockWorkspaceData.currentWorkspace!.gitAutoCommit = true;
      mockWorkspaceData.currentWorkspace!.gitEnabled = true;
      mockWorkspaceData.currentWorkspace!.gitCommitMsgTemplate =
        'Modified ${filename} - ${action}';

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleSave('docs/readme.md', '# Documentation');
      });

      expect(mockGitOperations.handleCommitAndPush).toHaveBeenCalledWith(
        'Modified docs/readme.md - update'
      );
    });
  });

  describe('handleDelete', () => {
    it('deletes file successfully and shows success notification', async () => {
      const mockDeleteFile = vi.mocked(fileApi.deleteFile);
      mockDeleteFile.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFileOperations());

      let deleteResult: boolean | undefined;
      await act(async () => {
        deleteResult = await result.current.handleDelete('test.md');
      });

      expect(deleteResult).toBe(true);
      expect(mockDeleteFile).toHaveBeenCalledWith('test-workspace', 'test.md');
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Success',
        message: 'File deleted successfully',
        color: 'green',
      });
    });

    it('handles delete errors and shows error notification', async () => {
      const mockDeleteFile = vi.mocked(fileApi.deleteFile);
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockDeleteFile.mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useFileOperations());

      let deleteResult: boolean | undefined;
      await act(async () => {
        deleteResult = await result.current.handleDelete('test.md');
      });

      expect(deleteResult).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error deleting file:',
        expect.any(Error)
      );
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to delete file',
        color: 'red',
      });

      consoleSpy.mockRestore();
    });

    it('returns false when no workspace is available', async () => {
      mockWorkspaceData.currentWorkspace = null;

      const { result } = renderHook(() => useFileOperations());

      let deleteResult: boolean | undefined;
      await act(async () => {
        deleteResult = await result.current.handleDelete('test.md');
      });

      expect(deleteResult).toBe(false);
      expect(fileApi.deleteFile).not.toHaveBeenCalled();
    });

    it('triggers auto-commit when enabled', async () => {
      const mockDeleteFile = vi.mocked(fileApi.deleteFile);
      mockDeleteFile.mockResolvedValue(undefined);

      // Enable auto-commit
      mockWorkspaceData.currentWorkspace!.gitAutoCommit = true;
      mockWorkspaceData.currentWorkspace!.gitEnabled = true;

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleDelete('old-file.md');
      });

      expect(mockGitOperations.handleCommitAndPush).toHaveBeenCalledWith(
        'Delete old-file.md'
      );
    });
  });

  describe('handleCreate', () => {
    it('creates file successfully with default content', async () => {
      const mockSaveFile = vi.mocked(fileApi.saveFile);
      mockSaveFile.mockResolvedValue({
        filePath: 'new.md',
        size: 0,
        updatedAt: '2024-01-01T00:00:00Z',
      });

      const { result } = renderHook(() => useFileOperations());

      let createResult: boolean | undefined;
      await act(async () => {
        createResult = await result.current.handleCreate('new.md');
      });

      expect(createResult).toBe(true);
      expect(mockSaveFile).toHaveBeenCalledWith('test-workspace', 'new.md', '');
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Success',
        message: 'File created successfully',
        color: 'green',
      });
    });

    it('creates file with custom initial content', async () => {
      const mockSaveFile = vi.mocked(fileApi.saveFile);
      mockSaveFile.mockResolvedValue({
        filePath: 'template.md',
        size: 1024,
        updatedAt: '2024-01-01T00:00:00Z',
      });

      const { result } = renderHook(() => useFileOperations());

      let createResult: boolean | undefined;
      await act(async () => {
        createResult = await result.current.handleCreate(
          'template.md',
          '# Template\n\nContent here'
        );
      });

      expect(createResult).toBe(true);
      expect(mockSaveFile).toHaveBeenCalledWith(
        'test-workspace',
        'template.md',
        '# Template\n\nContent here'
      );
    });

    it('handles create errors and shows error notification', async () => {
      const mockSaveFile = vi.mocked(fileApi.saveFile);
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockSaveFile.mockRejectedValue(new Error('Create failed'));

      const { result } = renderHook(() => useFileOperations());

      let createResult: boolean | undefined;
      await act(async () => {
        createResult = await result.current.handleCreate('new.md');
      });

      expect(createResult).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error creating new file:',
        expect.any(Error)
      );
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to create new file',
        color: 'red',
      });

      consoleSpy.mockRestore();
    });

    it('returns false when no workspace is available', async () => {
      mockWorkspaceData.currentWorkspace = null;

      const { result } = renderHook(() => useFileOperations());

      let createResult: boolean | undefined;
      await act(async () => {
        createResult = await result.current.handleCreate('new.md');
      });

      expect(createResult).toBe(false);
      expect(fileApi.saveFile).not.toHaveBeenCalled();
    });

    it('triggers auto-commit when enabled', async () => {
      const mockSaveFile = vi.mocked(fileApi.saveFile);
      mockSaveFile.mockResolvedValue({
        filePath: 'new-file.md',
        size: 1024,
        updatedAt: '2024-01-01T00:00:00Z',
      });

      // Enable auto-commit
      mockWorkspaceData.currentWorkspace!.gitAutoCommit = true;
      mockWorkspaceData.currentWorkspace!.gitEnabled = true;

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleCreate('new-file.md', 'Initial content');
      });

      expect(mockGitOperations.handleCommitAndPush).toHaveBeenCalledWith(
        'Create new-file.md'
      );
    });
  });

  describe('auto-commit behavior', () => {
    it('does not auto-commit when git is disabled', async () => {
      const mockSaveFile = vi.mocked(fileApi.saveFile);
      mockSaveFile.mockResolvedValue({
        filePath: 'test.md',
        size: 1024,
        updatedAt: '2024-01-01T00:00:00Z',
      });

      // Enable auto-commit but disable git
      mockWorkspaceData.currentWorkspace!.gitAutoCommit = true;
      mockWorkspaceData.currentWorkspace!.gitEnabled = false;

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleSave('test.md', 'content');
      });

      expect(mockGitOperations.handleCommitAndPush).not.toHaveBeenCalled();
    });

    it('does not auto-commit when auto-commit is disabled', async () => {
      const mockSaveFile = vi.mocked(fileApi.saveFile);
      mockSaveFile.mockResolvedValue({
        filePath: 'test.md',
        size: 1024,
        updatedAt: '2024-01-01T00:00:00Z',
      });

      // Enable git but disable auto-commit
      mockWorkspaceData.currentWorkspace!.gitAutoCommit = false;
      mockWorkspaceData.currentWorkspace!.gitEnabled = true;

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleSave('test.md', 'content');
      });

      expect(mockGitOperations.handleCommitAndPush).not.toHaveBeenCalled();
    });

    it('capitalizes commit messages correctly', async () => {
      const mockSaveFile = vi.mocked(fileApi.saveFile);
      mockSaveFile.mockResolvedValue({
        filePath: 'test.md',
        size: 1024,
        updatedAt: '2024-01-01T00:00:00Z',
      });

      // Enable auto-commit with lowercase template
      mockWorkspaceData.currentWorkspace!.gitAutoCommit = true;
      mockWorkspaceData.currentWorkspace!.gitEnabled = true;
      mockWorkspaceData.currentWorkspace!.gitCommitMsgTemplate =
        'updated ${filename}';

      const { result } = renderHook(() => useFileOperations());

      await act(async () => {
        await result.current.handleSave('test.md', 'content');
      });

      expect(mockGitOperations.handleCommitAndPush).toHaveBeenCalledWith(
        'Updated test.md'
      );
    });

    it('handles different file actions correctly', async () => {
      const mockSaveFile = vi.mocked(fileApi.saveFile);
      const mockDeleteFile = vi.mocked(fileApi.deleteFile);

      mockSaveFile.mockResolvedValue({
        filePath: 'test.md',
        size: 1024,
        updatedAt: '2024-01-01T00:00:00Z',
      });
      mockDeleteFile.mockResolvedValue(undefined);

      // Enable auto-commit
      mockWorkspaceData.currentWorkspace!.gitAutoCommit = true;
      mockWorkspaceData.currentWorkspace!.gitEnabled = true;
      mockWorkspaceData.currentWorkspace!.gitCommitMsgTemplate =
        '${action}: ${filename}';

      const { result } = renderHook(() => useFileOperations());

      // Test create action
      await act(async () => {
        await result.current.handleCreate('new.md');
      });
      expect(mockGitOperations.handleCommitAndPush).toHaveBeenCalledWith(
        'Create: new.md'
      );

      // Test update action
      await act(async () => {
        await result.current.handleSave('existing.md', 'content');
      });
      expect(mockGitOperations.handleCommitAndPush).toHaveBeenCalledWith(
        'Update: existing.md'
      );

      // Test delete action
      await act(async () => {
        await result.current.handleDelete('old.md');
      });
      expect(mockGitOperations.handleCommitAndPush).toHaveBeenCalledWith(
        'Delete: old.md'
      );
    });
  });

  describe('hook interface', () => {
    it('returns correct function interface', () => {
      const { result } = renderHook(() => useFileOperations());

      expect(typeof result.current.handleSave).toBe('function');
      expect(typeof result.current.handleDelete).toBe('function');
      expect(typeof result.current.handleCreate).toBe('function');
    });

    it('functions are stable across re-renders', () => {
      const { result, rerender } = renderHook(() => useFileOperations());

      const initialHandlers = {
        handleSave: result.current.handleSave,
        handleDelete: result.current.handleDelete,
        handleCreate: result.current.handleCreate,
      };

      rerender();

      expect(result.current.handleSave).toBe(initialHandlers.handleSave);
      expect(result.current.handleDelete).toBe(initialHandlers.handleDelete);
      expect(result.current.handleCreate).toBe(initialHandlers.handleCreate);
    });
  });
});
