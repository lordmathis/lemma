import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkspaceOperations } from './useWorkspaceOperations';
import * as workspaceApi from '@/api/workspace';
import { Theme, type Workspace } from '@/types/models';

// Mock dependencies
vi.mock('@/api/workspace');
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

// Mock workspace data context
const mockWorkspaceData: {
  currentWorkspace: Workspace | null;
  loadWorkspaceData: ReturnType<typeof vi.fn>;
  loadWorkspaces: ReturnType<typeof vi.fn>;
  setCurrentWorkspace: ReturnType<typeof vi.fn>;
} = {
  currentWorkspace: {
    id: 1,
    userId: 1,
    name: 'test-workspace',
    createdAt: '2024-01-01T00:00:00Z',
    theme: Theme.Light,
    autoSave: false,
    showHiddenFiles: false,
    gitEnabled: false,
    gitUrl: '',
    gitUser: '',
    gitToken: '',
    gitAutoCommit: false,
    gitCommitMsgTemplate: '${action} ${filename}',
    gitCommitName: '',
    gitCommitEmail: '',
  },
  loadWorkspaceData: vi.fn(),
  loadWorkspaces: vi.fn(),
  setCurrentWorkspace: vi.fn(),
};

// Mock theme context
const mockTheme = {
  updateColorScheme: vi.fn(),
};

vi.mock('../contexts/WorkspaceDataContext', () => ({
  useWorkspaceData: () => mockWorkspaceData,
}));

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => mockTheme,
}));

// Import notifications for assertions
import { notifications } from '@mantine/notifications';

// Mock workspaces for testing
const mockWorkspaces: Workspace[] = [
  {
    id: 1,
    userId: 1,
    name: 'workspace-1',
    createdAt: '2024-01-01T00:00:00Z',
    theme: Theme.Light,
    autoSave: false,
    showHiddenFiles: false,
    gitEnabled: false,
    gitUrl: '',
    gitUser: '',
    gitToken: '',
    gitAutoCommit: false,
    gitCommitMsgTemplate: '${action} ${filename}',
    gitCommitName: '',
    gitCommitEmail: '',
  },
  {
    id: 2,
    userId: 1,
    name: 'workspace-2',
    createdAt: '2024-01-02T00:00:00Z',
    theme: Theme.Dark,
    autoSave: true,
    showHiddenFiles: true,
    gitEnabled: true,
    gitUrl: 'https://github.com/user/repo.git',
    gitUser: 'user',
    gitToken: 'token',
    gitAutoCommit: true,
    gitCommitMsgTemplate: 'auto: ${action} ${filename}',
    gitCommitName: 'Test User',
    gitCommitEmail: 'test@example.com',
  },
];

