import { apiCall } from './authApi';
import { API_BASE_URL } from '../utils/constants';

const ADMIN_BASE_URL = `${API_BASE_URL}/admin`;

// User Management
export const listUsers = async () => {
  const response = await apiCall(`${ADMIN_BASE_URL}/users`);
  return response.json();
};

export const createUser = async (userData) => {
  const response = await apiCall(`${ADMIN_BASE_URL}/users`, {
    method: 'POST',
    body: JSON.stringify(userData),
  });
  return response.json();
};

export const deleteUser = async (userId) => {
  const response = await apiCall(`${ADMIN_BASE_URL}/users/${userId}`, {
    method: 'DELETE',
  });
  return response.json();
};

export const updateUser = async (userId, userData) => {
  const response = await apiCall(`${ADMIN_BASE_URL}/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  });
  return response.json();
};

// System Statistics
export const getSystemStats = async () => {
  const response = await apiCall(`${ADMIN_BASE_URL}/stats`);
  return response.json();
};
