import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test/utils';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import { Theme } from '../../types/models';

// Mock the hooks and contexts
vi.mock('../../hooks/useWorkspace', () => ({
  useWorkspace: vi.fn(),
}));

vi.mock('../../contexts/ModalContext', () => ({
  useModalContext: vi.fn(),
}));

// Mock API
vi.mock('../../api/workspace', () => ({
  listWorkspaces: vi.fn(),
}));

// Mock the CreateWorkspaceModal component
vi.mock('../modals/workspace/CreateWorkspaceModal', () => ({
  default: ({
    onWorkspaceCreated,
  }: {
    onWorkspaceCreated: (workspace: {
      name: string;
      createdAt: number;
    }) => void;
  }) => (
    <div data-testid="create-workspace-modal">
      <button
        onClick={() =>
          onWorkspaceCreated({ name: 'New Workspace', createdAt: Date.now() })
        }
      >
        Create Test Workspace
      </button>
    </div>
  ),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);

describe('WorkspaceSwitcher', () => {
  const mockSwitchWorkspace = vi.fn();
  const mockSetSettingsModalVisible = vi.fn();
  const mockSetCreateWorkspaceModalVisible = vi.fn();

  const mockCurrentWorkspace = {
    id: 1,
    name: 'Current Workspace',
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

  const mockWorkspaces = [
    mockCurrentWorkspace,
    {
      id: 2,
      name: 'Other Workspace',
      createdAt: '2024-01-02T00:00:00Z',
      theme: Theme.Dark,
      autoSave: true,
      showHiddenFiles: true,
      gitEnabled: true,
      gitUrl: 'https://github.com/test/repo',
      gitUser: 'testuser',
      gitToken: 'token',
      gitAutoCommit: true,
      gitCommitMsgTemplate: 'Auto: ${action} ${filename}',
      gitCommitName: 'Test User',
      gitCommitEmail: 'test@example.com',
    },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();

    const { useWorkspace } = await import('../../hooks/useWorkspace');
    vi.mocked(useWorkspace).mockReturnValue({
      currentWorkspace: mockCurrentWorkspace,
      workspaces: [],
      updateSettings: vi.fn(),
      loading: false,
      colorScheme: 'light',
      updateColorScheme: vi.fn(),
      switchWorkspace: mockSwitchWorkspace,
      deleteCurrentWorkspace: vi.fn(),
    });

    const { useModalContext } = await import('../../contexts/ModalContext');
    vi.mocked(useModalContext).mockReturnValue({
      newFileModalVisible: false,
      setNewFileModalVisible: vi.fn(),
      deleteFileModalVisible: false,
      setDeleteFileModalVisible: vi.fn(),
      renameFileModalVisible: false,
      setRenameFileModalVisible: vi.fn(),
      commitMessageModalVisible: false,
      setCommitMessageModalVisible: vi.fn(),
      settingsModalVisible: false,
      setSettingsModalVisible: mockSetSettingsModalVisible,
      switchWorkspaceModalVisible: false,
      setSwitchWorkspaceModalVisible: vi.fn(),
      createWorkspaceModalVisible: false,
      setCreateWorkspaceModalVisible: mockSetCreateWorkspaceModalVisible,
    });

    const { listWorkspaces } = await import('../../api/workspace');
    vi.mocked(listWorkspaces).mockResolvedValue(mockWorkspaces);
  });

  it('renders current workspace name', () => {
    const { getByText } = render(
      <TestWrapper>
        <WorkspaceSwitcher />
      </TestWrapper>
    );

    expect(getByText('Current Workspace')).toBeInTheDocument();
  });

  it('shows "No workspace" when no current workspace', async () => {
    const { useWorkspace } = await import('../../hooks/useWorkspace');
    vi.mocked(useWorkspace).mockReturnValue({
      currentWorkspace: null,
      workspaces: [],
      updateSettings: vi.fn(),
      loading: false,
      colorScheme: 'light',
      updateColorScheme: vi.fn(),
      switchWorkspace: mockSwitchWorkspace,
      deleteCurrentWorkspace: vi.fn(),
    });

    const { getByText } = render(
      <TestWrapper>
        <WorkspaceSwitcher />
      </TestWrapper>
    );

    expect(getByText('No workspace')).toBeInTheDocument();
  });

  it('opens popover and shows workspace list when clicked', async () => {
    const { getByText } = render(
      <TestWrapper>
        <WorkspaceSwitcher />
      </TestWrapper>
    );

    // Click to open popover
    const trigger = getByText('Current Workspace');
    fireEvent.click(trigger);

    // Should see the workspaces header and workspace list
    await waitFor(() => {
      expect(getByText('Workspaces')).toBeInTheDocument();
      expect(getByText('Other Workspace')).toBeInTheDocument();
    });
  });

  it('switches workspace when another workspace is clicked', async () => {
    const { getByText } = render(
      <TestWrapper>
        <WorkspaceSwitcher />
      </TestWrapper>
    );

    // Open popover and click on other workspace
    const trigger = getByText('Current Workspace');
    fireEvent.click(trigger);

    await waitFor(() => {
      const otherWorkspace = getByText('Other Workspace');
      fireEvent.click(otherWorkspace);
    });

    expect(mockSwitchWorkspace).toHaveBeenCalledWith('Other Workspace');
  });

  it('opens create workspace modal when create button is clicked', async () => {
    const { getByText, getByLabelText } = render(
      <TestWrapper>
        <WorkspaceSwitcher />
      </TestWrapper>
    );

    // Open popover and click create button
    const trigger = getByText('Current Workspace');
    fireEvent.click(trigger);

    await waitFor(() => {
      const createButton = getByLabelText('Create New Workspace');
      fireEvent.click(createButton);
    });

    expect(mockSetCreateWorkspaceModalVisible).toHaveBeenCalledWith(true);
  });

  it('opens settings modal when settings button is clicked', async () => {
    const { getByText, getByLabelText } = render(
      <TestWrapper>
        <WorkspaceSwitcher />
      </TestWrapper>
    );

    // Open popover and click settings button
    const trigger = getByText('Current Workspace');
    fireEvent.click(trigger);

    await waitFor(() => {
      const settingsButton = getByLabelText('Workspace Settings');
      fireEvent.click(settingsButton);
    });

    expect(mockSetSettingsModalVisible).toHaveBeenCalledWith(true);
  });
});
