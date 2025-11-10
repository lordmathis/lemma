import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFileNavigation } from './useFileNavigation';
import { DEFAULT_FILE } from '@/types/models';

// Mock dependencies
const mockWorkspaceData: {
  currentWorkspace: { id: number; name: string } | null;
} = {
  currentWorkspace: {
    id: 1,
    name: 'test-workspace',
  },
};

const mockLastOpenedFile = {
  loadLastOpenedFile: vi.fn(),
  saveLastOpenedFile: vi.fn(),
};

vi.mock('../contexts/WorkspaceDataContext', () => ({
  useWorkspaceData: () => mockWorkspaceData,
}));

vi.mock('./useLastOpenedFile', () => ({
  useLastOpenedFile: () => mockLastOpenedFile,
}));

describe('useFileNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset workspace data to defaults
    mockWorkspaceData.currentWorkspace = {
      id: 1,
      name: 'test-workspace',
    };
    // Default mock implementations
    mockLastOpenedFile.loadLastOpenedFile.mockResolvedValue(null);
    mockLastOpenedFile.saveLastOpenedFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('starts with default file selected', () => {
      const { result } = renderHook(() => useFileNavigation());

      expect(result.current.selectedFile).toBe(DEFAULT_FILE.path);
      expect(result.current.isNewFile).toBe(true);
      expect(typeof result.current.handleFileSelect).toBe('function');
    });

    it('loads last opened file on mount when available', async () => {
      mockLastOpenedFile.loadLastOpenedFile.mockResolvedValue(
        'documents/readme.md'
      );

      const { result } = renderHook(() => useFileNavigation());

      await waitFor(() => {
        expect(result.current.selectedFile).toBe('documents/readme.md');
        expect(result.current.isNewFile).toBe(false);
      });

      expect(mockLastOpenedFile.loadLastOpenedFile).toHaveBeenCalled();
      expect(mockLastOpenedFile.saveLastOpenedFile).not.toHaveBeenCalled();
    });

    it('stays with default file when no last opened file exists', async () => {
      mockLastOpenedFile.loadLastOpenedFile.mockResolvedValue(null);

      const { result } = renderHook(() => useFileNavigation());

      await waitFor(() => {
        expect(result.current.selectedFile).toBe(DEFAULT_FILE.path);
        expect(result.current.isNewFile).toBe(true);
      });

      expect(mockLastOpenedFile.loadLastOpenedFile).toHaveBeenCalled();
      expect(mockLastOpenedFile.saveLastOpenedFile).not.toHaveBeenCalled();
    });
  });

  describe('handleFileSelect', () => {
    it('selects a regular file correctly', async () => {
      const { result } = renderHook(() => useFileNavigation());

      await act(async () => {
        await result.current.handleFileSelect('notes/todo.md');
      });

      await waitFor(() => {
        expect(result.current.selectedFile).toBe('notes/todo.md');
        expect(result.current.isNewFile).toBe(false);
      });

      expect(mockLastOpenedFile.saveLastOpenedFile).toHaveBeenCalledWith(
        'notes/todo.md'
      );
    });

    it('handles null file selection (defaults to default file)', async () => {
      const { result } = renderHook(() => useFileNavigation());

      await act(async () => {
        await result.current.handleFileSelect(null);
      });

      expect(result.current.selectedFile).toBe(DEFAULT_FILE.path);
      expect(result.current.isNewFile).toBe(true);
      expect(mockLastOpenedFile.saveLastOpenedFile).not.toHaveBeenCalled();
    });

    it('handles empty string file selection with default file', async () => {
      const { result } = renderHook(() => useFileNavigation());

      await act(async () => {
        await result.current.handleFileSelect('');
      });

      expect(result.current.selectedFile).toBe(DEFAULT_FILE.path);
      expect(result.current.isNewFile).toBe(true);
      expect(mockLastOpenedFile.saveLastOpenedFile).not.toHaveBeenCalled();
    });

    it('preserves current selection when passed empty string with existing selection', async () => {
      const { result } = renderHook(() => useFileNavigation());

      // First select a valid file
      await act(async () => {
        await result.current.handleFileSelect('existing-file.md');
      });

      await waitFor(() => {
        expect(result.current.selectedFile).toBe('existing-file.md');
        expect(result.current.isNewFile).toBe(false);
      });

      vi.clearAllMocks();

      // Now send empty string
      await act(async () => {
        await result.current.handleFileSelect('');
      });

      // Selection should be preserved
      expect(result.current.selectedFile).toBe('existing-file.md');
      expect(result.current.isNewFile).toBe(false);
      expect(mockLastOpenedFile.saveLastOpenedFile).not.toHaveBeenCalled();
    });

    it('handles different file path formats', async () => {
      const { result } = renderHook(() => useFileNavigation());

      const testCases = [
        'simple.md',
        'folder/file.md',
        'deep/nested/path/document.md',
        'file with spaces.md',
        'special-chars_123.md',
        'unicode-文档.md',
      ];

      for (const filePath of testCases) {
        await act(async () => {
          await result.current.handleFileSelect(filePath);
        });

        await waitFor(() => {
          expect(result.current.selectedFile).toBe(filePath);
          expect(result.current.isNewFile).toBe(false);
        });

        expect(mockLastOpenedFile.saveLastOpenedFile).toHaveBeenCalledWith(
          filePath
        );
      }

      expect(mockLastOpenedFile.saveLastOpenedFile).toHaveBeenCalledTimes(
        testCases.length
      );
    });

    it('handles rapid file selections', async () => {
      const { result } = renderHook(() => useFileNavigation());

      const files = ['file1.md', 'file2.md', 'file3.md'];

      // Use sequential state updates instead of Promise.all for more predictable results
      for (const file of files) {
        await act(async () => {
          await result.current.handleFileSelect(file);
        });
      }

      // After all updates, we should have the last file selected
      await waitFor(() => {
        expect(result.current.selectedFile).toBe(files[files.length - 1]);
        expect(result.current.isNewFile).toBe(false);
      });

      expect(mockLastOpenedFile.saveLastOpenedFile).toHaveBeenCalledTimes(
        files.length
      );
    });

    it('handles file selection errors gracefully', async () => {
      mockLastOpenedFile.saveLastOpenedFile.mockRejectedValue(
        new Error('Save failed')
      );

      const { result } = renderHook(() => useFileNavigation());

      // Should not throw
      await act(async () => {
        await result.current.handleFileSelect('error-file.md');
      });

      // Wait for state update despite the error
      await waitFor(() => {
        expect(result.current.selectedFile).toBe('error-file.md');
        expect(result.current.isNewFile).toBe(false);
      });
    });
  });

  describe('workspace changes', () => {
    it('reinitializes when workspace changes', async () => {
      mockLastOpenedFile.loadLastOpenedFile
        .mockResolvedValueOnce('workspace1-file.md')
        .mockResolvedValueOnce('workspace2-file.md');

      const { result, rerender } = renderHook(() => useFileNavigation());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.selectedFile).toBe('workspace1-file.md');
      });

      expect(mockLastOpenedFile.loadLastOpenedFile).toHaveBeenCalledTimes(1);

      // Change workspace
      mockWorkspaceData.currentWorkspace = {
        id: 2,
        name: 'different-workspace',
      };

      rerender();

      // Should reinitialize with new workspace
      await waitFor(() => {
        expect(result.current.selectedFile).toBe('workspace2-file.md');
      });

      expect(mockLastOpenedFile.loadLastOpenedFile).toHaveBeenCalledTimes(2);
    });

    it('handles workspace becoming null', async () => {
      const { result, rerender } = renderHook(() => useFileNavigation());

      // Start with workspace
      await waitFor(() => {
        expect(mockLastOpenedFile.loadLastOpenedFile).toHaveBeenCalled();
      });

      // Remove workspace
      mockWorkspaceData.currentWorkspace = null;
      rerender();

      // Should still work but with default behavior
      expect(result.current.selectedFile).toBe(DEFAULT_FILE.path);
      expect(result.current.isNewFile).toBe(true);
    });

    it('handles workspace reappearing', async () => {
      mockLastOpenedFile.loadLastOpenedFile.mockResolvedValue(
        'restored-file.md'
      );

      const { result, rerender } = renderHook(() => useFileNavigation());

      // Start with no workspace
      mockWorkspaceData.currentWorkspace = null;
      rerender();

      // Add workspace back
      mockWorkspaceData.currentWorkspace = {
        id: 1,
        name: 'restored-workspace',
      };
      rerender();

      // Should reinitialize
      await waitFor(() => {
        expect(result.current.selectedFile).toBe('restored-file.md');
      });

      expect(mockLastOpenedFile.loadLastOpenedFile).toHaveBeenCalled();
    });
  });

  describe('initialization scenarios', () => {
    it('handles loadLastOpenedFile returning empty string', async () => {
      mockLastOpenedFile.loadLastOpenedFile.mockResolvedValue('');

      const { result } = renderHook(() => useFileNavigation());

      await waitFor(() => {
        expect(result.current.selectedFile).toBe(DEFAULT_FILE.path);
        expect(result.current.isNewFile).toBe(true);
      });
    });

    it('handles loadLastOpenedFile errors', async () => {
      mockLastOpenedFile.loadLastOpenedFile.mockRejectedValue(
        new Error('Load failed')
      );

      const { result } = renderHook(() => useFileNavigation());

      // Should fallback to default file
      await waitFor(() => {
        expect(result.current.selectedFile).toBe(DEFAULT_FILE.path);
        expect(result.current.isNewFile).toBe(true);
      });
    });

    it('handles successful load followed by handleFileSelect', async () => {
      mockLastOpenedFile.loadLastOpenedFile.mockResolvedValue(
        'initial-file.md'
      );

      const { result } = renderHook(() => useFileNavigation());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.selectedFile).toBe('initial-file.md');
        expect(result.current.isNewFile).toBe(false);
      });

      // Then select a different file
      await act(async () => {
        await result.current.handleFileSelect('different-file.md');
      });

      expect(result.current.selectedFile).toBe('different-file.md');
      expect(result.current.isNewFile).toBe(false);
      expect(mockLastOpenedFile.saveLastOpenedFile).toHaveBeenCalledWith(
        'different-file.md'
      );
    });
  });

  describe('state consistency', () => {
    it('maintains correct isNewFile state for default file', async () => {
      const { result } = renderHook(() => useFileNavigation());

      // Initially should be new file
      expect(result.current.selectedFile).toBe(DEFAULT_FILE.path);
      expect(result.current.isNewFile).toBe(true);

      // Select a real file
      await act(async () => {
        await result.current.handleFileSelect('real-file.md');
      });

      // Wait for state to update
      await waitFor(() => {
        expect(result.current.selectedFile).toBe('real-file.md');
        expect(result.current.isNewFile).toBe(false);
      });

      // Go back to null (should default to default file)
      await act(async () => {
        await result.current.handleFileSelect(null);
      });

      // Wait for state to update again
      await waitFor(() => {
        expect(result.current.selectedFile).toBe(DEFAULT_FILE.path);
        expect(result.current.isNewFile).toBe(true);
      });
    });

    it('maintains correct isNewFile state for regular files', async () => {
      const { result } = renderHook(() => useFileNavigation());

      const testFiles = ['file1.md', 'file2.md', 'folder/file3.md'];

      for (const file of testFiles) {
        await act(async () => {
          await result.current.handleFileSelect(file);
        });

        // Wait for each file selection to complete
        await waitFor(() => {
          expect(result.current.selectedFile).toBe(file);
          expect(result.current.isNewFile).toBe(false);
        });
      }
    });
  });

  describe('hook interface stability', () => {
    it('handleFileSelect function is stable across re-renders', () => {
      const { result, rerender } = renderHook(() => useFileNavigation());

      const initialHandler = result.current.handleFileSelect;

      rerender();

      expect(result.current.handleFileSelect).toBe(initialHandler);
    });

    it('returns consistent interface', () => {
      const { result } = renderHook(() => useFileNavigation());

      expect(typeof result.current.selectedFile).toBe('string');
      expect(typeof result.current.isNewFile).toBe('boolean');
      expect(typeof result.current.handleFileSelect).toBe('function');
    });
  });

  describe('integration with useLastOpenedFile', () => {
    it('calls loadLastOpenedFile on mount', async () => {
      renderHook(() => useFileNavigation());

      await waitFor(() => {
        expect(mockLastOpenedFile.loadLastOpenedFile).toHaveBeenCalled();
      });
    });

    it('calls saveLastOpenedFile when selecting files', async () => {
      const { result } = renderHook(() => useFileNavigation());

      await act(async () => {
        await result.current.handleFileSelect('test-file.md');
      });

      expect(mockLastOpenedFile.saveLastOpenedFile).toHaveBeenCalledWith(
        'test-file.md'
      );
    });

    it('does not call saveLastOpenedFile for null selections', async () => {
      const { result } = renderHook(() => useFileNavigation());

      await act(async () => {
        await result.current.handleFileSelect(null);
      });

      expect(mockLastOpenedFile.saveLastOpenedFile).not.toHaveBeenCalled();
    });

    it('handles saveLastOpenedFile errors without affecting state', async () => {
      mockLastOpenedFile.saveLastOpenedFile.mockRejectedValue(
        new Error('Save error')
      );

      const { result } = renderHook(() => useFileNavigation());

      await act(async () => {
        await result.current.handleFileSelect('test-file.md');
      });

      // State should still be updated despite save error
      await waitFor(() => {
        expect(result.current.selectedFile).toBe('test-file.md');
        expect(result.current.isNewFile).toBe(false);
      });
    });
  });
});
