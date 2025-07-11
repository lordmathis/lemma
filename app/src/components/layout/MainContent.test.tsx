import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '../../test/utils';
import MainContent from './MainContent';
import { ModalProvider } from '../../contexts/ModalContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { WorkspaceDataProvider } from '../../contexts/WorkspaceDataContext';

// Mock child components
vi.mock('../editor/ContentView', () => ({
  default: ({
    activeTab,
    selectedFile,
  }: {
    activeTab: string;
    selectedFile: string | null;
  }) => (
    <div data-testid="content-view">
      Content View - {activeTab} - {selectedFile || 'No file'}
    </div>
  ),
}));

vi.mock('../modals/file/CreateFileModal', () => ({
  default: () => <div data-testid="create-file-modal">Create File Modal</div>,
}));

vi.mock('../modals/file/DeleteFileModal', () => ({
  default: () => <div data-testid="delete-file-modal">Delete File Modal</div>,
}));

vi.mock('../modals/git/CommitMessageModal', () => ({
  default: () => (
    <div data-testid="commit-message-modal">Commit Message Modal</div>
  ),
}));

// Mock contexts
vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colorScheme: 'light',
    updateColorScheme: vi.fn(),
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('../../contexts/WorkspaceDataContext', () => ({
  useWorkspaceData: () => ({
    currentWorkspace: { name: 'test-workspace', path: '/test' },
    workspaces: [],
    settings: {},
    loading: false,
    loadWorkspaces: vi.fn(),
    loadWorkspaceData: vi.fn(),
    setCurrentWorkspace: vi.fn(),
  }),
  WorkspaceDataProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock hooks
vi.mock('../../hooks/useFileContent', () => ({
  useFileContent: vi.fn(),
}));

vi.mock('../../hooks/useFileOperations', () => ({
  useFileOperations: vi.fn(),
}));

vi.mock('../../hooks/useGitOperations', () => ({
  useGitOperations: vi.fn(),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    <WorkspaceDataProvider>
      <ModalProvider>{children}</ModalProvider>
    </WorkspaceDataProvider>
  </ThemeProvider>
);

describe('MainContent', () => {
  const mockHandleFileSelect = vi.fn();
  const mockLoadFileList = vi.fn();
  const mockHandleContentChange = vi.fn();
  const mockSetHasUnsavedChanges = vi.fn();
  const mockHandleSave = vi.fn();
  const mockHandleCreate = vi.fn();
  const mockHandleDelete = vi.fn();
  const mockHandleUpload = vi.fn();
  const mockHandleMove = vi.fn();
  const mockHandleRename = vi.fn();
  const mockHandleCommitAndPush = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();

    const { useFileContent } = await import('../../hooks/useFileContent');
    vi.mocked(useFileContent).mockReturnValue({
      content: 'Test content',
      setContent: vi.fn(),
      hasUnsavedChanges: false,
      setHasUnsavedChanges: mockSetHasUnsavedChanges,
      loadFileContent: vi.fn(),
      handleContentChange: mockHandleContentChange,
    });

    const { useFileOperations } = await import('../../hooks/useFileOperations');
    vi.mocked(useFileOperations).mockReturnValue({
      handleSave: mockHandleSave,
      handleCreate: mockHandleCreate,
      handleDelete: mockHandleDelete,
      handleUpload: mockHandleUpload,
      handleMove: mockHandleMove,
      handleRename: mockHandleRename,
    });

    const { useGitOperations } = await import('../../hooks/useGitOperations');
    vi.mocked(useGitOperations).mockReturnValue({
      handlePull: vi.fn(),
      handleCommitAndPush: mockHandleCommitAndPush,
    });
  });

  it('shows breadcrumbs for selected file', () => {
    const { getByText } = render(
      <TestWrapper>
        <MainContent
          selectedFile="docs/guide.md"
          handleFileSelect={mockHandleFileSelect}
          loadFileList={mockLoadFileList}
        />
      </TestWrapper>
    );

    expect(getByText('docs')).toBeInTheDocument();
    expect(getByText('guide.md')).toBeInTheDocument();
  });

  it('shows unsaved changes indicator when file has changes', async () => {
    const { useFileContent } = await import('../../hooks/useFileContent');
    vi.mocked(useFileContent).mockReturnValue({
      content: 'Test content',
      setContent: vi.fn(),
      hasUnsavedChanges: true,
      setHasUnsavedChanges: mockSetHasUnsavedChanges,
      loadFileContent: vi.fn(),
      handleContentChange: mockHandleContentChange,
    });

    const { container } = render(
      <TestWrapper>
        <MainContent
          selectedFile="test.md"
          handleFileSelect={mockHandleFileSelect}
          loadFileList={mockLoadFileList}
        />
      </TestWrapper>
    );

    // Should show unsaved changes indicator (yellow dot)
    const indicator = container.querySelector('svg[style*="yellow"]');
    expect(indicator).toBeInTheDocument();
  });

  it('renders all modal components', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <MainContent
          selectedFile="test.md"
          handleFileSelect={mockHandleFileSelect}
          loadFileList={mockLoadFileList}
        />
      </TestWrapper>
    );

    expect(getByTestId('create-file-modal')).toBeInTheDocument();
    expect(getByTestId('delete-file-modal')).toBeInTheDocument();
    expect(getByTestId('commit-message-modal')).toBeInTheDocument();
  });

  it('handles no selected file', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <MainContent
          selectedFile={null}
          handleFileSelect={mockHandleFileSelect}
          loadFileList={mockLoadFileList}
        />
      </TestWrapper>
    );

    const contentView = getByTestId('content-view');
    expect(contentView).toHaveTextContent('Content View - source - No file');
  });
});
