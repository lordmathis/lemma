import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '../../test/utils';
import Layout from './Layout';
import { Theme, type FileNode } from '../../types/models';

// Mock child components
vi.mock('./Header', () => ({
  default: () => <div data-testid="header">Header</div>,
}));

vi.mock('./Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock('./MainContent', () => ({
  default: () => <div data-testid="main-content">Main Content</div>,
}));

// Mock hooks
vi.mock('../../hooks/useFileNavigation', () => ({
  useFileNavigation: vi.fn(),
}));

vi.mock('../../hooks/useFileList', () => ({
  useFileList: vi.fn(),
}));

vi.mock('../../hooks/useWorkspace', () => ({
  useWorkspace: vi.fn(),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);

describe('Layout', () => {
  const mockHandleFileSelect = vi.fn();
  const mockLoadFileList = vi.fn();

  const mockCurrentWorkspace = {
    id: 1,
    name: 'Test Workspace',
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

  const mockFiles: FileNode[] = [
    {
      id: '1',
      name: 'README.md',
      path: 'README.md',
    },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();

    const { useWorkspace } = await import('../../hooks/useWorkspace');
    vi.mocked(useWorkspace).mockReturnValue({
      currentWorkspace: mockCurrentWorkspace,
      workspaces: [],
      settings: mockCurrentWorkspace,
      updateSettings: vi.fn(),
      loading: false,
      colorScheme: 'light',
      updateColorScheme: vi.fn(),
      switchWorkspace: vi.fn(),
      deleteCurrentWorkspace: vi.fn(),
    });

    const { useFileNavigation } = await import('../../hooks/useFileNavigation');
    vi.mocked(useFileNavigation).mockReturnValue({
      selectedFile: 'README.md',
      isNewFile: false,
      handleFileSelect: mockHandleFileSelect,
    });

    const { useFileList } = await import('../../hooks/useFileList');
    vi.mocked(useFileList).mockReturnValue({
      files: mockFiles,
      loadFileList: mockLoadFileList,
    });
  });

  it('renders all layout components when workspace is loaded', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <Layout />
      </TestWrapper>
    );

    expect(getByTestId('header')).toBeInTheDocument();
    expect(getByTestId('sidebar')).toBeInTheDocument();
    expect(getByTestId('main-content')).toBeInTheDocument();
  });

  it('shows loading spinner when workspace is loading', async () => {
    const { useWorkspace } = await import('../../hooks/useWorkspace');
    vi.mocked(useWorkspace).mockReturnValue({
      currentWorkspace: mockCurrentWorkspace,
      workspaces: [],
      settings: mockCurrentWorkspace,
      updateSettings: vi.fn(),
      loading: true,
      colorScheme: 'light',
      updateColorScheme: vi.fn(),
      switchWorkspace: vi.fn(),
      deleteCurrentWorkspace: vi.fn(),
    });

    const { getByRole } = render(
      <TestWrapper>
        <Layout />
      </TestWrapper>
    );

    expect(
      getByRole('status', { name: 'Loading workspace' })
    ).toBeInTheDocument();
  });

  it('shows no workspace message when no current workspace', async () => {
    const { useWorkspace } = await import('../../hooks/useWorkspace');
    vi.mocked(useWorkspace).mockReturnValue({
      currentWorkspace: null,
      workspaces: [],
      settings: mockCurrentWorkspace,
      updateSettings: vi.fn(),
      loading: false,
      colorScheme: 'light',
      updateColorScheme: vi.fn(),
      switchWorkspace: vi.fn(),
      deleteCurrentWorkspace: vi.fn(),
    });

    const { getByText } = render(
      <TestWrapper>
        <Layout />
      </TestWrapper>
    );

    expect(
      getByText('No workspace found. Please create a workspace.')
    ).toBeInTheDocument();
  });
});
