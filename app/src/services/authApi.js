import { API_BASE_URL } from '../utils/constants';

export const apiCall = async (url, options = {}) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (options.method && options.method !== 'GET') {
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrf_token='))
        ?.split('=')[1];
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (response.status === 429) {
      throw new Error('Rate limit exceeded');
    }

    // Handle 401 responses
    if (response.status === 401) {
      const isRefreshEndpoint = url.endsWith('/auth/refresh');
      if (!isRefreshEndpoint) {
        // Attempt token refresh and retry the request
        const refreshSuccess = await refreshToken();
        if (refreshSuccess) {
          // Retry the original request
          return apiCall(url, options);
        }
      }
      throw new Error('Authentication failed');
    }

    // Handle other error responses
    if (!response.ok && response.status !== 204) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message || `HTTP error! status: ${response.status}`
      );
    }

    // Return null for 204 responses
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

  const data = await response.json();
  // No need to store tokens as they're in cookies now
  return data;
};

export const logout = async () => {
  await apiCall(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
  });
  return;
};

export const refreshToken = async () => {
  try {
    const response = await apiCall(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
    });
    return response.status === 200;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
  }
};

export const getCurrentUser = async () => {
  const response = await apiCall(`${API_BASE_URL}/auth/me`);
  return response.json();
};
