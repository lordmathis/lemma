import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import {
  WorkspaceDataProvider,
  useWorkspaceData,
} from './WorkspaceDataContext';
import {
  DEFAULT_WORKSPACE_SETTINGS,
  type Workspace,
  Theme,
} from '@/types/models';

// Set up mocks before imports are used
vi.mock('@/api/workspace', () => {
  return {
    getWorkspace: vi.fn(),
    listWorkspaces: vi.fn(),
    getLastWorkspaceName: vi.fn(),
    updateLastWorkspaceName: vi.fn(),
  };
});

vi.mock('@mantine/notifications', () => {
  return {
    notifications: {
      show: vi.fn(),
    },
  };
});

vi.mock('./ThemeContext', () => {
  return {
    useTheme: vi.fn(),
  };
});

// Import the mocks after they've been defined
import {
  getWorkspace as mockGetWorkspace,
  listWorkspaces as mockListWorkspaces,
  getLastWorkspaceName as mockGetLastWorkspaceName,
  updateLastWorkspaceName as mockUpdateLastWorkspaceName,
} from '@/api/workspace';
import { notifications } from '@mantine/notifications';
import { useTheme } from './ThemeContext';

// Get reference to the mocked functions
const mockNotificationsShow = notifications.show as unknown as ReturnType<
  typeof vi.fn
>;
const mockUseTheme = useTheme as ReturnType<typeof vi.fn>;
const mockUpdateColorScheme = vi.fn();

// Mock workspace data
const mockWorkspace: Workspace = {
  id: 1,
  name: 'test-workspace',
  theme: Theme.Dark,
  createdAt: '2024-01-01T00:00:00Z',
  autoSave: true,
  showHiddenFiles: false,
  gitEnabled: false,
  gitUrl: '',
  gitUser: '',
  gitToken: '',
  gitAutoCommit: false,
  gitCommitMsgTemplate: '',
  gitCommitName: '',
  gitCommitEmail: '',
};

const mockWorkspace2: Workspace = {
  id: 2,
  name: 'workspace-2',
  theme: Theme.Light,
  createdAt: '2024-01-02T00:00:00Z',
  autoSave: false,
  showHiddenFiles: false,
  gitEnabled: false,
  gitUrl: '',
  gitUser: '',
  gitToken: '',
  gitAutoCommit: false,
  gitCommitMsgTemplate: '',
  gitCommitName: '',
  gitCommitEmail: '',
};

const mockWorkspaceList: Workspace[] = [mockWorkspace, mockWorkspace2];

// Helper wrapper component for testing
const createWrapper = () => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <WorkspaceDataProvider>{children}</WorkspaceDataProvider>
  );
  Wrapper.displayName = 'WorkspaceDataProviderTestWrapper';
  return Wrapper;
};

