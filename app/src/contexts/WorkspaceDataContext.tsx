import React, {
  type ReactNode,
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { notifications } from '@mantine/notifications';
import { type Workspace } from '@/types/models';
import {
  getWorkspace,
  listWorkspaces,
  getLastWorkspaceName,
  updateLastWorkspaceName,
} from '@/api/workspace';
import { useTheme } from './ThemeContext';

interface WorkspaceDataContextType {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  loading: boolean;
  loadWorkspaces: () => Promise<Workspace[]>;
  loadWorkspaceData: (workspaceName: string) => Promise<void>;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
}

const WorkspaceDataContext = createContext<WorkspaceDataContextType | null>(
  null
);

interface WorkspaceDataProviderProps {
  children: ReactNode;
}

export const WorkspaceDataProvider: React.FC<WorkspaceDataProviderProps> = ({
  children,
}) => {
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(
    null
  );
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { updateColorScheme } = useTheme();

  const loadWorkspaces = useCallback(async (): Promise<Workspace[]> => {
    try {
      const workspaceList = await listWorkspaces();
      setWorkspaces(workspaceList);
      return workspaceList;
    } catch (error) {
      console.error('Failed to load workspaces:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load workspaces list',
        color: 'red',
      });
      return [];
    }
  }, []);

  const loadWorkspaceData = useCallback(
    async (workspaceName: string): Promise<void> => {
      try {
        const workspace = await getWorkspace(workspaceName);
        setCurrentWorkspace(workspace);
        updateColorScheme(workspace.theme);
      } catch (error) {
        console.error('Failed to load workspace data:', error);
        notifications.show({
          title: 'Error',
          message: 'Failed to load workspace data',
          color: 'red',
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const loadFirstAvailableWorkspace = useCallback(async (): Promise<void> => {
    try {
      const allWorkspaces = await listWorkspaces();
      if (allWorkspaces.length > 0) {
        const firstWorkspace = allWorkspaces[0];
        if (!firstWorkspace) throw new Error('No workspaces available');
        await updateLastWorkspaceName(firstWorkspace.name);
        await loadWorkspaceData(firstWorkspace.name);
      }
    } catch (error) {
      console.error('Failed to load first available workspace:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load workspace',
        color: 'red',
      });
    }
  }, [loadWorkspaceData]);

  useEffect(() => {
    const initializeWorkspace = async (): Promise<void> => {
      try {
        const lastWorkspaceName = await getLastWorkspaceName();
        if (lastWorkspaceName) {
          await loadWorkspaceData(lastWorkspaceName);
        } else {
          await loadFirstAvailableWorkspace();
        }
        await loadWorkspaces();
      } catch (error) {
        console.error('Failed to initialize workspace:', error);
        await loadFirstAvailableWorkspace();
      } finally {
        setLoading(false);
      }
    };

    void initializeWorkspace();
  }, [loadFirstAvailableWorkspace, loadWorkspaceData, loadWorkspaces]);

  const value: WorkspaceDataContextType = {
    currentWorkspace,
    workspaces,
    loading,
    loadWorkspaces,
    loadWorkspaceData,
    setCurrentWorkspace,
  };

  return (
    <WorkspaceDataContext.Provider value={value}>
      {children}
    </WorkspaceDataContext.Provider>
  );
};

export const useWorkspaceData = (): WorkspaceDataContextType => {
  const context = useContext(WorkspaceDataContext);
  if (!context) {
    throw new Error(
      'useWorkspaceData must be used within a WorkspaceDataProvider'
    );
  }
  return context;
};
