import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { getUsers, getWorkspaces, getSystemStats } from '../api/admin';

// Hook for admin data fetching (stats and workspaces)
export const useAdminData = (type) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
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
      setData(response);
    } catch (err) {
      const message = err.response?.data?.error || err.message;
      setError(message);
      notifications.show({
        title: 'Error',
        message: `Failed to load ${type}: ${message}`,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [type]);

  return { data, loading, error, reload: loadData };
};
