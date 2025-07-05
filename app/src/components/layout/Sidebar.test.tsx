import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '../../test/utils';
import Sidebar from './Sidebar';
import { Theme, type FileNode } from '../../types/models';

// Mock the child components
vi.mock('../files/FileActions', () => ({
  default: ({ selectedFile }: { selectedFile: string | null }) => (
    <div data-testid="file-actions">
      File Actions - {selectedFile || 'No file'}
    </div>
  ),
}));

vi.mock('../files/FileTree', () => ({
  default: ({
    files,
    showHiddenFiles,
  }: {
    files: FileNode[];
    showHiddenFiles: boolean;
  }) => (
    <div data-testid="file-tree">
      File Tree - {files.length} files - Hidden: {showHiddenFiles.toString()}
    </div>
  ),
}));

// Mock the hooks
vi.mock('../../hooks/useGitOperations', () => ({
  useGitOperations: vi.fn(),
}));

vi.mock('../../hooks/useWorkspace', () => ({
  useWorkspace: vi.fn(),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);

describe('Sidebar', () => {
  const mockHandleFileSelect = vi.fn();
  const mockLoadFileList = vi.fn();
  const mockHandlePull = vi.fn();

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
      children: [],
    },
  ];

  const mockCurrentWorkspace = {
    id: 1,
    name: 'test-workspace',
    createdAt: '2024-01-01T00:00:00Z',
    gitEnabled: true,
    gitAutoCommit: false,
    theme: Theme.Light,
    autoSave: true,
    showHiddenFiles: false,
    gitUrl: '',
    gitBranch: 'main',
    gitUsername: '',
    gitEmail: '',
    gitToken: '',
    gitUser: '',
    gitCommitMsgTemplate: '',
    gitCommitName: '',
    gitCommitEmail: '',
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const { useGitOperations } = await import('../../hooks/useGitOperations');
    vi.mocked(useGitOperations).mockReturnValue({
      handlePull: mockHandlePull,
      handleCommitAndPush: vi.fn(),
    });

    const { useWorkspace } = await import('../../hooks/useWorkspace');
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
  });

  it('renders child components', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <Sidebar
          selectedFile="test.md"
          handleFileSelect={mockHandleFileSelect}
          files={mockFiles}
          loadFileList={mockLoadFileList}
        />
      </TestWrapper>
    );

    const fileActions = getByTestId('file-actions');
    expect(fileActions).toBeInTheDocument();
    expect(fileActions).toHaveTextContent('File Actions - test.md');

    const fileTree = getByTestId('file-tree');
    expect(fileTree).toBeInTheDocument();
    expect(fileTree).toHaveTextContent('File Tree - 2 files - Hidden: false');
  });

  it('passes showHiddenFiles setting to file tree', async () => {
    const { useWorkspace } = await import('../../hooks/useWorkspace');
    vi.mocked(useWorkspace).mockReturnValue({
      currentWorkspace: { ...mockCurrentWorkspace, showHiddenFiles: true },
      workspaces: [],
      updateSettings: vi.fn(),
      loading: false,
      colorScheme: 'light',
      updateColorScheme: vi.fn(),
      switchWorkspace: vi.fn(),
      deleteCurrentWorkspace: vi.fn(),
    });

    const { getByTestId } = render(
      <TestWrapper>
        <Sidebar
          selectedFile="test.md"
          handleFileSelect={mockHandleFileSelect}
          files={mockFiles}
          loadFileList={mockLoadFileList}
        />
      </TestWrapper>
    );

    const fileTree = getByTestId('file-tree');
    expect(fileTree).toHaveTextContent('File Tree - 2 files - Hidden: true');
  });

  it('shows no file selected when selectedFile is null', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <Sidebar
          selectedFile={null}
          handleFileSelect={mockHandleFileSelect}
          files={mockFiles}
          loadFileList={mockLoadFileList}
        />
      </TestWrapper>
    );

    const fileActions = getByTestId('file-actions');
    expect(fileActions).toHaveTextContent('File Actions - No file');
  });

  it('calls loadFileList on mount', () => {
    render(
      <TestWrapper>
        <Sidebar
          selectedFile="test.md"
          handleFileSelect={mockHandleFileSelect}
          files={mockFiles}
          loadFileList={mockLoadFileList}
        />
      </TestWrapper>
    );

    expect(mockLoadFileList).toHaveBeenCalledOnce();
  });
});
