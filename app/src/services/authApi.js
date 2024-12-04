import { API_BASE_URL } from '../utils/constants';

let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
};

export const clearAuthToken = () => {
  authToken = null;
};

export const getAuthHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  return headers;
};

// Update the existing apiCall function to include auth headers
export const apiCall = async (url, options = {}) => {
  try {
    const headers = {
      ...getAuthHeaders(),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 responses
    if (response.status === 401) {
      const isRefreshEndpoint = url.endsWith('/auth/refresh');
      if (!isRefreshEndpoint) {
        // Attempt token refresh and retry the request
        const refreshSuccess = await refreshToken();
        if (refreshSuccess) {
          // Retry the original request with the new token
          return apiCall(url, options);
        }
      }
      throw new Error('Authentication failed');
    }

    if (!response.ok && response.status !== 204) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message || `HTTP error! status: ${response.status}`
      );
    }

    if (response.status === 204) {
      return null;
    }

    return response;
  } catch (error) {
    console.error(`API call failed: ${error.message}`);
    throw error;
  }
};

// Authentication endpoints
export const login = async (email, password) => {
  const response = await apiCall(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return response.json();
};

export const logout = async () => {
  const sessionId = localStorage.getItem('sessionId');
  await apiCall(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'X-Session-ID': sessionId,
    },
  });
};

export const refreshToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  const response = await apiCall(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
  return response.json();
};

export const getCurrentUser = async () => {
  const response = await apiCall(`${API_BASE_URL}/auth/me`);
  return response.json();
};
