import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render as rtlRender,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { MantineProvider } from '@mantine/core';
import MarkdownPreview from './MarkdownPreview';
import { notifications } from '@mantine/notifications';
import { Theme, DEFAULT_WORKSPACE_SETTINGS } from '../../types/models';

// Mock notifications
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

// Mock useWorkspace hook
vi.mock('../../hooks/useWorkspace', () => ({
  useWorkspace: vi.fn(),
}));

// Mock the remarkWikiLinks utility
vi.mock('../../utils/remarkWikiLinks', () => ({
  remarkWikiLinks: vi.fn(() => () => {}),
}));

// Mock window.API_BASE_URL
Object.defineProperty(window, 'API_BASE_URL', {
  value: 'http://localhost:3000',
  writable: true,
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <MantineProvider defaultColorScheme="light">{children}</MantineProvider>
);

const render = (ui: React.ReactElement) => {
  return rtlRender(ui, { wrapper: TestWrapper });
};

describe('MarkdownPreview', () => {
  const mockHandleFileSelect = vi.fn();
  const mockNotificationsShow = vi.mocked(notifications.show);

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup useWorkspace mock
    const { useWorkspace } = await import('../../hooks/useWorkspace');
    vi.mocked(useWorkspace).mockReturnValue({
      currentWorkspace: {
        id: 1,
        name: 'test-workspace',
        theme: Theme.Light,
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
        createdAt: '2023-01-01T00:00:00Z',
        lastOpenedFilePath: '',
      },
      workspaces: [],
      settings: DEFAULT_WORKSPACE_SETTINGS,
      updateSettings: vi.fn(),
      loading: false,
      colorScheme: 'light',
      updateColorScheme: vi.fn(),
      switchWorkspace: vi.fn(),
      deleteCurrentWorkspace: vi.fn(),
    });
  });

  it('renders basic markdown content', async () => {
    const content = '# Hello World\n\nThis is a test.';

    render(
      <MarkdownPreview
        content={content}
        handleFileSelect={mockHandleFileSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Hello World')).toBeInTheDocument();
      expect(screen.getByText('This is a test.')).toBeInTheDocument();
    });
  });

  it('renders code blocks with syntax highlighting', async () => {
    const content = '```javascript\nconst hello = "world";\n```';

    render(
      <MarkdownPreview
        content={content}
        handleFileSelect={mockHandleFileSelect}
      />
    );

    await waitFor(() => {
      // Check for the code element containing the text pieces
      const codeElement = screen.getByText((_, element) => {
        return !!(
          element?.tagName.toLowerCase() === 'code' &&
          element?.textContent?.includes('const') &&
          element?.textContent?.includes('hello') &&
          element?.textContent?.includes('world')
        );
      });
      expect(codeElement).toBeInTheDocument();
      expect(codeElement.closest('pre')).toBeInTheDocument();
    });
  });

  it('handles image loading errors gracefully', async () => {
    const content = '![Test Image](invalid-image.jpg)';

    render(
      <MarkdownPreview
        content={content}
        handleFileSelect={mockHandleFileSelect}
      />
    );

    await waitFor(() => {
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();

      // Simulate image load error
      fireEvent.error(img);

      expect(img).toHaveAttribute('alt', 'Failed to load image');
    });
  });

  it('handles internal link clicks and calls handleFileSelect', async () => {
    const content = '[Test Link](http://localhost:3000/internal/test-file.md)';

    render(
      <MarkdownPreview
        content={content}
        handleFileSelect={mockHandleFileSelect}
      />
    );

    await waitFor(() => {
      const link = screen.getByText('Test Link');
      expect(link).toBeInTheDocument();

      fireEvent.click(link);

      expect(mockHandleFileSelect).toHaveBeenCalledWith('test-file.md');
    });
  });

  it('shows notification for non-existent file links', async () => {
    const content =
      '[Missing File](http://localhost:3000/notfound/missing-file.md)';

    render(
      <MarkdownPreview
        content={content}
        handleFileSelect={mockHandleFileSelect}
      />
    );

    await waitFor(() => {
      const link = screen.getByText('Missing File');
      fireEvent.click(link);

      expect(mockNotificationsShow).toHaveBeenCalledWith({
        title: 'File Not Found',
        message: 'The file "missing-file.md" does not exist.',
        color: 'red',
      });
      expect(mockHandleFileSelect).not.toHaveBeenCalled();
    });
  });

  it('handles external links normally without interference', async () => {
    const content = '[External Link](https://example.com)';

    render(
      <MarkdownPreview
        content={content}
        handleFileSelect={mockHandleFileSelect}
      />
    );

    await waitFor(() => {
      const link = screen.getByText('External Link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://example.com');

      // Click should be prevented but no file selection should occur
      fireEvent.click(link);
      expect(mockHandleFileSelect).not.toHaveBeenCalled();
      expect(mockNotificationsShow).not.toHaveBeenCalled();
    });
  });

  it('does not process content when no workspace is available', async () => {
    const { useWorkspace } = await import('../../hooks/useWorkspace');
    vi.mocked(useWorkspace).mockReturnValue({
      currentWorkspace: null,
      workspaces: [],
      settings: DEFAULT_WORKSPACE_SETTINGS,
      updateSettings: vi.fn(),
      loading: false,
      colorScheme: 'light',
      updateColorScheme: vi.fn(),
      switchWorkspace: vi.fn(),
      deleteCurrentWorkspace: vi.fn(),
    });

    const content = '# Test Content';

    render(
      <MarkdownPreview
        content={content}
        handleFileSelect={mockHandleFileSelect}
      />
    );

    // Should render empty content when no workspace
    const markdownPreview = screen.getByTestId('markdown-preview');
    expect(markdownPreview).toBeEmptyDOMElement();
  });

  it('handles empty content gracefully', async () => {
    render(
      <MarkdownPreview content="" handleFileSelect={mockHandleFileSelect} />
    );

    await waitFor(() => {
      const markdownPreview = screen.getByTestId('markdown-preview');
      expect(markdownPreview).toBeInTheDocument();
    });
  });

  it('updates content when markdown changes', async () => {
    const { rerender } = render(
      <MarkdownPreview
        content="# First Content"
        handleFileSelect={mockHandleFileSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('First Content')).toBeInTheDocument();
    });

    rerender(
      <TestWrapper>
        <MarkdownPreview
          content="# Updated Content"
          handleFileSelect={mockHandleFileSelect}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Updated Content')).toBeInTheDocument();
      expect(screen.queryByText('First Content')).not.toBeInTheDocument();
    });
  });

  it('handles markdown processing errors gracefully', () => {
    // Mock console.error to avoid noise in test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Create content that might cause processing issues
    const problematicContent = '# Test\n\n```invalid-syntax\nbroken code\n```';

    render(
      <MarkdownPreview
        content={problematicContent}
        handleFileSelect={mockHandleFileSelect}
      />
    );

    // Should still render something even if processing has issues
    const markdownPreview = screen.getByTestId('markdown-preview');
    expect(markdownPreview).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('handles URL decoding for file paths correctly', async () => {
    const encodedContent =
      '[Test Link](http://localhost:3000/internal/test%20file%20with%20spaces.md)';

    render(
      <MarkdownPreview
        content={encodedContent}
        handleFileSelect={mockHandleFileSelect}
      />
    );

    await waitFor(() => {
      const link = screen.getByText('Test Link');
      fireEvent.click(link);

      expect(mockHandleFileSelect).toHaveBeenCalledWith(
        'test file with spaces.md'
      );
    });
  });
});
