import {
  API_BASE_URL,
  type CreateUserRequest,
  type UpdateUserRequest,
} from '@/types/api';
import { apiCall } from './api';
import {
  isSystemStats,
  isUser,
  isWorkspace,
  type SystemStats,
  type User,
  type Workspace,
} from '@/types/models';

const ADMIN_BASE_URL = `${API_BASE_URL}/admin`;

// User Management

/**
 * Fetches all users from the API
 * @returns {Promise<User[]>} A promise that resolves to an array of users
 * @throws {Error} If the API call fails or returns an invalid response
 * */
export const getUsers = async (): Promise<User[]> => {
  const response = await apiCall(`${ADMIN_BASE_URL}/users`);
  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new Error('Invalid users response received from API');
  }
  return data.map((user) => {
    if (!isUser(user)) {
      throw new Error('Invalid user object received from API');
    }
    return user;
  });
};

/**
 * Creates a new user in the system
 * @param {CreateUserRequest} userData The data for the new user
 * @returns {Promise<User>} A promise that resolves to the created user
 * @throws {Error} If the API call fails or returns an invalid response
 * */
export const createUser = async (
  userData: CreateUserRequest
): Promise<User> => {
  const response = await apiCall(`${ADMIN_BASE_URL}/users`, {
    method: 'POST',
    body: JSON.stringify(userData),
  });

  const data: unknown = await response.json();
  if (!isUser(data)) {
    throw new Error('Invalid user object received from API');
  }
  return data;
};

/**
 * Deletes a user from the system
 * @param {number} userId The ID of the user to delete
 * @throws {Error} If the API call fails or returns an invalid response
 * */
export const deleteUser = async (userId: number) => {
  const response = await apiCall(`${ADMIN_BASE_URL}/users/${userId}`, {
    method: 'DELETE',
  });
  if (response.status === 204) {
    return;
  } else {
    throw new Error('Failed to delete user with status: ' + response.status);
  }
};

/**
 * Updates an existing user in the system
 * @param {number} userId The ID of the user to update
 * @param {UpdateUserRequest} userData The data to update the user with
 * @returns {Promise<User>} A promise that resolves to the updated user
 * @throws {Error} If the API call fails or returns an invalid response
 * */
export const updateUser = async (
  userId: number,
  userData: UpdateUserRequest
): Promise<User> => {
  const response = await apiCall(`${ADMIN_BASE_URL}/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  });

  const data: unknown = await response.json();
  if (!isUser(data)) {
    throw new Error('Invalid user object received from API');
  }
  return data;
};

// Workspace Management

/**
 * Fetches all workspaces from the API
 * @returns {Promise<Workspace[]>} A promise that resolves to an array of workspaces
 * @throws {Error} If the API call fails or returns an invalid response
 * */
export const getWorkspaces = async (): Promise<Workspace[]> => {
  const response = await apiCall(`${ADMIN_BASE_URL}/workspaces`);
  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Invalid workspaces response received from API');
  }
  return data.map((workspace) => {
    if (!isWorkspace(workspace)) {
      throw new Error('Invalid workspace object received from API');
    }
    return workspace;
  });
};

// System Statistics

/**
 * Fetches system-wide statistics from the API
 * @returns {Promise<SystemStats>} A promise that resolves to the system statistics
 * @throws {Error} If the API call fails or returns an invalid response
 * */
export const getSystemStats = async (): Promise<SystemStats> => {
  const response = await apiCall(`${ADMIN_BASE_URL}/stats`);
  const data: unknown = await response.json();
  if (!isSystemStats(data)) {
    throw new Error('Invalid system stats response received from API');
  }
  return data;
};
