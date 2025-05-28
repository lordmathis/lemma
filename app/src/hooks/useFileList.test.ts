import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileList } from './useFileList';
import * as fileApi from '@/api/file';
import type { FileNode } from '@/types/models';

// Mock dependencies
vi.mock('@/api/file');

// Mock workspace context
const mockWorkspaceData: {
  currentWorkspace: { id: number; name: string } | null;
  loading: boolean;
} = {
  currentWorkspace: {
    id: 1,
    name: 'test-workspace',
  },
  loading: false,
};

vi.mock('../contexts/WorkspaceDataContext', () => ({
  useWorkspaceData: () => mockWorkspaceData,
}));

// Mock file data
const mockFiles: FileNode[] = [
  {
    id: '1',
    name: 'README.md',
    path: 'README.md',
  },
  {
    id: '2',
    name: 'docs',
    path: 'docs',
    children: [
      {
        id: '3',
        name: 'guide.md',
        path: 'docs/guide.md',
      },
    ],
  },
  {
    id: '4',
    name: 'notes.md',
    path: 'notes.md',
  },
];

describe('useFileList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset workspace data to defaults
    mockWorkspaceData.currentWorkspace = {
      id: 1,
      name: 'test-workspace',
    };
    mockWorkspaceData.loading = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('starts with empty files array', () => {
      const { result } = renderHook(() => useFileList());

      expect(result.current.files).toEqual([]);
      expect(typeof result.current.loadFileList).toBe('function');
    });

    it('provides loadFileList function', () => {
      const { result } = renderHook(() => useFileList());

      expect(typeof result.current.loadFileList).toBe('function');
    });
  });

  describe('loadFileList', () => {
    it('loads files successfully', async () => {
      const mockListFiles = vi.mocked(fileApi.listFiles);
      mockListFiles.mockResolvedValue(mockFiles);

      const { result } = renderHook(() => useFileList());

      await act(async () => {
        await result.current.loadFileList();
      });

      expect(result.current.files).toEqual(mockFiles);
      expect(mockListFiles).toHaveBeenCalledWith('test-workspace');
    });

    it('handles empty file list', async () => {
      const mockListFiles = vi.mocked(fileApi.listFiles);
      mockListFiles.mockResolvedValue([]);

      const { result } = renderHook(() => useFileList());

      await act(async () => {
        await result.current.loadFileList();
      });

      expect(result.current.files).toEqual([]);
      expect(mockListFiles).toHaveBeenCalledWith('test-workspace');
    });

    it('handles API errors gracefully', async () => {
      const mockListFiles = vi.mocked(fileApi.listFiles);
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockListFiles.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useFileList());

      await act(async () => {
        await result.current.loadFileList();
      });

      expect(result.current.files).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load file list:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('does not load when no workspace is available', async () => {
      mockWorkspaceData.currentWorkspace = null;

      const { result } = renderHook(() => useFileList());

      await act(async () => {
        await result.current.loadFileList();
      });

      expect(result.current.files).toEqual([]);
      expect(fileApi.listFiles).not.toHaveBeenCalled();
    });

    it('does not load when workspace is loading', async () => {
      mockWorkspaceData.loading = true;

      const { result } = renderHook(() => useFileList());

      await act(async () => {
        await result.current.loadFileList();
      });

      expect(result.current.files).toEqual([]);
      expect(fileApi.listFiles).not.toHaveBeenCalled();
    });

    it('can be called multiple times', async () => {
      const mockListFiles = vi.mocked(fileApi.listFiles);
      mockListFiles
        .mockResolvedValueOnce(mockFiles[0] ? [mockFiles[0]] : [])
        .mockResolvedValueOnce(mockFiles);

      const { result } = renderHook(() => useFileList());

      // First call
      await act(async () => {
        await result.current.loadFileList();
      });

      expect(result.current.files).toEqual([mockFiles[0]]);

      // Second call
      await act(async () => {
        await result.current.loadFileList();
      });

      expect(result.current.files).toEqual(mockFiles);
      expect(mockListFiles).toHaveBeenCalledTimes(2);
    });

    it('handles concurrent calls gracefully', async () => {
      const mockListFiles = vi.mocked(fileApi.listFiles);
      mockListFiles.mockResolvedValue(mockFiles);

      const { result } = renderHook(() => useFileList());

      await act(async () => {
        // Make multiple concurrent calls
        await Promise.all([
          result.current.loadFileList(),
          result.current.loadFileList(),
          result.current.loadFileList(),
        ]);
      });

      expect(result.current.files).toEqual(mockFiles);
      expect(mockListFiles).toHaveBeenCalledTimes(3);
    });
  });

  describe('workspace dependency', () => {
    it('uses correct workspace name for API calls', async () => {
      const mockListFiles = vi.mocked(fileApi.listFiles);
      mockListFiles.mockResolvedValue(mockFiles);

      const { result, rerender } = renderHook(() => useFileList());

      // Load with initial workspace
      await act(async () => {
        await result.current.loadFileList();
      });

      expect(mockListFiles).toHaveBeenCalledWith('test-workspace');

      // Change workspace
      mockWorkspaceData.currentWorkspace = {
        id: 2,
        name: 'different-workspace',
      };

      rerender();

      await act(async () => {
        await result.current.loadFileList();
      });

      expect(mockListFiles).toHaveBeenCalledWith('different-workspace');
    });

    it('handles workspace becoming null after successful load', async () => {
      const mockListFiles = vi.mocked(fileApi.listFiles);
      mockListFiles.mockResolvedValue(mockFiles);

      const { result, rerender } = renderHook(() => useFileList());

      // Load files with workspace
      await act(async () => {
        await result.current.loadFileList();
      });

      expect(result.current.files).toEqual(mockFiles);

      // Remove workspace
      mockWorkspaceData.currentWorkspace = null;
      rerender();

      // Try to load again
      await act(async () => {
        await result.current.loadFileList();
      });

      // Files should remain from previous load, but no new API call
      expect(result.current.files).toEqual(mockFiles);
      expect(mockListFiles).toHaveBeenCalledTimes(1);
    });

    it('handles workspace loading state changes', async () => {
      const mockListFiles = vi.mocked(fileApi.listFiles);
      mockListFiles.mockResolvedValue(mockFiles);

      const { result, rerender } = renderHook(() => useFileList());

      // Start with loading workspace
      mockWorkspaceData.loading = true;
      rerender();

      await act(async () => {
        await result.current.loadFileList();
      });

      expect(result.current.files).toEqual([]);
      expect(mockListFiles).not.toHaveBeenCalled();

      // Workspace finishes loading
      mockWorkspaceData.loading = false;
      rerender();

      await act(async () => {
        await result.current.loadFileList();
      });

      expect(result.current.files).toEqual(mockFiles);
      expect(mockListFiles).toHaveBeenCalledWith('test-workspace');
    });
  });

  describe('file data handling', () => {
    it('handles complex file tree structure', async () => {
      const complexFiles: FileNode[] = [
        {
          id: '1',
          name: 'root.md',
          path: 'root.md',
        },
        {
          id: '2',
          name: 'folder1',
          path: 'folder1',
          children: [
            {
              id: '3',
              name: 'subfolder',
              path: 'folder1/subfolder',
              children: [
                {
                  id: '4',
                  name: 'deep.md',
                  path: 'folder1/subfolder/deep.md',
                },
              ],
            },
            {
              id: '5',
              name: 'file1.md',
              path: 'folder1/file1.md',
            },
          ],
        },
      ];

      const mockListFiles = vi.mocked(fileApi.listFiles);
      mockListFiles.mockResolvedValue(complexFiles);

      const { result } = renderHook(() => useFileList());

      await act(async () => {
        await result.current.loadFileList();
      });

      expect(result.current.files).toEqual(complexFiles);
    });

    it('handles files with special characters', async () => {
      const specialFiles: FileNode[] = [
        {
          id: '1',
          name: 'file with spaces.md',
          path: 'file with spaces.md',
        },
        {
          id: '2',
          name: 'special-chars_123.md',
          path: 'special-chars_123.md',
        },
        {
          id: '3',
          name: 'unicode-文档.md',
          path: 'unicode-文档.md',
        },
      ];

      const mockListFiles = vi.mocked(fileApi.listFiles);
      mockListFiles.mockResolvedValue(specialFiles);

      const { result } = renderHook(() => useFileList());

      await act(async () => {
        await result.current.loadFileList();
      });

      expect(result.current.files).toEqual(specialFiles);
    });

    it('handles files without children property', async () => {
      const filesWithoutChildren: FileNode[] = [
        {
          id: '1',
          name: 'simple.md',
          path: 'simple.md',
        },
        {
          id: '2',
          name: 'another.md',
          path: 'another.md',
        },
      ];

      const mockListFiles = vi.mocked(fileApi.listFiles);
      mockListFiles.mockResolvedValue(filesWithoutChildren);

      const { result } = renderHook(() => useFileList());

      await act(async () => {
        await result.current.loadFileList();
      });

      expect(result.current.files).toEqual(filesWithoutChildren);
    });
  });

  describe('hook interface stability', () => {
    it('loadFileList function is stable across re-renders', () => {
      const { result, rerender } = renderHook(() => useFileList());

      const initialLoadFunction = result.current.loadFileList;

      rerender();

      expect(result.current.loadFileList).toBe(initialLoadFunction);
    });

    it('returns consistent interface', () => {
      const { result } = renderHook(() => useFileList());

      expect(Array.isArray(result.current.files)).toBe(true);
      expect(typeof result.current.loadFileList).toBe('function');
    });
  });

  describe('error recovery', () => {
    it('recovers from API errors on subsequent calls', async () => {
      const mockListFiles = vi.mocked(fileApi.listFiles);
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // First call fails
      mockListFiles.mockRejectedValueOnce(new Error('First error'));
      // Second call succeeds
      mockListFiles.mockResolvedValueOnce(mockFiles);

      const { result } = renderHook(() => useFileList());

      // First call - should fail
      await act(async () => {
        await result.current.loadFileList();
      });

      expect(result.current.files).toEqual([]);

      // Second call - should succeed
      await act(async () => {
        await result.current.loadFileList();
      });

      expect(result.current.files).toEqual(mockFiles);

      consoleSpy.mockRestore();
    });

    it('maintains previous data after error', async () => {
      const mockListFiles = vi.mocked(fileApi.listFiles);
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // First call succeeds
      mockListFiles.mockResolvedValueOnce(mockFiles);
      // Second call fails
      mockListFiles.mockRejectedValueOnce(new Error('Second error'));

      const { result } = renderHook(() => useFileList());

      // First call - should succeed
      await act(async () => {
        await result.current.loadFileList();
      });

      expect(result.current.files).toEqual(mockFiles);

      // Second call - should fail but maintain previous data
      await act(async () => {
        await result.current.loadFileList();
      });

      expect(result.current.files).toEqual([]);

      consoleSpy.mockRestore();
    });
  });
});
