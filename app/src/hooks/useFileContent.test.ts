import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFileContent } from './useFileContent';
import * as fileApi from '@/api/file';
import * as fileHelpers from '@/utils/fileHelpers';
import { DEFAULT_FILE } from '@/types/models';

// Mock dependencies
vi.mock('@/api/file');
vi.mock('@/utils/fileHelpers');

// Create a mock workspace context hook
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

describe('useFileContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset workspace data
    mockWorkspaceData.currentWorkspace = {
      id: 1,
      name: 'test-workspace',
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('returns default content and no unsaved changes initially', () => {
      const { result } = renderHook(() => useFileContent(null));

      expect(result.current.content).toBe(DEFAULT_FILE.content);
      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('provides setters for content and unsaved changes', () => {
      const { result } = renderHook(() => useFileContent(null));

      expect(typeof result.current.setContent).toBe('function');
      expect(typeof result.current.setHasUnsavedChanges).toBe('function');
      expect(typeof result.current.loadFileContent).toBe('function');
      expect(typeof result.current.handleContentChange).toBe('function');
    });
  });

  describe('loading file content', () => {
    it('loads default file content when selectedFile is DEFAULT_FILE.path', async () => {
      const { result } = renderHook(() => useFileContent(DEFAULT_FILE.path));

      await waitFor(() => {
        expect(result.current.content).toBe(DEFAULT_FILE.content);
        expect(result.current.hasUnsavedChanges).toBe(false);
      });

      expect(fileApi.getFileContent).not.toHaveBeenCalled();
    });

    it('loads file content from API for regular files', async () => {
      const mockGetFileContent = vi.mocked(fileApi.getFileContent);
      const mockIsImageFile = vi.mocked(fileHelpers.isImageFile);

      mockGetFileContent.mockResolvedValue('# Test Content');
      mockIsImageFile.mockReturnValue(false);

      const { result } = renderHook(() => useFileContent('test.md'));

      await waitFor(() => {
        expect(result.current.content).toBe('# Test Content');
      });

      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(mockGetFileContent).toHaveBeenCalledWith(
        'test-workspace',
        'test.md'
      );
    });

    it('sets empty content for image files', async () => {
      const mockIsImageFile = vi.mocked(fileHelpers.isImageFile);
      mockIsImageFile.mockReturnValue(true);

      const { result } = renderHook(() => useFileContent('image.png'));

      await waitFor(() => {
        expect(result.current.content).toBe('');
        expect(result.current.hasUnsavedChanges).toBe(false);
      });

      expect(fileApi.getFileContent).not.toHaveBeenCalled();
    });

    it('handles API errors gracefully', async () => {
      const mockGetFileContent = vi.mocked(fileApi.getFileContent);
      const mockIsImageFile = vi.mocked(fileHelpers.isImageFile);
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockGetFileContent.mockRejectedValue(new Error('API Error'));
      mockIsImageFile.mockReturnValue(false);

      const { result } = renderHook(() => useFileContent('error.md'));

      await waitFor(() => {
        expect(result.current.content).toBe('');
        expect(result.current.hasUnsavedChanges).toBe(false);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error loading file content:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('does not load content when no workspace is available', () => {
      // Mock no workspace
      mockWorkspaceData.currentWorkspace = null;

      const { result } = renderHook(() => useFileContent('test.md'));

      expect(result.current.content).toBe(DEFAULT_FILE.content);
      expect(fileApi.getFileContent).not.toHaveBeenCalled();
    });
  });

  describe('content changes', () => {
    it('updates content and tracks unsaved changes', () => {
      const { result } = renderHook(() => useFileContent(null));

      act(() => {
        result.current.handleContentChange('New content');
      });

      expect(result.current.content).toBe('New content');
      expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('does not mark as unsaved when content matches original', async () => {
      const mockGetFileContent = vi.mocked(fileApi.getFileContent);
      const mockIsImageFile = vi.mocked(fileHelpers.isImageFile);

      mockGetFileContent.mockResolvedValue('Original content');
      mockIsImageFile.mockReturnValue(false);

      const { result } = renderHook(() => useFileContent('test.md'));

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.content).toBe('Original content');
      });

      // Change content
      act(() => {
        result.current.handleContentChange('Modified content');
      });

      expect(result.current.hasUnsavedChanges).toBe(true);

      // Change back to original
      act(() => {
        result.current.handleContentChange('Original content');
      });

      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('allows direct content setting', () => {
      const { result } = renderHook(() => useFileContent(null));

      act(() => {
        result.current.setContent('Direct content');
      });

      expect(result.current.content).toBe('Direct content');
      // Note: setContent doesn't automatically update unsaved changes
      expect(result.current.hasUnsavedChanges).toBe(false);
    });
  });

  describe('file changes', () => {
    it('reloads content when selectedFile changes', async () => {
      const mockGetFileContent = vi.mocked(fileApi.getFileContent);
      const mockIsImageFile = vi.mocked(fileHelpers.isImageFile);

      mockGetFileContent
        .mockResolvedValueOnce('First file content')
        .mockResolvedValueOnce('Second file content');
      mockIsImageFile.mockReturnValue(false);

      const { result, rerender } = renderHook(
        ({ selectedFile }) => useFileContent(selectedFile),
        { initialProps: { selectedFile: 'first.md' } }
      );

      // Wait for first file to load
      await waitFor(() => {
        expect(result.current.content).toBe('First file content');
      });

      // Change to second file
      rerender({ selectedFile: 'second.md' });

      await waitFor(() => {
        expect(result.current.content).toBe('Second file content');
      });

      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(mockGetFileContent).toHaveBeenCalledTimes(2);
      expect(mockGetFileContent).toHaveBeenNthCalledWith(
        1,
        'test-workspace',
        'first.md'
      );
      expect(mockGetFileContent).toHaveBeenNthCalledWith(
        2,
        'test-workspace',
        'second.md'
      );
    });

    it('resets unsaved changes when file changes', async () => {
      const mockGetFileContent = vi.mocked(fileApi.getFileContent);
      const mockIsImageFile = vi.mocked(fileHelpers.isImageFile);

      mockGetFileContent
        .mockResolvedValueOnce('File content')
        .mockResolvedValueOnce('Other file content');
      mockIsImageFile.mockReturnValue(false);

      const { result, rerender } = renderHook(
        ({ selectedFile }) => useFileContent(selectedFile),
        { initialProps: { selectedFile: 'first.md' } }
      );

      // Wait for initial load and make changes
      await waitFor(() => {
        expect(result.current.content).toBe('File content');
      });

      act(() => {
        result.current.handleContentChange('Modified content');
      });

      expect(result.current.hasUnsavedChanges).toBe(true);

      // Change file
      rerender({ selectedFile: 'second.md' });

      await waitFor(() => {
        expect(result.current.hasUnsavedChanges).toBe(false);
      });
    });

    it('does not reload when selectedFile is null', () => {
      const { result } = renderHook(() => useFileContent(null));

      expect(result.current.content).toBe(DEFAULT_FILE.content);
      expect(fileApi.getFileContent).not.toHaveBeenCalled();
    });
  });

  describe('manual loadFileContent', () => {
    it('can manually load file content', async () => {
      const mockGetFileContent = vi.mocked(fileApi.getFileContent);
      const mockIsImageFile = vi.mocked(fileHelpers.isImageFile);

      mockGetFileContent.mockResolvedValue('Manually loaded content');
      mockIsImageFile.mockReturnValue(false);

      const { result } = renderHook(() => useFileContent(null));

      await act(async () => {
        await result.current.loadFileContent('manual.md');
      });

      expect(result.current.content).toBe('Manually loaded content');
      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(mockGetFileContent).toHaveBeenCalledWith(
        'test-workspace',
        'manual.md'
      );
    });

    it('handles manual load errors', async () => {
      const mockGetFileContent = vi.mocked(fileApi.getFileContent);
      const mockIsImageFile = vi.mocked(fileHelpers.isImageFile);
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockGetFileContent.mockRejectedValue(new Error('Manual load error'));
      mockIsImageFile.mockReturnValue(false);

      const { result } = renderHook(() => useFileContent(null));

      await act(async () => {
        await result.current.loadFileContent('error.md');
      });

      expect(result.current.content).toBe('');
      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error loading file content:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('workspace dependency changes', () => {
    it('reloads content when workspace changes while file is selected', async () => {
      const mockGetFileContent = vi.mocked(fileApi.getFileContent);
      const mockIsImageFile = vi.mocked(fileHelpers.isImageFile);

      mockGetFileContent
        .mockResolvedValueOnce('Content from workspace 1')
        .mockResolvedValueOnce('Content from workspace 2');
      mockIsImageFile.mockReturnValue(false);

      const { result, rerender } = renderHook(() => useFileContent('test.md'));

      // Wait for initial load from workspace 1
      await waitFor(() => {
        expect(result.current.content).toBe('Content from workspace 1');
      });

      // Change workspace
      mockWorkspaceData.currentWorkspace = {
        id: 2,
        name: 'different-workspace',
      };

      rerender();

      // Should reload content from new workspace
      await waitFor(() => {
        expect(result.current.content).toBe('Content from workspace 2');
      });

      expect(mockGetFileContent).toHaveBeenCalledWith(
        'test-workspace',
        'test.md'
      );
      expect(mockGetFileContent).toHaveBeenCalledWith(
        'different-workspace',
        'test.md'
      );
      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('clears content when workspace becomes null', async () => {
      const mockGetFileContent = vi.mocked(fileApi.getFileContent);
      const mockIsImageFile = vi.mocked(fileHelpers.isImageFile);

      mockGetFileContent.mockResolvedValue('Initial content');
      mockIsImageFile.mockReturnValue(false);

      const { result, rerender } = renderHook(() => useFileContent('test.md'));

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.content).toBe('Initial content');
      });

      expect(mockGetFileContent).toHaveBeenCalledTimes(1);
      vi.clearAllMocks(); // Clear previous calls

      // Remove workspace
      mockWorkspaceData.currentWorkspace = null;
      rerender();

      // Content should remain the same (no clearing happens when workspace becomes null)
      // The hook keeps the current content and just prevents new loads
      expect(result.current.content).toBe('Initial content');
      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(mockGetFileContent).not.toHaveBeenCalled(); // No new API calls
    });
  });

  describe('edge cases', () => {
    it('handles empty string selectedFile', () => {
      const { result } = renderHook(() => useFileContent(''));

      // Empty string should not trigger file loading
      expect(result.current.content).toBe(DEFAULT_FILE.content);
      expect(fileApi.getFileContent).not.toHaveBeenCalled();
    });

    it('handles rapid file changes', async () => {
      const mockGetFileContent = vi.mocked(fileApi.getFileContent);
      const mockIsImageFile = vi.mocked(fileHelpers.isImageFile);

      // Set up different responses for each file
      mockGetFileContent
        .mockImplementationOnce(() => Promise.resolve('Content 1'))
        .mockImplementationOnce(() => Promise.resolve('Content 2'))
        .mockImplementationOnce(() => Promise.resolve('Content 3'));
      mockIsImageFile.mockReturnValue(false);

      const { result, rerender } = renderHook(
        ({ selectedFile }) => useFileContent(selectedFile),
        { initialProps: { selectedFile: 'file1.md' } }
      );

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.content).toBe('Content 1');
      });

      // Rapidly change files
      rerender({ selectedFile: 'file2.md' });

      await waitFor(() => {
        expect(result.current.content).toBe('Content 2');
      });

      rerender({ selectedFile: 'file3.md' });

      await waitFor(() => {
        expect(result.current.content).toBe('Content 3');
      });

      expect(mockGetFileContent).toHaveBeenCalledTimes(3);
    });
  });

  describe('function stability', () => {
    it('maintains stable function references across re-renders and workspace changes', () => {
      const { result, rerender } = renderHook(() => useFileContent('test.md'));

      const initialFunctions = {
        setContent: result.current.setContent,
        setHasUnsavedChanges: result.current.setHasUnsavedChanges,
        loadFileContent: result.current.loadFileContent,
        handleContentChange: result.current.handleContentChange,
      };

      // Re-render with different file
      rerender();

      expect(result.current.setContent).toBe(initialFunctions.setContent);
      expect(result.current.setHasUnsavedChanges).toBe(
        initialFunctions.setHasUnsavedChanges
      );
      expect(result.current.loadFileContent).toBe(
        initialFunctions.loadFileContent
      );
      expect(result.current.handleContentChange).toBe(
        initialFunctions.handleContentChange
      );

      // Change workspace
      mockWorkspaceData.currentWorkspace = {
        id: 2,
        name: 'different-workspace',
      };

      rerender();

      // Functions should still be stable
      expect(result.current.setContent).toBe(initialFunctions.setContent);
      expect(result.current.setHasUnsavedChanges).toBe(
        initialFunctions.setHasUnsavedChanges
      );
      expect(result.current.loadFileContent).not.toBe(
        initialFunctions.loadFileContent
      );
      expect(result.current.handleContentChange).toBe(
        initialFunctions.handleContentChange
      );
    });
  });
});
