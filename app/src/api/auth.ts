import {
  API_BASE_URL,
  User,
  LoginRequest,
  LoginResponse,
  isLoginResponse,
  ErrorResponse,
  isUser,
} from '../types/authApi';
import { apiCall } from './api';

/**
 * Logs in a user with email and password
 */
export const login = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  const loginData: LoginRequest = { email, password };
  const response = await apiCall(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify(loginData),
  });

  if (!response.ok) {
    const data = await response.json();
    const errorData = data as ErrorResponse;
    throw new Error(errorData.message || 'Login failed');
  }

  const data = await response.json();
  if (!isLoginResponse(data)) {
    throw new Error('Invalid login response received from API');
  }

  return data;
};

/**
 * Logs out the current user
 */
export const logout = async (): Promise<void> => {
  const response = await apiCall(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
  });

  if (!response.ok) {
    const data = await response.json();
    const errorData = data as ErrorResponse;
    throw new Error(errorData.message || 'Logout failed');
  }
};

/**
 * Refreshes the auth token
 * @returns true if refresh was successful, false otherwise
 */
export const refreshToken = async (): Promise<boolean> => {
  try {
    const response = await apiCall(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
    });

    if (!response.ok) {
      const data = await response.json();
      const errorData = data as ErrorResponse;
      throw new Error(errorData.message || 'Token refresh failed');
    }

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Gets the currently authenticated user
 */
export const getCurrentUser = async (): Promise<User> => {
  const response = await apiCall(`${API_BASE_URL}/auth/me`);
  const data = await response.json();

  if (!response.ok) {
    const errorData = data as ErrorResponse;
    throw new Error(errorData.message || 'Failed to get current user');
  }

  if (!isUser(data)) {
    throw new Error('Invalid user data received from API');
  }

  return data;
};
