import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { render } from '../../test/utils';
import FileActions from './FileActions';
import { Theme } from '@/types/models';
import { ModalProvider } from '../../contexts/ModalContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { WorkspaceDataProvider } from '../../contexts/WorkspaceDataContext';

// Mock the contexts and hooks
vi.mock('../../contexts/ModalContext', () => ({
  useModalContext: vi.fn(),
  ModalProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('../../hooks/useWorkspace', () => ({
  useWorkspace: vi.fn(),
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

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    <WorkspaceDataProvider>
      <ModalProvider>{children}</ModalProvider>
    </WorkspaceDataProvider>
  </ThemeProvider>
);

describe('FileActions', () => {
  const mockHandlePullChanges = vi.fn();
  const mockLoadFileList = vi.fn();
  const mockSetNewFileModalVisible = vi.fn();
  const mockSetDeleteFileModalVisible = vi.fn();
  const mockSetCommitMessageModalVisible = vi.fn();

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

  beforeEach(async () => {
    vi.clearAllMocks();

    const { useModalContext } = await import('../../contexts/ModalContext');
    vi.mocked(useModalContext).mockReturnValue({
      newFileModalVisible: false,
      setNewFileModalVisible: mockSetNewFileModalVisible,
      deleteFileModalVisible: false,
      setDeleteFileModalVisible: mockSetDeleteFileModalVisible,
      renameFileModalVisible: false,
      setRenameFileModalVisible: vi.fn(),
      commitMessageModalVisible: false,
      setCommitMessageModalVisible: mockSetCommitMessageModalVisible,
      settingsModalVisible: false,
      setSettingsModalVisible: vi.fn(),
      switchWorkspaceModalVisible: false,
      setSwitchWorkspaceModalVisible: vi.fn(),
      createWorkspaceModalVisible: false,
      setCreateWorkspaceModalVisible: vi.fn(),
    });

    const { useWorkspace } = await import('../../hooks/useWorkspace');
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
  });

  it('opens new file modal when create button is clicked', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <FileActions
          handlePullChanges={mockHandlePullChanges}
          selectedFile={null}
          loadFileList={mockLoadFileList}
        />
      </TestWrapper>
    );

    const createButton = getByTestId('create-file-button');
    fireEvent.click(createButton);

    expect(mockSetNewFileModalVisible).toHaveBeenCalledWith(true);
  });

  it('opens delete modal when delete button is clicked with selected file', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <FileActions
          handlePullChanges={mockHandlePullChanges}
          selectedFile="test.md"
          loadFileList={mockLoadFileList}
        />
      </TestWrapper>
    );

    const deleteButton = getByTestId('delete-file-button');
    fireEvent.click(deleteButton);

    expect(mockSetDeleteFileModalVisible).toHaveBeenCalledWith(true);
  });

  it('disables delete button when no file is selected', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <FileActions
          handlePullChanges={mockHandlePullChanges}
          selectedFile={null}
          loadFileList={mockLoadFileList}
        />
      </TestWrapper>
    );

    const deleteButton = getByTestId('delete-file-button');
    expect(deleteButton).toBeDisabled();
  });

  it('calls pull changes when pull button is clicked', () => {
    mockHandlePullChanges.mockResolvedValue(true);

    const { getByTestId } = render(
      <TestWrapper>
        <FileActions
          handlePullChanges={mockHandlePullChanges}
          selectedFile="test.md"
          loadFileList={mockLoadFileList}
        />
      </TestWrapper>
    );

    const pullButton = getByTestId('pull-changes-button');
    fireEvent.click(pullButton);

    expect(mockHandlePullChanges).toHaveBeenCalledOnce();
  });

  it('disables git buttons when git is not enabled', async () => {
    const { useWorkspace } = await import('../../hooks/useWorkspace');
    vi.mocked(useWorkspace).mockReturnValue({
      currentWorkspace: { ...mockCurrentWorkspace, gitEnabled: false },
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
        <FileActions
          handlePullChanges={mockHandlePullChanges}
          selectedFile="test.md"
          loadFileList={mockLoadFileList}
        />
      </TestWrapper>
    );

    const pullButton = getByTestId('pull-changes-button');
    expect(pullButton).toBeDisabled();

    const commitButton = getByTestId('commit-push-button');
    expect(commitButton).toBeDisabled();
  });

  it('opens commit modal when commit button is clicked', () => {
    const { getByTestId } = render(
      <TestWrapper>
        <FileActions
          handlePullChanges={mockHandlePullChanges}
          selectedFile="test.md"
          loadFileList={mockLoadFileList}
        />
      </TestWrapper>
    );

    const commitButton = getByTestId('commit-push-button');
    fireEvent.click(commitButton);

    expect(mockSetCommitMessageModalVisible).toHaveBeenCalledWith(true);
  });

  it('disables commit button when auto-commit is enabled', async () => {
    const { useWorkspace } = await import('../../hooks/useWorkspace');
    vi.mocked(useWorkspace).mockReturnValue({
      currentWorkspace: { ...mockCurrentWorkspace, gitAutoCommit: true },
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
        <FileActions
          handlePullChanges={mockHandlePullChanges}
          selectedFile="test.md"
          loadFileList={mockLoadFileList}
        />
      </TestWrapper>
    );

    const commitButton = getByTestId('commit-push-button');
    expect(commitButton).toBeDisabled();
  });
});
