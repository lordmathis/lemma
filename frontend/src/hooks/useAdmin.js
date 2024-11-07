import { useState, useCallback, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import * as adminApi from '../services/adminApi';

export const useAdmin = (resource) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let result;
      switch (resource) {
        case 'users':
          result = await adminApi.listUsers();
          break;
        case 'stats':
          result = await adminApi.getSystemStats();
          break;
        default:
          throw new Error(`Unknown resource type: ${resource}`);
      }
      setData(result);
      setError(null);
    } catch (err) {
      console.error(`Failed to fetch ${resource}:`, err);
      setError(err.message);
      notifications.show({
        title: 'Error',
        message: `Failed to load ${resource}. Please try again.`,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [resource]);

  const createItem = useCallback(
    async (itemData) => {
      try {
        let newItem;
        switch (resource) {
          case 'users':
            newItem = await adminApi.createUser(itemData);
            break;
          default:
            throw new Error(`Create not supported for resource: ${resource}`);
        }
        setData((prevData) =>
          Array.isArray(prevData) ? [...prevData, newItem] : prevData
        );
        notifications.show({
          title: 'Success',
          message: `${resource} created successfully`,
          color: 'green',
        });
        return { success: true, data: newItem };
      } catch (err) {
        console.error(`Failed to create ${resource}:`, err);
        notifications.show({
          title: 'Error',
          message: err.message || `Failed to create ${resource}`,
          color: 'red',
        });
        return { success: false, error: err.message };
      }
    },
    [resource]
  );

  const deleteItem = useCallback(
    async (itemId) => {
      try {
        switch (resource) {
          case 'users':
            await adminApi.deleteUser(itemId);
            break;
          default:
            throw new Error(`Delete not supported for resource: ${resource}`);
        }
        setData((prevData) =>
          Array.isArray(prevData)
            ? prevData.filter((item) => item.id !== itemId)
            : prevData
        );
        notifications.show({
          title: 'Success',
          message: `${resource} deleted successfully`,
          color: 'green',
        });
        return { success: true };
      } catch (err) {
        console.error(`Failed to delete ${resource}:`, err);
        notifications.show({
          title: 'Error',
          message: err.message || `Failed to delete ${resource}`,
          color: 'red',
        });
        return { success: false, error: err.message };
      }
    },
    [resource]
  );

  const updateItem = useCallback(
    async (itemId, itemData) => {
      try {
        let updatedItem;
        switch (resource) {
          case 'users':
            updatedItem = await adminApi.updateUser(itemId, itemData);
            break;
          default:
            throw new Error(`Update not supported for resource: ${resource}`);
        }
        setData((prevData) =>
          Array.isArray(prevData)
            ? prevData.map((item) => (item.id === itemId ? updatedItem : item))
            : prevData
        );
        notifications.show({
          title: 'Success',
          message: `${resource} updated successfully`,
          color: 'green',
        });
        return { success: true, data: updatedItem };
      } catch (err) {
        console.error(`Failed to update ${resource}:`, err);
        notifications.show({
          title: 'Error',
          message: err.message || `Failed to update ${resource}`,
          color: 'red',
        });
        return { success: false, error: err.message };
      }
    },
    [resource]
  );

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
    create: createItem,
    delete: deleteItem,
    update: updateItem,
  };
};
