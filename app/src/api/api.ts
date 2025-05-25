import { refreshToken } from './auth';

/**
 * Gets the CSRF token from cookies
 * @returns {string} The CSRF token or an empty string if not found
 */
const getCsrfToken = (): string => {
  const cookies = document.cookie.split(';');
  let csrfToken = '';
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf_token' && value) {
      csrfToken = decodeURIComponent(value);
      break;
    }
  }
  return csrfToken;
};

/**
 * Makes an API call with proper cookie handling and error handling
 */
export const apiCall = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  console.debug(`Making API call to: ${url}`);
  try {
    // Set up headers with CSRF token for non-GET requests
    const method = options.method || 'GET';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Add CSRF token for non-GET methods
    if (method !== 'GET') {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
    }

    const response = await fetch(url, {
      ...options,
      // Include credentials to send/receive cookies
      credentials: 'include',
      headers,
    });
    console.debug(`Response status: ${response.status} for URL: ${url}`);

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

    if (!response.ok && response.status !== 204) {
      const errorData = (await response.json()) as { message: string };
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