describe('useWorkspaceOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset workspace data to defaults
    mockWorkspaceData.currentWorkspace = {
      id: 1,
      userId: 1,
      name: 'test-workspace',
      createdAt: '2024-01-01T00:00:00Z',
      theme: Theme.Light,
      autoSave: false,
      showHiddenFiles: false,
      gitEnabled: false,
      gitUrl: '',
      gitUser: '',
      gitToken: '',
      gitAutoCommit: false,
      gitCommitMsgTemplate: '${action} ${filename}',
      gitCommitName: '',
      gitCommitEmail: '',
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('switchWorkspace', () => {
    it('switches workspace successfully', async () => {
      const mockUpdateLastWorkspaceName = vi.mocked(
        workspaceApi.updateLastWorkspaceName
      );
      mockUpdateLastWorkspaceName.mockResolvedValue(undefined);
      mockWorkspaceData.loadWorkspaceData.mockResolvedValue(undefined);
      mockWorkspaceData.loadWorkspaces.mockResolvedValue(mockWorkspaces);

      const { result } = renderHook(() => useWorkspaceOperations());

      await act(async () => {
        await result.current.switchWorkspace('new-workspace');
      });

      expect(mockUpdateLastWorkspaceName).toHaveBeenCalledWith('new-workspace');
      expect(mockWorkspaceData.loadWorkspaceData).toHaveBeenCalledWith(
        'new-workspace'
      );
      expect(mockWorkspaceData.loadWorkspaces).toHaveBeenCalled();
    });

    it('handles switch workspace errors', async () => {
      const mockUpdateLastWorkspaceName = vi.mocked(
        workspaceApi.updateLastWorkspaceName
      );
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockUpdateLastWorkspaceName.mockRejectedValue(new Error('Switch failed'));

      const { result } = renderHook(() => useWorkspaceOperations());

      await act(async () => {
        await result.current.switchWorkspace('error-workspace');
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to switch workspace:',
        expect.any(Error)
      );
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to switch workspace',
        color: 'red',
      });

      consoleSpy.mockRestore();
    });

    it('handles load workspace data errors during switch', async () => {
      const mockUpdateLastWorkspaceName = vi.mocked(
        workspaceApi.updateLastWorkspaceName
      );
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockUpdateLastWorkspaceName.mockResolvedValue(undefined);
      mockWorkspaceData.loadWorkspaceData.mockRejectedValue(
        new Error('Load failed')
      );

      const { result } = renderHook(() => useWorkspaceOperations());

      await act(async () => {
        await result.current.switchWorkspace('error-workspace');
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to switch workspace:',
        expect.any(Error)
      );
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to switch workspace',
        color: 'red',
      });

      consoleSpy.mockRestore();
    });

    it('handles load workspaces errors during switch', async () => {
      const mockUpdateLastWorkspaceName = vi.mocked(
        workspaceApi.updateLastWorkspaceName
      );
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockUpdateLastWorkspaceName.mockResolvedValue(undefined);
      mockWorkspaceData.loadWorkspaceData.mockResolvedValue(undefined);
      mockWorkspaceData.loadWorkspaces.mockRejectedValue(
        new Error('Load workspaces failed')
      );

      const { result } = renderHook(() => useWorkspaceOperations());

      await act(async () => {
        await result.current.switchWorkspace('error-workspace');
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to switch workspace:',
        expect.any(Error)
      );
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to switch workspace',
        color: 'red',
      });

      consoleSpy.mockRestore();
    });
  });

  describe('deleteCurrentWorkspace', () => {
    it('deletes workspace successfully when multiple workspaces exist', async () => {
      const mockDeleteWorkspace = vi.mocked(workspaceApi.deleteWorkspace);
      mockDeleteWorkspace.mockResolvedValue('next-workspace');
      mockWorkspaceData.loadWorkspaces.mockResolvedValue(mockWorkspaces);
      mockWorkspaceData.loadWorkspaceData.mockResolvedValue(undefined);

      const { result } = renderHook(() => useWorkspaceOperations());

      await act(async () => {
        await result.current.deleteCurrentWorkspace();
      });

      expect(mockWorkspaceData.loadWorkspaces).toHaveBeenCalledTimes(2); // Once for check, once after deletion
      expect(mockDeleteWorkspace).toHaveBeenCalledWith('test-workspace');
      expect(mockWorkspaceData.loadWorkspaceData).toHaveBeenCalledWith(
        'next-workspace'
      );
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Success',
        message: 'Workspace deleted successfully',
        color: 'green',
      });
    });

    it('prevents deletion when only one workspace exists', async () => {
      const singleWorkspace = [mockWorkspaces[0]].filter(
        (w): w is Workspace => w !== undefined
      );
      mockWorkspaceData.loadWorkspaces.mockResolvedValue(singleWorkspace);

      const { result } = renderHook(() => useWorkspaceOperations());

      await act(async () => {
        await result.current.deleteCurrentWorkspace();
      });

      expect(workspaceApi.deleteWorkspace).not.toHaveBeenCalled();
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message:
          'Cannot delete the last workspace. At least one workspace must exist.',
        color: 'red',
      });
    });

    it('does nothing when no current workspace', async () => {
      mockWorkspaceData.currentWorkspace = null;

      const { result } = renderHook(() => useWorkspaceOperations());

      await act(async () => {
        await result.current.deleteCurrentWorkspace();
      });

      expect(workspaceApi.deleteWorkspace).not.toHaveBeenCalled();
      expect(mockWorkspaceData.loadWorkspaces).not.toHaveBeenCalled();
    });

    it('handles delete workspace API errors', async () => {
      const mockDeleteWorkspace = vi.mocked(workspaceApi.deleteWorkspace);
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockWorkspaceData.loadWorkspaces.mockResolvedValue(mockWorkspaces);
      mockDeleteWorkspace.mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useWorkspaceOperations());

      await act(async () => {
        await result.current.deleteCurrentWorkspace();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to delete workspace:',
        expect.any(Error)
      );
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to delete workspace',
        color: 'red',
      });

      consoleSpy.mockRestore();
    });

    it('handles load workspace data errors after deletion', async () => {
      const mockDeleteWorkspace = vi.mocked(workspaceApi.deleteWorkspace);
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockWorkspaceData.loadWorkspaces.mockResolvedValue(mockWorkspaces);
      mockDeleteWorkspace.mockResolvedValue('next-workspace');
      mockWorkspaceData.loadWorkspaceData.mockRejectedValue(
        new Error('Load failed')
      );

      const { result } = renderHook(() => useWorkspaceOperations());

      await act(async () => {
        await result.current.deleteCurrentWorkspace();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to delete workspace:',
        expect.any(Error)
      );
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to delete workspace',
        color: 'red',
      });

      consoleSpy.mockRestore();
    });

    it('handles load workspaces errors during deletion check', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockWorkspaceData.loadWorkspaces.mockRejectedValue(
        new Error('Load workspaces failed')
      );

      const { result } = renderHook(() => useWorkspaceOperations());

      await act(async () => {
        await result.current.deleteCurrentWorkspace();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to delete workspace:',
        expect.any(Error)
      );
      expect(notifications.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to delete workspace',
        color: 'red',
      });

      consoleSpy.mockRestore();
    });
  });

  describe('updateSettings', () => {
    it('updates workspace settings successfully', async () => {
      const mockUpdateWorkspace = vi.mocked(workspaceApi.updateWorkspace);
      const updatedWorkspace: Workspace = {
        ...(mockWorkspaceData.currentWorkspace as Workspace),
        autoSave: true,
        showHiddenFiles: true,
      };
      mockUpdateWorkspace.mockResolvedValue(updatedWorkspace);
      mockWorkspaceData.loadWorkspaces.mockResolvedValue(mockWorkspaces);

      const { result } = renderHook(() => useWorkspaceOperations());

      const newSettings = {
        autoSave: true,
        showHiddenFiles: true,
      };

      await act(async () => {
        await result.current.updateSettings(newSettings);
      });

      expect(mockUpdateWorkspace).toHaveBeenCalledWith('test-workspace', {
        ...mockWorkspaceData.currentWorkspace,
        ...newSettings,
      });
      expect(mockWorkspaceData.setCurrentWorkspace).toHaveBeenCalledWith(
        updatedWorkspace
      );
      expect(mockWorkspaceData.loadWorkspaces).toHaveBeenCalled();
    });

    it('updates theme and calls updateColorScheme', async () => {
      const mockUpdateWorkspace = vi.mocked(workspaceApi.updateWorkspace);
      const updatedWorkspace: Workspace = {
        ...(mockWorkspaceData.currentWorkspace ?? {
          id: 1,
          userId: 1,
          name: 'test-workspace',
          createdAt: '2024-01-01T00:00:00Z',
          theme: Theme.Light,
          autoSave: false,
          showHiddenFiles: false,
          gitEnabled: false,
          gitUrl: '',
          gitUser: '',
          gitToken: '',
          gitAutoCommit: false,
          gitCommitMsgTemplate: '${action} ${filename}',
          gitCommitName: '',
          gitCommitEmail: '',
        }),
        theme: Theme.Dark,
        name: mockWorkspaceData.currentWorkspace?.name ?? 'test-workspace',
      };
      mockUpdateWorkspace.mockResolvedValue(updatedWorkspace);
      mockWorkspaceData.loadWorkspaces.mockResolvedValue(mockWorkspaces);

      const { result } = renderHook(() => useWorkspaceOperations());

      const newSettings = {
        theme: Theme.Dark,
      };

      await act(async () => {
        await result.current.updateSettings(newSettings);
      });

      expect(mockUpdateWorkspace).toHaveBeenCalledWith('test-workspace', {
        ...mockWorkspaceData.currentWorkspace,
        theme: Theme.Dark,
      });
      expect(mockTheme.updateColorScheme).toHaveBeenCalledWith(Theme.Dark);
      expect(mockWorkspaceData.setCurrentWorkspace).toHaveBeenCalledWith(
        updatedWorkspace
      );
    });

    it('updates multiple settings including theme', async () => {
      const mockUpdateWorkspace = vi.mocked(workspaceApi.updateWorkspace);
      const updatedWorkspace: Workspace = {
        ...(mockWorkspaceData.currentWorkspace ?? {
          id: 1,
          userId: 1,
          name: 'test-workspace',
          createdAt: '2024-01-01T00:00:00Z',
          theme: Theme.Light,
          autoSave: false,
          showHiddenFiles: false,
          gitEnabled: false,
          gitUrl: '',
          gitUser: '',
          gitToken: '',
          gitAutoCommit: false,
          gitCommitMsgTemplate: '${action} ${filename}',
          gitCommitName: '',
          gitCommitEmail: '',
        }),
        theme: Theme.Dark,
        autoSave: true,
        gitEnabled: true,
        gitUrl: 'https://github.com/user/repo.git',
      };
      mockUpdateWorkspace.mockResolvedValue(updatedWorkspace);
      mockWorkspaceData.loadWorkspaces.mockResolvedValue(mockWorkspaces);

      const { result } = renderHook(() => useWorkspaceOperations());

      const newSettings = {
        theme: Theme.Dark,
        autoSave: true,
        gitEnabled: true,
        gitUrl: 'https://github.com/user/repo.git',
      };

      await act(async () => {
        await result.current.updateSettings(newSettings);
      });

      expect(mockUpdateWorkspace).toHaveBeenCalledWith('test-workspace', {
        ...mockWorkspaceData.currentWorkspace,
        ...newSettings,
      });
      expect(mockTheme.updateColorScheme).toHaveBeenCalledWith(Theme.Dark);
      expect(mockWorkspaceData.setCurrentWorkspace).toHaveBeenCalledWith(
        updatedWorkspace
      );
      expect(mockWorkspaceData.loadWorkspaces).toHaveBeenCalled();
    });

    it('does nothing when no current workspace', async () => {
      mockWorkspaceData.currentWorkspace = null;

      const { result } = renderHook(() => useWorkspaceOperations());

      await act(async () => {
        await result.current.updateSettings({ autoSave: true });
      });

      expect(workspaceApi.updateWorkspace).not.toHaveBeenCalled();
      expect(mockWorkspaceData.setCurrentWorkspace).not.toHaveBeenCalled();
      expect(mockWorkspaceData.loadWorkspaces).not.toHaveBeenCalled();
    });

    it('handles update workspace API errors', async () => {
      const mockUpdateWorkspace = vi.mocked(workspaceApi.updateWorkspace);
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockUpdateWorkspace.mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => useWorkspaceOperations());

      await act(async () => {
        try {
          await result.current.updateSettings({ autoSave: true });
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Update failed');
        }
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save settings:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('handles load workspaces errors after update', async () => {
      const mockUpdateWorkspace = vi.mocked(workspaceApi.updateWorkspace);
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const updatedWorkspace: Workspace = {
        ...(mockWorkspaceData.currentWorkspace ?? {
          id: 1,
          userId: 1,
          name: 'test-workspace',
          createdAt: '2024-01-01T00:00:00Z',
          theme: Theme.Light,
          autoSave: false,
          showHiddenFiles: false,
          gitEnabled: false,
          gitUrl: '',
          gitUser: '',
          gitToken: '',
          gitAutoCommit: false,
          gitCommitMsgTemplate: '${action} ${filename}',
          gitCommitName: '',
          gitCommitEmail: '',
        }),
        autoSave: true,
      };
      mockUpdateWorkspace.mockResolvedValue(updatedWorkspace);
      mockWorkspaceData.loadWorkspaces.mockRejectedValue(
        new Error('Load workspaces failed')
      );

      const { result } = renderHook(() => useWorkspaceOperations());

      await act(async () => {
        try {
          await result.current.updateSettings({ autoSave: true });
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Load workspaces failed');
        }
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save settings:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('handles empty settings update', async () => {
      const mockUpdateWorkspace = vi.mocked(workspaceApi.updateWorkspace);
      const updatedWorkspace = mockWorkspaceData.currentWorkspace ?? {
        id: 1,
        userId: 1,
        name: 'test-workspace',
        createdAt: '2024-01-01T00:00:00Z',
        theme: Theme.Light,
        autoSave: false,
        showHiddenFiles: false,
        gitEnabled: false,
        gitUrl: '',
        gitUser: '',
        gitToken: '',
        gitAutoCommit: false,
        gitCommitMsgTemplate: '${action} ${filename}',
        gitCommitName: '',
        gitCommitEmail: '',
      };
      mockUpdateWorkspace.mockResolvedValue(updatedWorkspace);
      mockWorkspaceData.loadWorkspaces.mockResolvedValue(mockWorkspaces);

      const { result } = renderHook(() => useWorkspaceOperations());

      await act(async () => {
        await result.current.updateSettings({});
      });

      expect(mockUpdateWorkspace).toHaveBeenCalledWith(
        'test-workspace',
        mockWorkspaceData.currentWorkspace
      );
      expect(mockWorkspaceData.setCurrentWorkspace).toHaveBeenCalledWith(
        updatedWorkspace
      );
    });
  });

  describe('hook interface', () => {
    it('returns correct function interface', () => {
      const { result } = renderHook(() => useWorkspaceOperations());

      expect(typeof result.current.switchWorkspace).toBe('function');
      expect(typeof result.current.deleteCurrentWorkspace).toBe('function');
      expect(typeof result.current.updateSettings).toBe('function');
    });

    it('functions are stable across re-renders', () => {
      const { result, rerender } = renderHook(() => useWorkspaceOperations());

      const initialFunctions = {
        switchWorkspace: result.current.switchWorkspace,
        deleteCurrentWorkspace: result.current.deleteCurrentWorkspace,
        updateSettings: result.current.updateSettings,
      };

      rerender();

      expect(result.current.switchWorkspace).toBe(
        initialFunctions.switchWorkspace
      );
      expect(result.current.deleteCurrentWorkspace).toBe(
        initialFunctions.deleteCurrentWorkspace
      );
      expect(result.current.updateSettings).toBe(
        initialFunctions.updateSettings
      );
    });
  });

  describe('workspace data integration', () => {
    it('uses current workspace name for API calls', async () => {
      const mockUpdateWorkspace = vi.mocked(workspaceApi.updateWorkspace);
      const mockDeleteWorkspace = vi.mocked(workspaceApi.deleteWorkspace);

      // Update workspace name
      mockWorkspaceData.currentWorkspace = {
        ...(mockWorkspaceData.currentWorkspace ?? {
          id: 1,
          userId: 1,
          name: 'different-workspace',
          createdAt: '2024-01-01T00:00:00Z',
          theme: Theme.Light,
          autoSave: false,
          showHiddenFiles: false,
          gitEnabled: false,
          gitUrl: '',
          gitUser: '',
          gitToken: '',
          gitAutoCommit: false,
          gitCommitMsgTemplate: '${action} ${filename}',
          gitCommitName: '',
          gitCommitEmail: '',
        }),
        name: 'different-workspace',
      };

      mockUpdateWorkspace.mockResolvedValue(mockWorkspaceData.currentWorkspace);
      mockDeleteWorkspace.mockResolvedValue('next-workspace');
      mockWorkspaceData.loadWorkspaces.mockResolvedValue(mockWorkspaces);
      mockWorkspaceData.loadWorkspaceData.mockResolvedValue(undefined);

      const { result } = renderHook(() => useWorkspaceOperations());

      // Test update settings
      await act(async () => {
        await result.current.updateSettings({ autoSave: true });
      });

      expect(mockUpdateWorkspace).toHaveBeenCalledWith(
        'different-workspace',
        expect.any(Object)
      );

      // Test delete workspace
      await act(async () => {
        await result.current.deleteCurrentWorkspace();
      });

      expect(mockDeleteWorkspace).toHaveBeenCalledWith('different-workspace');
    });

    it('handles workspace changes during operations', () => {
      const { result, rerender } = renderHook(() => useWorkspaceOperations());

      // Change workspace
      mockWorkspaceData.currentWorkspace = {
        ...(mockWorkspaceData.currentWorkspace ?? {
          id: 1,
          userId: 1,
          name: 'new-workspace',
          createdAt: '2024-01-01T00:00:00Z',
          theme: Theme.Light,
          autoSave: false,
          showHiddenFiles: false,
          gitEnabled: false,
          gitUrl: '',
          gitUser: '',
          gitToken: '',
          gitAutoCommit: false,
          gitCommitMsgTemplate: '${action} ${filename}',
          gitCommitName: '',
          gitCommitEmail: '',
        }),
        name: 'new-workspace',
        createdAt:
          mockWorkspaceData.currentWorkspace?.createdAt ??
          '2024-01-01T00:00:00Z',
        id: mockWorkspaceData.currentWorkspace?.id ?? 1,
        userId: mockWorkspaceData.currentWorkspace?.userId ?? 1,
        theme: mockWorkspaceData.currentWorkspace?.theme ?? Theme.Light,
        autoSave: mockWorkspaceData.currentWorkspace?.autoSave ?? false,
        showHiddenFiles:
          mockWorkspaceData.currentWorkspace?.showHiddenFiles ?? false,
        gitEnabled: mockWorkspaceData.currentWorkspace?.gitEnabled ?? false,
        gitUrl: mockWorkspaceData.currentWorkspace?.gitUrl ?? '',
        gitUser: mockWorkspaceData.currentWorkspace?.gitUser ?? '',
        gitToken: mockWorkspaceData.currentWorkspace?.gitToken ?? '',
        gitAutoCommit:
          mockWorkspaceData.currentWorkspace?.gitAutoCommit ?? false,
        gitCommitMsgTemplate:
          mockWorkspaceData.currentWorkspace?.gitCommitMsgTemplate ??
          '${action} ${filename}',
        gitCommitName: mockWorkspaceData.currentWorkspace?.gitCommitName ?? '',
        gitCommitEmail:
          mockWorkspaceData.currentWorkspace?.gitCommitEmail ?? '',
      };

      rerender();

      // Functions should still work with new workspace
      expect(typeof result.current.switchWorkspace).toBe('function');
      expect(typeof result.current.deleteCurrentWorkspace).toBe('function');
      expect(typeof result.current.updateSettings).toBe('function');
    });
  });

  describe('concurrent operations', () => {
    it('handles multiple concurrent switch operations', async () => {
      const mockUpdateLastWorkspaceName = vi.mocked(
        workspaceApi.updateLastWorkspaceName
      );
      mockUpdateLastWorkspaceName.mockResolvedValue(undefined);
      mockWorkspaceData.loadWorkspaceData.mockResolvedValue(undefined);
      mockWorkspaceData.loadWorkspaces.mockResolvedValue(mockWorkspaces);

      const { result } = renderHook(() => useWorkspaceOperations());

      await act(async () => {
        await Promise.all([
          result.current.switchWorkspace('workspace-1'),
          result.current.switchWorkspace('workspace-2'),
        ]);
      });

      expect(mockUpdateLastWorkspaceName).toHaveBeenCalledTimes(2);
      expect(mockWorkspaceData.loadWorkspaceData).toHaveBeenCalledTimes(2);
      expect(mockWorkspaceData.loadWorkspaces).toHaveBeenCalledTimes(2);
    });

    it('handles update settings after switch workspace', async () => {
      const mockUpdateLastWorkspaceName = vi.mocked(
        workspaceApi.updateLastWorkspaceName
      );
      const mockUpdateWorkspace = vi.mocked(workspaceApi.updateWorkspace);

      mockUpdateLastWorkspaceName.mockResolvedValue(undefined);
      mockWorkspaceData.loadWorkspaceData.mockResolvedValue(undefined);
      mockWorkspaceData.loadWorkspaces.mockResolvedValue(mockWorkspaces);

      // Ensure we have a defined workspace to use
      const workspaceToUse: Workspace = {
        id: 1,
        userId: 1,
        name: 'test-workspace',
        createdAt: '2024-01-01T00:00:00Z',
        theme: Theme.Light,
        autoSave: false,
        showHiddenFiles: false,
        gitEnabled: false,
        gitUrl: '',
        gitUser: '',
        gitToken: '',
        gitAutoCommit: false,
        gitCommitMsgTemplate: '${action} ${filename}',
        gitCommitName: '',
        gitCommitEmail: '',
      };

      mockUpdateWorkspace.mockResolvedValue(workspaceToUse);

      const { result } = renderHook(() => useWorkspaceOperations());

      await act(async () => {
        await result.current.switchWorkspace('new-workspace');
      });

      await act(async () => {
        await result.current.updateSettings({ autoSave: true });
      });

      expect(mockUpdateLastWorkspaceName).toHaveBeenCalledWith('new-workspace');
      expect(mockUpdateWorkspace).toHaveBeenCalledWith(
        'test-workspace',
        expect.objectContaining({ autoSave: true })
      );
    });
  });
});
