import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '../../test/utils';
import ContentView from './ContentView';
import { Theme } from '@/types/models';

// Mock child components
vi.mock('./Editor', () => ({
  default: ({
    content,
    selectedFile,
  }: {
    content: string;
    selectedFile: string;
  }) => (
    <div data-testid="editor">
      Editor - {selectedFile} - {content}
    </div>
  ),
}));

vi.mock('./MarkdownPreview', () => ({
  default: ({ content }: { content: string }) => (
    <div data-testid="markdown-preview">Preview - {content}</div>
  ),
}));

// Mock contexts
vi.mock('../../contexts/WorkspaceContext', () => ({
  useWorkspace: vi.fn(),
}));

// Mock utils
vi.mock('../../utils/fileHelpers', () => ({
  getFileUrl: vi.fn(
    (workspace: string, file: string) => `http://test.com/${workspace}/${file}`
  ),
  isImageFile: vi.fn(),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);

describe('ContentView', () => {
  const mockHandleContentChange = vi.fn();
  const mockHandleSave = vi.fn();
  const mockHandleFileSelect = vi.fn();

  const mockCurrentWorkspace = {
    id: 1,
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

  beforeEach(async () => {
    vi.clearAllMocks();

    const { useWorkspace } = await import('../../contexts/WorkspaceContext');
    vi.mocked(useWorkspace).mockReturnValue({
      currentWorkspace: mockCurrentWorkspace,
      workspaces: [],
      updateSettings: vi.fn(),
      loading: false,
      colorScheme: 'light',
      updateColorScheme: vi.fn(),
      switchWorkspace: vi.fn(),
      deleteCurrentWorkspace: vi.fn(),
    });

    const { isImageFile } = await import('../../utils/fileHelpers');
    vi.mocked(isImageFile).mockReturnValue(false);
  });

  it('shows no workspace message when no workspace selected', async () => {
    const { useWorkspace } = await import('../../contexts/WorkspaceContext');
    vi.mocked(useWorkspace).mockReturnValue({
      currentWorkspace: null,
      workspaces: [],
      updateSettings: vi.fn(),
      loading: false,
      colorScheme: 'light',
      updateColorScheme: vi.fn(),
      switchWorkspace: vi.fn(),
      deleteCurrentWorkspace: vi.fn(),
    });

    const { getByText } = render(
      <TestWrapper>
        <ContentView
          activeTab="source"
          selectedFile="test.md"
          content="Test content"
          handleContentChange={mockHandleContentChange}
          handleSave={mockHandleSave}
          handleFileSelect={mockHandleFileSelect}
          files={[]}
        />
      </TestWrapper>
    );

    expect(getByText('No workspace selected.')).toBeInTheDocument();
  });

  it('shows no file message when no file selected', () => {
    const { getByText } = render(
      <TestWrapper>
        <ContentView
          activeTab="source"
          selectedFile={null}
          content=""
          handleContentChange={mockHandleContentChange}
          handleSave={mockHandleSave}
          handleFileSelect={mockHandleFileSelect}
          files={[]}
        />
      </TestWrapper>
    );

    expect(getByText('No file selected.')).toBeInTheDocument();
  });

  it('renders editor when activeTab is source', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <ContentView
          activeTab="source"
          selectedFile="test.md"
          content="Test content"
          handleContentChange={mockHandleContentChange}
          handleSave={mockHandleSave}
          handleFileSelect={mockHandleFileSelect}
          files={[]}
        />
      </TestWrapper>
    );

    const editor = getByTestId('editor');
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveTextContent('Editor - test.md - Test content');
  });

  it('renders markdown preview when activeTab is preview', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <ContentView
          activeTab="preview"
          selectedFile="test.md"
          content="# Test content"
          handleContentChange={mockHandleContentChange}
          handleSave={mockHandleSave}
          handleFileSelect={mockHandleFileSelect}
          files={[]}
        />
      </TestWrapper>
    );

    const preview = getByTestId('markdown-preview');
    expect(preview).toBeInTheDocument();
    expect(preview).toHaveTextContent('Preview - # Test content');
  });

  it('renders image preview for image files', async () => {
    const { isImageFile } = await import('../../utils/fileHelpers');
    vi.mocked(isImageFile).mockReturnValue(true);

    const { container } = render(
      <TestWrapper>
        <ContentView
          activeTab="source"
          selectedFile="image.png"
          content=""
          handleContentChange={mockHandleContentChange}
          handleSave={mockHandleSave}
          handleFileSelect={mockHandleFileSelect}
          files={[]}
        />
      </TestWrapper>
    );

    const imagePreview = container.querySelector('.image-preview');
    expect(imagePreview).toBeInTheDocument();

    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      'src',
      'http://test.com/test-workspace/image.png'
    );
    expect(img).toHaveAttribute('alt', 'image.png');
  });

  it('ignores activeTab for image files', async () => {
    const { isImageFile } = await import('../../utils/fileHelpers');
    vi.mocked(isImageFile).mockReturnValue(true);

    const { container, queryByTestId } = render(
      <TestWrapper>
        <ContentView
          activeTab="preview"
          selectedFile="image.png"
          content=""
          handleContentChange={mockHandleContentChange}
          handleSave={mockHandleSave}
          handleFileSelect={mockHandleFileSelect}
          files={[]}
        />
      </TestWrapper>
    );

    // Should show image preview regardless of activeTab
    const imagePreview = container.querySelector('.image-preview');
    expect(imagePreview).toBeInTheDocument();

    // Should not render editor or markdown preview
    expect(queryByTestId('editor')).not.toBeInTheDocument();
    expect(queryByTestId('markdown-preview')).not.toBeInTheDocument();
  });
});
