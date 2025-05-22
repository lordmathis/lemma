import { useState, useEffect, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { getUsers, getWorkspaces, getSystemStats } from '@/api/admin';
import type { SystemStats, User, WorkspaceStats } from '@/types/models';

// Possible types of admin data
type AdminDataType = 'stats' | 'workspaces' | 'users';

// Define the return data type based on the requested data type
type AdminData<T extends AdminDataType> = T extends 'stats'
  ? SystemStats
  : T extends 'workspaces'
  ? WorkspaceStats[]
  : T extends 'users'
  ? User[]
  : never;

// Define the return type of the hook
interface AdminDataResult<T extends AdminDataType> {
  data: AdminData<T>;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

// Hook for admin data fetching (stats and workspaces)
export const useAdminData = <T extends AdminDataType>(
  type: T
): AdminDataResult<T> => {
  // Initialize with the appropriate empty type
  const getInitialData = (): AdminData<T> => {
    if (type === 'stats') {
      return {} as SystemStats as AdminData<T>;
    } else if (type === 'workspaces') {
      return [] as WorkspaceStats[] as AdminData<T>;
    } else if (type === 'users') {
      return [] as User[] as AdminData<T>;
    } else {
      return [] as unknown as AdminData<T>;
    }
  };

  const [data, setData] = useState<AdminData<T>>(getInitialData());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      switch (type) {
        case 'stats':
          response = await getSystemStats();
          break;
        case 'workspaces':
          response = await getWorkspaces();
          break;
        case 'users':
          response = await getUsers();
          break;
        default:
          throw new Error('Invalid data type');
      }
      setData(response as AdminData<T>);
    } catch (err) {
      const message =
        err instanceof Error
          ? (err as { response?: { data?: { error?: string } } })?.response
              ?.data?.error || err.message
          : 'An unknown error occurred';
      setError(message);
      notifications.show({
        title: 'Error',
        message: `Failed to load ${type}: ${message}`,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return { data, loading, error, reload: loadData };
};
