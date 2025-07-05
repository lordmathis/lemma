import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWorkspace } from './useWorkspace';
import {
  Theme,
  type Workspace,
  DEFAULT_WORKSPACE_SETTINGS,
} from '@/types/models';
import type { MantineColorScheme } from '@mantine/core';

// Mock the constituent hooks
const mockWorkspaceData = {
  currentWorkspace: null as Workspace | null,
  workspaces: [] as Workspace[],
  settings: DEFAULT_WORKSPACE_SETTINGS,
  loading: false,
};

const mockTheme = {
  colorScheme: 'light' as MantineColorScheme,
  updateColorScheme: vi.fn(),
};

const mockWorkspaceOperations = {
  switchWorkspace: vi.fn(),
  deleteCurrentWorkspace: vi.fn(),
  updateSettings: vi.fn(),
};

vi.mock('../contexts/WorkspaceDataContext', () => ({
  useWorkspaceData: () => mockWorkspaceData,
}));

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => mockTheme,
}));

vi.mock('./useWorkspaceOperations', () => ({
  useWorkspaceOperations: () => mockWorkspaceOperations,
}));

// Mock workspace data
const mockWorkspace: Workspace = {
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

const mockWorkspaces: Workspace[] = [
  mockWorkspace,
  {
    id: 2,
    userId: 1,
    name: 'second-workspace',
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

describe('useWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock data to defaults
    mockWorkspaceData.currentWorkspace = null;
    mockWorkspaceData.workspaces = [];
    mockWorkspaceData.loading = false;
    mockTheme.colorScheme = 'light';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('returns default values when no workspace is loaded', () => {
      const { result } = renderHook(() => useWorkspace());

      expect(result.current.currentWorkspace).toBeNull();
      expect(result.current.workspaces).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.colorScheme).toBe('light');
    });

    it('provides all expected functions', () => {
      const { result } = renderHook(() => useWorkspace());

      expect(typeof result.current.updateSettings).toBe('function');
      expect(typeof result.current.updateColorScheme).toBe('function');
      expect(typeof result.current.switchWorkspace).toBe('function');
      expect(typeof result.current.deleteCurrentWorkspace).toBe('function');
    });
  });

  describe('workspace data integration', () => {
    it('returns current workspace data', () => {
      mockWorkspaceData.currentWorkspace = mockWorkspace;
      mockWorkspaceData.workspaces = mockWorkspaces;

      const { result } = renderHook(() => useWorkspace());

      expect(result.current.currentWorkspace).toEqual(mockWorkspace);
      expect(result.current.workspaces).toEqual(mockWorkspaces);
    });

    it('returns loading state from workspace data', () => {
      mockWorkspaceData.loading = true;

      const { result } = renderHook(() => useWorkspace());

      expect(result.current.loading).toBe(true);
    });
  });

  describe('theme integration', () => {
    it('returns color scheme from theme context', () => {
      mockTheme.colorScheme = 'dark';

      const { result } = renderHook(() => useWorkspace());

      expect(result.current.colorScheme).toBe('dark');
    });

    it('provides updateColorScheme function from theme context', () => {
      const { result } = renderHook(() => useWorkspace());

      expect(result.current.updateColorScheme).toBe(
        mockTheme.updateColorScheme
      );
    });
  });

  describe('workspace operations integration', () => {
    it('provides switchWorkspace function from operations', () => {
      const { result } = renderHook(() => useWorkspace());

      expect(result.current.switchWorkspace).toBe(
        mockWorkspaceOperations.switchWorkspace
      );
    });

    it('provides deleteCurrentWorkspace function from operations', () => {
      const { result } = renderHook(() => useWorkspace());

      expect(result.current.deleteCurrentWorkspace).toBe(
        mockWorkspaceOperations.deleteCurrentWorkspace
      );
    });

    it('provides updateSettings function from operations', () => {
      const { result } = renderHook(() => useWorkspace());

      expect(result.current.updateSettings).toBe(
        mockWorkspaceOperations.updateSettings
      );
    });
  });

  describe('data consistency', () => {
    it('returns consistent data across multiple renders', () => {
      mockWorkspaceData.currentWorkspace = mockWorkspace;
      mockWorkspaceData.workspaces = mockWorkspaces;
      mockTheme.colorScheme = 'dark';

      const { result, rerender } = renderHook(() => useWorkspace());

      const firstResult = { ...result.current };

      rerender();

      expect(result.current.currentWorkspace).toEqual(
        firstResult.currentWorkspace
      );
      expect(result.current.workspaces).toEqual(firstResult.workspaces);
      expect(result.current.colorScheme).toEqual(firstResult.colorScheme);
    });

    it('reflects changes in underlying data', () => {
      const { result, rerender } = renderHook(() => useWorkspace());

      // Initially no workspace
      expect(result.current.currentWorkspace).toBeNull();
      expect(result.current.workspaces).toEqual([]);

      // Add workspace data
      mockWorkspaceData.currentWorkspace = mockWorkspace;
      mockWorkspaceData.workspaces = mockWorkspaces;

      rerender();

      expect(result.current.currentWorkspace).toEqual(mockWorkspace);
      expect(result.current.workspaces).toEqual(mockWorkspaces);
    });

    it('reflects theme changes', () => {
      const { result, rerender } = renderHook(() => useWorkspace());

      // Initially light theme
      expect(result.current.colorScheme).toBe('light');

      // Change to dark theme
      mockTheme.colorScheme = 'dark';

      rerender();

      expect(result.current.colorScheme).toBe('dark');
    });

    it('reflects loading state changes', () => {
      const { result, rerender } = renderHook(() => useWorkspace());

      // Initially not loading
      expect(result.current.loading).toBe(false);

      // Change to loading
      mockWorkspaceData.loading = true;

      rerender();

      expect(result.current.loading).toBe(true);
    });
  });

  describe('function stability', () => {
    it('maintains stable function references across re-renders', () => {
      const { result, rerender } = renderHook(() => useWorkspace());

      const initialFunctions = {
        updateSettings: result.current.updateSettings,
        updateColorScheme: result.current.updateColorScheme,
        switchWorkspace: result.current.switchWorkspace,
        deleteCurrentWorkspace: result.current.deleteCurrentWorkspace,
      };

      rerender();

      expect(result.current.updateSettings).toBe(
        initialFunctions.updateSettings
      );
      expect(result.current.updateColorScheme).toBe(
        initialFunctions.updateColorScheme
      );
      expect(result.current.switchWorkspace).toBe(
        initialFunctions.switchWorkspace
      );
      expect(result.current.deleteCurrentWorkspace).toBe(
        initialFunctions.deleteCurrentWorkspace
      );
    });

    it('maintains stable function references when data changes', () => {
      const { result, rerender } = renderHook(() => useWorkspace());

      const initialFunctions = {
        updateSettings: result.current.updateSettings,
        updateColorScheme: result.current.updateColorScheme,
        switchWorkspace: result.current.switchWorkspace,
        deleteCurrentWorkspace: result.current.deleteCurrentWorkspace,
      };

      // Change data
      mockWorkspaceData.currentWorkspace = mockWorkspace;
      mockWorkspaceData.workspaces = mockWorkspaces;
      mockTheme.colorScheme = 'dark';

      rerender();

      expect(result.current.updateSettings).toBe(
        initialFunctions.updateSettings
      );
      expect(result.current.updateColorScheme).toBe(
        initialFunctions.updateColorScheme
      );
      expect(result.current.switchWorkspace).toBe(
        initialFunctions.switchWorkspace
      );
      expect(result.current.deleteCurrentWorkspace).toBe(
        initialFunctions.deleteCurrentWorkspace
      );
    });
  });

  describe('hook interface', () => {
    it('returns correct interface structure', () => {
      const { result } = renderHook(() => useWorkspace());

      const expectedKeys = [
        'currentWorkspace',
        'workspaces',
        'updateSettings',
        'loading',
        'colorScheme',
        'updateColorScheme',
        'switchWorkspace',
        'deleteCurrentWorkspace',
      ];

      expectedKeys.forEach((key) => {
        expect(key in result.current).toBe(true);
      });
    });

    it('returns correct types for all properties', () => {
      const { result } = renderHook(() => useWorkspace());

      expect(
        result.current.currentWorkspace === null ||
          typeof result.current.currentWorkspace === 'object'
      ).toBe(true);
      expect(Array.isArray(result.current.workspaces)).toBe(true);
      expect(typeof result.current.updateSettings === 'function').toBe(true);
      expect(typeof result.current.loading === 'boolean').toBe(true);
      expect(typeof result.current.colorScheme === 'string').toBe(true);
      expect(typeof result.current.updateColorScheme === 'function').toBe(true);
      expect(typeof result.current.switchWorkspace === 'function').toBe(true);
      expect(typeof result.current.deleteCurrentWorkspace === 'function').toBe(
        true
      );
    });
  });

  describe('edge cases', () => {
    it('handles undefined workspace data gracefully', () => {
      // Simulate undefined data that might occur during loading
      mockWorkspaceData.currentWorkspace = null;
      mockWorkspaceData.workspaces = [];

      const { result } = renderHook(() => useWorkspace());

      expect(result.current.currentWorkspace).toBeNull();
      expect(result.current.workspaces).toEqual([]);
      expect(typeof result.current.updateSettings).toBe('function');
    });

    it('handles empty workspaces array', () => {
      mockWorkspaceData.workspaces = [];

      const { result } = renderHook(() => useWorkspace());

      expect(result.current.workspaces).toEqual([]);
    });

    it('handles single workspace', () => {
      const singleWorkspace = [mockWorkspace];
      mockWorkspaceData.workspaces = singleWorkspace;
      mockWorkspaceData.currentWorkspace = mockWorkspace;

      const { result } = renderHook(() => useWorkspace());

      expect(result.current.workspaces).toEqual(singleWorkspace);
      expect(result.current.currentWorkspace).toEqual(mockWorkspace);
    });

    it('handles workspace with minimal data', () => {
      const minimalWorkspace: Workspace = {
        name: 'minimal',
        createdAt: Date.now(),
        ...DEFAULT_WORKSPACE_SETTINGS,
      };

      mockWorkspaceData.currentWorkspace = minimalWorkspace;

      const { result } = renderHook(() => useWorkspace());

      expect(result.current.currentWorkspace).toEqual(minimalWorkspace);
    });
  });

  describe('integration scenarios', () => {
    it('provides complete workspace management interface', () => {
      mockWorkspaceData.currentWorkspace = mockWorkspace;
      mockWorkspaceData.workspaces = mockWorkspaces;
      mockTheme.colorScheme = 'light';

      const { result } = renderHook(() => useWorkspace());

      // Should have all data
      expect(result.current.currentWorkspace).toEqual(mockWorkspace);
      expect(result.current.workspaces).toEqual(mockWorkspaces);
      expect(result.current.colorScheme).toBe('light');

      // Should have all operations
      expect(typeof result.current.updateSettings).toBe('function');
      expect(typeof result.current.switchWorkspace).toBe('function');
      expect(typeof result.current.deleteCurrentWorkspace).toBe('function');
      expect(typeof result.current.updateColorScheme).toBe('function');
    });

    it('supports workspace switching workflow', () => {
      const { result } = renderHook(() => useWorkspace());

      // Initially no workspace
      expect(result.current.currentWorkspace).toBeNull();

      // Should provide switch function
      expect(typeof result.current.switchWorkspace).toBe('function');
      expect(result.current.switchWorkspace).toBe(
        mockWorkspaceOperations.switchWorkspace
      );
    });

    it('supports settings management workflow', () => {
      mockWorkspaceData.currentWorkspace = mockWorkspace;

      const { result } = renderHook(() => useWorkspace());

      // Should provide update function
      expect(typeof result.current.updateSettings).toBe('function');
      expect(result.current.updateSettings).toBe(
        mockWorkspaceOperations.updateSettings
      );
    });

    it('supports theme management workflow', () => {
      mockTheme.colorScheme = 'dark';

      const { result } = renderHook(() => useWorkspace());

      // Should have current color scheme
      expect(result.current.colorScheme).toBe('dark');

      // Should provide update function
      expect(typeof result.current.updateColorScheme).toBe('function');
      expect(result.current.updateColorScheme).toBe(
        mockTheme.updateColorScheme
      );
    });
  });

  describe('mock integration validation', () => {
    it('correctly integrates with WorkspaceDataContext mock', () => {
      mockWorkspaceData.currentWorkspace = mockWorkspace;
      mockWorkspaceData.workspaces = mockWorkspaces;
      mockWorkspaceData.loading = true;

      const { result } = renderHook(() => useWorkspace());

      expect(result.current.currentWorkspace).toBe(
        mockWorkspaceData.currentWorkspace
      );
      expect(result.current.workspaces).toBe(mockWorkspaceData.workspaces);
      expect(result.current.loading).toBe(mockWorkspaceData.loading);
    });

    it('correctly integrates with ThemeContext mock', () => {
      mockTheme.colorScheme = 'dark';

      const { result } = renderHook(() => useWorkspace());

      expect(result.current.colorScheme).toBe(mockTheme.colorScheme);
      expect(result.current.updateColorScheme).toBe(
        mockTheme.updateColorScheme
      );
    });

    it('correctly integrates with useWorkspaceOperations mock', () => {
      const { result } = renderHook(() => useWorkspace());

      expect(result.current.switchWorkspace).toBe(
        mockWorkspaceOperations.switchWorkspace
      );
      expect(result.current.deleteCurrentWorkspace).toBe(
        mockWorkspaceOperations.deleteCurrentWorkspace
      );
      expect(result.current.updateSettings).toBe(
        mockWorkspaceOperations.updateSettings
      );
    });
  });
});
