import { refreshToken } from './auth';

/**
 * Makes an API call with proper cookie handling and error handling
 */
export const apiCall = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  try {
    const response = await fetch(url, {
      ...options,
      // Include credentials to send/receive cookies
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

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