describe('WorkspaceDataContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default theme mock
    mockUseTheme.mockReturnValue({
      colorScheme: 'light',
      updateColorScheme: mockUpdateColorScheme,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('WorkspaceDataProvider initialization', () => {
    it('initializes with null workspace and loading state', () => {
      (mockGetLastWorkspaceName as ReturnType<typeof vi.fn>).mockResolvedValue(
        null
      );
      (mockListWorkspaces as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useWorkspaceData(), { wrapper });

      expect(result.current.currentWorkspace).toBeNull();
      expect(result.current.loading).toBe(true);
      expect(result.current.workspaces).toEqual([]);
      expect(result.current.settings).toEqual(DEFAULT_WORKSPACE_SETTINGS);
    });

    it('provides all expected functions', () => {
      (mockGetLastWorkspaceName as ReturnType<typeof vi.fn>).mockResolvedValue(
        null
      );
      (mockListWorkspaces as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useWorkspaceData(), { wrapper });

      expect(typeof result.current.loadWorkspaces).toBe('function');
      expect(typeof result.current.loadWorkspaceData).toBe('function');
      expect(typeof result.current.setCurrentWorkspace).toBe('function');
    });

    it('loads last workspace when available', async () => {
      (mockGetLastWorkspaceName as ReturnType<typeof vi.fn>).mockResolvedValue(
        'test-workspace'
      );
      (mockGetWorkspace as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockWorkspace
      );
      (mockListWorkspaces as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockWorkspaceList
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useWorkspaceData(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.currentWorkspace).toEqual(mockWorkspace);
      expect(result.current.workspaces).toEqual(mockWorkspaceList);
      expect(result.current.settings).toEqual(mockWorkspace);
      expect(mockGetLastWorkspaceName).toHaveBeenCalledTimes(1);
      expect(mockGetWorkspace).toHaveBeenCalledWith('test-workspace');
      expect(mockListWorkspaces).toHaveBeenCalledTimes(1);
      expect(mockUpdateColorScheme).toHaveBeenCalledWith('dark');
    });

    it('loads first available workspace when no last workspace', async () => {
      (mockGetLastWorkspaceName as ReturnType<typeof vi.fn>).mockResolvedValue(
        null
      );
      (mockListWorkspaces as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockWorkspaceList
      );
      (mockGetWorkspace as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockWorkspace
      );
      (
        mockUpdateLastWorkspaceName as ReturnType<typeof vi.fn>
      ).mockResolvedValue(undefined);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useWorkspaceData(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.currentWorkspace).toEqual(mockWorkspace);
      expect(mockUpdateLastWorkspaceName).toHaveBeenCalledWith(
        'test-workspace'
      );
      expect(mockGetWorkspace).toHaveBeenCalledWith('test-workspace');
    });

    it('handles initialization error gracefully', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      (mockGetLastWorkspaceName as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      );
      (mockListWorkspaces as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockWorkspaceList
      );
      (mockGetWorkspace as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockWorkspace
      );
      (
        mockUpdateLastWorkspaceName as ReturnType<typeof vi.fn>
      ).mockResolvedValue(undefined);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useWorkspaceData(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to initialize workspace:',
        expect.any(Error)
      );
      // Should fallback to loading first available workspace
      expect(result.current.currentWorkspace).toEqual(mockWorkspace);

      consoleSpy.mockRestore();
    });

    it('handles case when no workspaces are available', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      (mockGetLastWorkspaceName as ReturnType<typeof vi.fn>).mockResolvedValue(
        null
      );
      (mockListWorkspaces as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useWorkspaceData(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.currentWorkspace).toBeNull();
      expect(result.current.workspaces).toEqual([]);
      expect(result.current.settings).toEqual(DEFAULT_WORKSPACE_SETTINGS);

      consoleSpy.mockRestore();
    });
  });

  describe('useWorkspaceData hook', () => {
    it('throws error when used outside WorkspaceDataProvider', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useWorkspaceData());
      }).toThrow(
        'useWorkspaceData must be used within a WorkspaceDataProvider'
      );

      consoleSpy.mockRestore();
    });

    it('returns workspace context when used within provider', async () => {
      (mockGetLastWorkspaceName as ReturnType<typeof vi.fn>).mockResolvedValue(
        null
      );
      (mockListWorkspaces as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useWorkspaceData(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current).toBeDefined();
      expect(typeof result.current).toBe('object');
    });

    it('maintains function stability across re-renders', async () => {
      (mockGetLastWorkspaceName as ReturnType<typeof vi.fn>).mockResolvedValue(
        null
      );
      (mockListWorkspaces as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const wrapper = createWrapper();
      const { result, rerender } = renderHook(() => useWorkspaceData(), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialFunctions = {
        loadWorkspaces: result.current.loadWorkspaces,
        loadWorkspaceData: result.current.loadWorkspaceData,
        setCurrentWorkspace: result.current.setCurrentWorkspace,
      };

      rerender();

      expect(result.current.loadWorkspaces).toBe(
        initialFunctions.loadWorkspaces
      );
      expect(result.current.loadWorkspaceData).toBe(
        initialFunctions.loadWorkspaceData
      );
      expect(result.current.setCurrentWorkspace).toBe(
        initialFunctions.setCurrentWorkspace
      );
    });
  });

  describe('loadWorkspaces functionality', () => {
    beforeEach(() => {
      (mockGetLastWorkspaceName as ReturnType<typeof vi.fn>).mockResolvedValue(
        null
      );
      (mockListWorkspaces as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    });

    it('loads workspaces successfully', async () => {
      (mockListWorkspaces as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockWorkspaceList
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useWorkspaceData(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let workspaces: Workspace[] | undefined;
      await act(async () => {
        workspaces = await result.current.loadWorkspaces();
      });

      expect(workspaces).toEqual(mockWorkspaceList);
      expect(result.current.workspaces).toEqual(mockWorkspaceList);
    });

    it('handles loadWorkspaces failure', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      (mockListWorkspaces as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([]) // Initial load
        .mockRejectedValueOnce(new Error('Failed to load workspaces'));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useWorkspaceData(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let workspaces: Workspace[] | undefined;
      await act(async () => {
        workspaces = await result.current.loadWorkspaces();
      });

      expect(workspaces).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load workspaces:',
        expect.any(Error)
      );
      expect(mockNotificationsShow).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to load workspaces list',
        color: 'red',
      });

      consoleSpy.mockRestore();
    });
  });

  describe('loadWorkspaceData functionality', () => {
    beforeEach(() => {
      (mockGetLastWorkspaceName as ReturnType<typeof vi.fn>).mockResolvedValue(
        null
      );
      (mockListWorkspaces as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    });

    it('loads workspace data successfully', async () => {
      (mockGetWorkspace as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockWorkspace
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useWorkspaceData(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.loadWorkspaceData('test-workspace');
      });

      expect(result.current.currentWorkspace).toEqual(mockWorkspace);
      expect(result.current.settings).toEqual(mockWorkspace);
      expect(mockGetWorkspace).toHaveBeenCalledWith('test-workspace');
      expect(mockUpdateColorScheme).toHaveBeenCalledWith('dark');
    });

    it('handles loadWorkspaceData failure', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      (mockGetWorkspace as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Workspace not found')
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useWorkspaceData(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.loadWorkspaceData('nonexistent-workspace');
      });

      expect(result.current.currentWorkspace).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load workspace data:',
        expect.any(Error)
      );
      expect(mockNotificationsShow).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to load workspace data',
        color: 'red',
      });

      consoleSpy.mockRestore();
    });

    it('updates theme when loading workspace', async () => {
      const lightThemeWorkspace = { ...mockWorkspace, theme: 'light' };
      (mockGetWorkspace as ReturnType<typeof vi.fn>).mockResolvedValue(
        lightThemeWorkspace
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useWorkspaceData(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.loadWorkspaceData('test-workspace');
      });

      expect(mockUpdateColorScheme).toHaveBeenCalledWith('light');
    });
  });

  describe('setCurrentWorkspace functionality', () => {
    beforeEach(() => {
      (mockGetLastWorkspaceName as ReturnType<typeof vi.fn>).mockResolvedValue(
        null
      );
      (mockListWorkspaces as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    });

    it('sets current workspace', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useWorkspaceData(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setCurrentWorkspace(mockWorkspace);
      });

      expect(result.current.currentWorkspace).toEqual(mockWorkspace);
      expect(result.current.settings).toEqual(mockWorkspace);
    });

    it('sets workspace to null', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useWorkspaceData(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Set a workspace first
      act(() => {
        result.current.setCurrentWorkspace(mockWorkspace);
      });

      expect(result.current.currentWorkspace).toEqual(mockWorkspace);

      // Then set it to null
      act(() => {
        result.current.setCurrentWorkspace(null);
      });

      expect(result.current.currentWorkspace).toBeNull();
      expect(result.current.settings).toEqual(DEFAULT_WORKSPACE_SETTINGS);
    });
  });

  describe('workspace state transitions', () => {
    beforeEach(() => {
      (mockGetLastWorkspaceName as ReturnType<typeof vi.fn>).mockResolvedValue(
        null
      );
      (mockListWorkspaces as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    });

    it('transitions from null to workspace', async () => {
      (mockGetWorkspace as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockWorkspace
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useWorkspaceData(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.currentWorkspace).toBeNull();

      await act(async () => {
        await result.current.loadWorkspaceData('test-workspace');
      });

      expect(result.current.currentWorkspace).toEqual(mockWorkspace);
    });

    it('transitions between different workspaces', async () => {
      (mockGetWorkspace as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockWorkspace)
        .mockResolvedValueOnce(mockWorkspace2);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useWorkspaceData(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Load first workspace
      await act(async () => {
        await result.current.loadWorkspaceData('test-workspace');
      });

      expect(result.current.currentWorkspace).toEqual(mockWorkspace);
      expect(mockUpdateColorScheme).toHaveBeenCalledWith('dark');

      // Load second workspace
      await act(async () => {
        await result.current.loadWorkspaceData('workspace-2');
      });

      expect(result.current.currentWorkspace).toEqual(mockWorkspace2);
      expect(mockUpdateColorScheme).toHaveBeenCalledWith('light');
    });
  });

  describe('context value structure', () => {
    it('provides expected context interface when no workspace loaded', async () => {
      (mockGetLastWorkspaceName as ReturnType<typeof vi.fn>).mockResolvedValue(
        null
      );
      (mockListWorkspaces as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useWorkspaceData(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.currentWorkspace).toBeNull();
      expect(result.current.workspaces).toEqual([]);
      expect(result.current.settings).toEqual(DEFAULT_WORKSPACE_SETTINGS);
      expect(result.current.loading).toBe(false);

      expect(typeof result.current.loadWorkspaces).toBe('function');
      expect(typeof result.current.loadWorkspaceData).toBe('function');
      expect(typeof result.current.setCurrentWorkspace).toBe('function');
    });

    it('provides correct context when workspace loaded', async () => {
      (mockGetLastWorkspaceName as ReturnType<typeof vi.fn>).mockResolvedValue(
        'test-workspace'
      );
      (mockGetWorkspace as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockWorkspace
      );
      (mockListWorkspaces as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockWorkspaceList
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useWorkspaceData(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.currentWorkspace).toEqual(mockWorkspace);
      expect(result.current.workspaces).toEqual(mockWorkspaceList);
      expect(result.current.settings).toEqual(mockWorkspace);
      expect(result.current.loading).toBe(false);

      expect(typeof result.current.loadWorkspaces).toBe('function');
      expect(typeof result.current.loadWorkspaceData).toBe('function');
      expect(typeof result.current.setCurrentWorkspace).toBe('function');
    });
  });

  describe('loading states', () => {
    it('shows loading during initialization', () => {
      let resolveGetLastWorkspaceName: (value: string | null) => void;
      const pendingPromise = new Promise<string | null>((resolve) => {
        resolveGetLastWorkspaceName = resolve;
      });
      (mockGetLastWorkspaceName as ReturnType<typeof vi.fn>).mockReturnValue(
        pendingPromise
      );
      (mockListWorkspaces as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useWorkspaceData(), { wrapper });

      expect(result.current.loading).toBe(true);

      act(() => {
        resolveGetLastWorkspaceName!(null);
      });
    });

    it('clears loading after initialization completes', async () => {
      (mockGetLastWorkspaceName as ReturnType<typeof vi.fn>).mockResolvedValue(
        'test-workspace'
      );
      (mockGetWorkspace as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockWorkspace
      );
      (mockListWorkspaces as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockWorkspaceList
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useWorkspaceData(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('clears loading after initialization fails', async () => {
      (mockGetLastWorkspaceName as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Init failed')
      );
      (mockListWorkspaces as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useWorkspaceData(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('error handling', () => {
    it('handles network errors during workspace loading', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      (mockGetLastWorkspaceName as ReturnType<typeof vi.fn>).mockResolvedValue(
        null
      );
      (mockListWorkspaces as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockGetWorkspace as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network unavailable')
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useWorkspaceData(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.loadWorkspaceData('test-workspace');
      });

      expect(mockNotificationsShow).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to load workspace data',
        color: 'red',
      });

      consoleSpy.mockRestore();
    });

    it('handles API errors during workspace list loading', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      (mockGetLastWorkspaceName as ReturnType<typeof vi.fn>).mockResolvedValue(
        null
      );
      (mockListWorkspaces as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([]) // Initial load
        .mockRejectedValueOnce(new Error('API Error'));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useWorkspaceData(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.loadWorkspaces();
      });

      expect(mockNotificationsShow).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Failed to load workspaces list',
        color: 'red',
      });

      consoleSpy.mockRestore();
    });
  });

  describe('integration with ThemeContext', () => {
    it('updates theme when workspace is loaded', async () => {
      (mockGetLastWorkspaceName as ReturnType<typeof vi.fn>).mockResolvedValue(
        'test-workspace'
      );
      (mockGetWorkspace as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockWorkspace
      );
      (mockListWorkspaces as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockWorkspaceList
      );

      const wrapper = createWrapper();
      renderHook(() => useWorkspaceData(), { wrapper });

      await waitFor(() => {
        expect(mockUpdateColorScheme).toHaveBeenCalledWith('dark');
      });
    });

    it('calls updateColorScheme when manually loading workspace', async () => {
      (mockGetLastWorkspaceName as ReturnType<typeof vi.fn>).mockResolvedValue(
        null
      );
      (mockListWorkspaces as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockGetWorkspace as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockWorkspace2
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useWorkspaceData(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.loadWorkspaceData('workspace-2');
      });

      expect(mockUpdateColorScheme).toHaveBeenCalledWith('light');
    });

    it('handles missing updateColorScheme gracefully', async () => {
      mockUseTheme.mockReturnValue({
        colorScheme: 'light',
        updateColorScheme: undefined,
      });

      (mockGetLastWorkspaceName as ReturnType<typeof vi.fn>).mockResolvedValue(
        'test-workspace'
      );
      (mockGetWorkspace as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockWorkspace
      );
      (mockListWorkspaces as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockWorkspaceList
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useWorkspaceData(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not throw even though updateColorScheme is undefined
      expect(result.current.currentWorkspace).toEqual(mockWorkspace);
    });
  });

  describe('concurrent operations', () => {
    it('handles concurrent loadWorkspaceData calls', async () => {
      (mockGetLastWorkspaceName as ReturnType<typeof vi.fn>).mockResolvedValue(
        null
      );
      (mockListWorkspaces as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (mockGetWorkspace as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockWorkspace)
        .mockResolvedValueOnce(mockWorkspace2);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useWorkspaceData(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Make concurrent calls
      await act(async () => {
        await Promise.all([
          result.current.loadWorkspaceData('test-workspace'),
          result.current.loadWorkspaceData('workspace-2'),
        ]);
      });

      expect(mockGetWorkspace).toHaveBeenCalledTimes(2);
      expect(mockGetWorkspace).toHaveBeenCalledWith('test-workspace');
      expect(mockGetWorkspace).toHaveBeenCalledWith('workspace-2');
    });

    it('handles concurrent loadWorkspaces calls', async () => {
      (mockGetLastWorkspaceName as ReturnType<typeof vi.fn>).mockResolvedValue(
        null
      );
      (mockListWorkspaces as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([]) // Initial load
        .mockResolvedValue(mockWorkspaceList) // Subsequent calls
        .mockResolvedValue(mockWorkspaceList);

      const wrapper = createWrapper();
      const { result } = renderHook(() => useWorkspaceData(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Make concurrent calls
      const [result1, result2] = await act(async () => {
        return Promise.all([
          result.current.loadWorkspaces(),
          result.current.loadWorkspaces(),
        ]);
      });

      expect(result1).toEqual(mockWorkspaceList);
      expect(result2).toEqual(mockWorkspaceList);
      expect(result.current.workspaces).toEqual(mockWorkspaceList);
    });
  });
});
