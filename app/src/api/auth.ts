import type { User, LoginRequest} from '../types/authApi';
import { API_BASE_URL, isUser } from '../types/authApi';
import { apiCall } from './api';

/**
 * Logs in a user with email and password
 * @param {string} email - The user's email
 * @param {string} password - The user's password
 * @returns {Promise<User>} A promise that resolves to the user
 * @throws {Error} If the API call fails or returns an invalid response
 * @throws {Error} If the login fails
 */
export const login = async (email: string, password: string): Promise<User> => {
  const loginData: LoginRequest = { email, password };
  const response = await apiCall(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify(loginData),
  });

  const data = await response.json();
  if (!('user' in data) || !isUser(data.user)) {
    throw new Error('Invalid login response from API');
  }

  return data.user;
};

/**
 * Logs out the current user
 * @returns {Promise<void>} A promise that resolves when the logout is successful
 * @throws {Error} If the API call fails or returns an invalid response
 * @throws {Error} If the logout fails
 */
export const logout = async (): Promise<void> => {
  const response = await apiCall(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
  });

  if (response.status !== 204) {
    throw new Error('Failed to log out');
  }
};

/**
 * Refreshes the auth token
 * @returns true if refresh was successful, false otherwise
 */
export const refreshToken = async (): Promise<boolean> => {
  try {
    await apiCall(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
    });

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Gets the currently authenticated user
 * @returns {Promise<User>} A promise that resolves to the current user
 * @throws {Error} If the API call fails or returns an invalid response
 * @throws {Error} If the user data is invalid
 */
export const getCurrentUser = async (): Promise<User> => {
  const response = await apiCall(`${API_BASE_URL}/auth/me`);
  const data = await response.json();

  if (!isUser(data)) {
    throw new Error('Invalid user data received from API');
  }

  return data;
};
