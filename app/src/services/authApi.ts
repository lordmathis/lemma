import { 
  API_BASE_URL,
  User, 
  LoginRequest, 
  LoginResponse, 
  ApiCallOptions,
  ErrorResponse 
} from '../types/api';

let authToken: string | null = null;

/**
 * Sets the authentication token for API requests
 */
export const setAuthToken = (token: string): void => {
  authToken = token;
};

/**
 * Clears the authentication token
 */
export const clearAuthToken = (): void => {
  authToken = null;
};

/**
 * Gets headers for API requests including auth token if present
 */
export const getAuthHeaders = (): HeadersInit => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  return headers;
};

/**
 * Makes an API call with authentication and error handling
 */
export const apiCall = async (
  url: string,
  options: ApiCallOptions = {}
): Promise<Response> => {
  try {
    const headers = {
      ...getAuthHeaders(),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers: headers as HeadersInit,
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
      const errorData = await response.json() as ErrorResponse;
      throw new Error(
        errorData?.message || `HTTP error! status: ${response.status}`
      );
    }

    return response;
  } catch (error) {
    console.error(`API call failed: ${(error as Error).message}`);
    throw error;
  }
};

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
  return response.json();
};

/**
 * Logs out the current user
 */
export const logout = async (): Promise<void> => {
  const sessionId = localStorage.getItem('sessionId');
  await apiCall(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'X-Session-ID': sessionId || '',
    },
  });
};

/**
 * Refreshes the auth token using a refresh token
 */
export const refreshToken = async (): Promise<boolean> => {
  const refreshToken = localStorage.getItem('refreshToken');
  try {
    const response = await apiCall(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    const data = await response.json();
    return !!data.accessToken;
  } catch (error) {
    return false;
  }
};

/**
 * Gets the currently authenticated user
 */
export const getCurrentUser = async (): Promise<User> => {
  const response = await apiCall(`${API_BASE_URL}/auth/me`);
  return response.json();
};