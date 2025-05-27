import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLastOpenedFile } from './useLastOpenedFile';
import * as fileApi from '@/api/file';

// Mock dependencies
vi.mock('@/api/file');

// Mock the workspace context
const mockWorkspaceData: {
  currentWorkspace: { id: number; name: string } | null;
} = {
  currentWorkspace: {
    id: 1,
    name: 'test-workspace',
  },
};

vi.mock('../contexts/WorkspaceDataContext', () => ({
  useWorkspaceData: () => mockWorkspaceData,
}));

describe('useLastOpenedFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset workspace data to defaults
    mockWorkspaceData.currentWorkspace = {
      id: 1,
      name: 'test-workspace',
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadLastOpenedFile', () => {
    it('loads last opened file successfully', async () => {
      const mockGetLastOpenedFile = vi.mocked(fileApi.getLastOpenedFile);
      mockGetLastOpenedFile.mockResolvedValue('documents/readme.md');

      const { result } = renderHook(() => useLastOpenedFile());

      let lastFile: string | null = '';
      await act(async () => {
        lastFile = await result.current.loadLastOpenedFile();
      });

      expect(lastFile).toBe('documents/readme.md');
      expect(mockGetLastOpenedFile).toHaveBeenCalledWith('test-workspace');
    });

    it('returns null for empty response', async () => {
      const mockGetLastOpenedFile = vi.mocked(fileApi.getLastOpenedFile);
      mockGetLastOpenedFile.mockResolvedValue('');

      const { result } = renderHook(() => useLastOpenedFile());

      let lastFile: string | null = '';
      await act(async () => {
        lastFile = await result.current.loadLastOpenedFile();
      });

      expect(lastFile).toBeNull();
      expect(mockGetLastOpenedFile).toHaveBeenCalledWith('test-workspace');
    });

    it('handles API errors gracefully', async () => {
      const mockGetLastOpenedFile = vi.mocked(fileApi.getLastOpenedFile);
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockGetLastOpenedFile.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useLastOpenedFile());

      let lastFile: string | null = '';
      await act(async () => {
        lastFile = await result.current.loadLastOpenedFile();
      });

      expect(lastFile).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load last opened file:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('returns null when no workspace is available', async () => {
      mockWorkspaceData.currentWorkspace = null;

      const { result } = renderHook(() => useLastOpenedFile());

      let lastFile: string | null = '';
      await act(async () => {
        lastFile = await result.current.loadLastOpenedFile();
      });

      expect(lastFile).toBeNull();
      expect(fileApi.getLastOpenedFile).not.toHaveBeenCalled();
    });

    it('handles different file path formats', async () => {
      const mockGetLastOpenedFile = vi.mocked(fileApi.getLastOpenedFile);

      // Test various file path formats
      const testCases = [
        'simple.md',
        'folder/file.md',
        'deep/nested/path/document.md',
        'file with spaces.md',
        'special-chars_123.md',
      ];

      const { result } = renderHook(() => useLastOpenedFile());

      for (const testPath of testCases) {
        mockGetLastOpenedFile.mockResolvedValueOnce(testPath);

        let lastFile: string | null = '';
        await act(async () => {
          lastFile = await result.current.loadLastOpenedFile();
        });

        expect(lastFile).toBe(testPath);
      }

      expect(mockGetLastOpenedFile).toHaveBeenCalledTimes(testCases.length);
    });
  });

  describe('saveLastOpenedFile', () => {
    it('saves last opened file successfully', async () => {
      const mockUpdateLastOpenedFile = vi.mocked(fileApi.updateLastOpenedFile);
      mockUpdateLastOpenedFile.mockResolvedValue(undefined);

      const { result } = renderHook(() => useLastOpenedFile());

      await act(async () => {
        await result.current.saveLastOpenedFile('notes/todo.md');
      });

      expect(mockUpdateLastOpenedFile).toHaveBeenCalledWith(
        'test-workspace',
        'notes/todo.md'
      );
    });

    it('handles API errors gracefully', async () => {
      const mockUpdateLastOpenedFile = vi.mocked(fileApi.updateLastOpenedFile);
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockUpdateLastOpenedFile.mockRejectedValue(new Error('Save Error'));

      const { result } = renderHook(() => useLastOpenedFile());

      await act(async () => {
        await result.current.saveLastOpenedFile('error.md');
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save last opened file:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('does nothing when no workspace is available', async () => {
      mockWorkspaceData.currentWorkspace = null;

      const { result } = renderHook(() => useLastOpenedFile());

      await act(async () => {
        await result.current.saveLastOpenedFile('test.md');
      });

      expect(fileApi.updateLastOpenedFile).not.toHaveBeenCalled();
    });

    it('handles different file path formats', async () => {
      const mockUpdateLastOpenedFile = vi.mocked(fileApi.updateLastOpenedFile);
      mockUpdateLastOpenedFile.mockResolvedValue(undefined);

      const testCases = [
        'simple.md',
        'folder/file.md',
        'deep/nested/path/document.md',
        'file with spaces.md',
        'special-chars_123.md',
        'unicode-文件.md',
      ];

      const { result } = renderHook(() => useLastOpenedFile());

      for (const testPath of testCases) {
        await act(async () => {
          await result.current.saveLastOpenedFile(testPath);
        });

        expect(mockUpdateLastOpenedFile).toHaveBeenCalledWith(
          'test-workspace',
          testPath
        );
      }

      expect(mockUpdateLastOpenedFile).toHaveBeenCalledTimes(testCases.length);
    });

    it('handles empty file path', async () => {
      const mockUpdateLastOpenedFile = vi.mocked(fileApi.updateLastOpenedFile);
      mockUpdateLastOpenedFile.mockResolvedValue(undefined);

      const { result } = renderHook(() => useLastOpenedFile());

      await act(async () => {
        await result.current.saveLastOpenedFile('');
      });

      expect(mockUpdateLastOpenedFile).toHaveBeenCalledWith(
        'test-workspace',
        ''
      );
    });
  });

  describe('workspace dependency', () => {
    it('handles workspace changes correctly', async () => {
      const mockGetLastOpenedFile = vi.mocked(fileApi.getLastOpenedFile);
      const mockUpdateLastOpenedFile = vi.mocked(fileApi.updateLastOpenedFile);

      mockGetLastOpenedFile.mockResolvedValue('file.md');
      mockUpdateLastOpenedFile.mockResolvedValue(undefined);

      const { result, rerender } = renderHook(() => useLastOpenedFile());

      // Test with initial workspace
      await act(async () => {
        await result.current.loadLastOpenedFile();
        await result.current.saveLastOpenedFile('test.md');
      });

      expect(mockGetLastOpenedFile).toHaveBeenCalledWith('test-workspace');
      expect(mockUpdateLastOpenedFile).toHaveBeenCalledWith(
        'test-workspace',
        'test.md'
      );

      // Change workspace
      mockWorkspaceData.currentWorkspace = {
        id: 2,
        name: 'different-workspace',
      };

      rerender();

      await act(async () => {
        await result.current.loadLastOpenedFile();
        await result.current.saveLastOpenedFile('other.md');
      });

      expect(mockGetLastOpenedFile).toHaveBeenCalledWith('different-workspace');
      expect(mockUpdateLastOpenedFile).toHaveBeenCalledWith(
        'different-workspace',
        'other.md'
      );
    });

    it('handles workspace becoming null', async () => {
      const { result, rerender } = renderHook(() => useLastOpenedFile());

      // Start with workspace
      expect(mockWorkspaceData.currentWorkspace).not.toBeNull();

      // Remove workspace
      mockWorkspaceData.currentWorkspace = null;
      rerender();

      let lastFile: string | null = '';
      await act(async () => {
        lastFile = await result.current.loadLastOpenedFile();
        await result.current.saveLastOpenedFile('test.md');
      });

      expect(lastFile).toBeNull();
      expect(fileApi.getLastOpenedFile).not.toHaveBeenCalled();
      expect(fileApi.updateLastOpenedFile).not.toHaveBeenCalled();
    });
  });

  describe('hook interface', () => {
    it('returns correct function interface', () => {
      const { result } = renderHook(() => useLastOpenedFile());

      expect(typeof result.current.loadLastOpenedFile).toBe('function');
      expect(typeof result.current.saveLastOpenedFile).toBe('function');
    });

    it('functions are stable across re-renders', () => {
      const { result, rerender } = renderHook(() => useLastOpenedFile());

      const initialHandlers = {
        loadLastOpenedFile: result.current.loadLastOpenedFile,
        saveLastOpenedFile: result.current.saveLastOpenedFile,
      };

      rerender();

      expect(result.current.loadLastOpenedFile).toBe(
        initialHandlers.loadLastOpenedFile
      );
      expect(result.current.saveLastOpenedFile).toBe(
        initialHandlers.saveLastOpenedFile
      );
    });
  });

  describe('integration scenarios', () => {
    it('handles load after save', async () => {
      const mockGetLastOpenedFile = vi.mocked(fileApi.getLastOpenedFile);
      const mockUpdateLastOpenedFile = vi.mocked(fileApi.updateLastOpenedFile);

      mockUpdateLastOpenedFile.mockResolvedValue(undefined);
      mockGetLastOpenedFile.mockResolvedValue('saved-file.md');

      const { result } = renderHook(() => useLastOpenedFile());

      // Save a file
      await act(async () => {
        await result.current.saveLastOpenedFile('saved-file.md');
      });

      // Load the last opened file
      let lastFile: string | null = '';
      await act(async () => {
        lastFile = await result.current.loadLastOpenedFile();
      });

      expect(lastFile).toBe('saved-file.md');
      expect(mockUpdateLastOpenedFile).toHaveBeenCalledWith(
        'test-workspace',
        'saved-file.md'
      );
      expect(mockGetLastOpenedFile).toHaveBeenCalledWith('test-workspace');
    });

    it('handles multiple rapid saves', async () => {
      const mockUpdateLastOpenedFile = vi.mocked(fileApi.updateLastOpenedFile);
      mockUpdateLastOpenedFile.mockResolvedValue(undefined);

      const { result } = renderHook(() => useLastOpenedFile());

      const filePaths = ['file1.md', 'file2.md', 'file3.md'];

      // Rapidly save multiple files
      await act(async () => {
        await Promise.all(
          filePaths.map((path) => result.current.saveLastOpenedFile(path))
        );
      });

      expect(mockUpdateLastOpenedFile).toHaveBeenCalledTimes(3);
      filePaths.forEach((path) => {
        expect(mockUpdateLastOpenedFile).toHaveBeenCalledWith(
          'test-workspace',
          path
        );
      });
    });
  });
});
