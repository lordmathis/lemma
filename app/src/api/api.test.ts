import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiCall } from './api';

// Mock the auth module - move this before any constants
vi.mock('./auth', () => {
  return {
    refreshToken: vi.fn(),
  };
});

// Get the mocked function after vi.mock
const mockRefreshToken = vi.mocked(await import('./auth')).refreshToken;

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create mock Response objects
const createMockResponse = (
  status: number,
  body: unknown = {},
  ok?: boolean
): Response => {
  const response = {
    status,
    ok: ok !== undefined ? ok : status >= 200 && status < 300,
    json: vi.fn().mockResolvedValue(body),
    text: vi
      .fn()
      .mockResolvedValue(
        typeof body === 'string' ? body : JSON.stringify(body)
      ),
  } as unknown as Response;
  return response;
};

// Helper to set document.cookie
const setCookie = (name: string, value: string) => {
  Object.defineProperty(document, 'cookie', {
    writable: true,
    value: `${name}=${encodeURIComponent(value)}`,
    configurable: true,
  });
};

describe('apiCall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear cookies
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('basic functionality', () => {
    it('makes a successful GET request', async () => {
      const mockResponseData = { success: true };
      mockFetch.mockResolvedValue(createMockResponse(200, mockResponseData));

      const result = await apiCall('https://api.example.com/test');

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(result.status).toBe(200);
    });

    it('makes a successful POST request with body', async () => {
      const requestBody = { name: 'test' };
      const mockResponseData = { id: 1, name: 'test' };
      mockFetch.mockResolvedValue(createMockResponse(201, mockResponseData));

      const result = await apiCall('https://api.example.com/create', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/create', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(result.status).toBe(201);
    });

    it('handles 204 No Content responses', async () => {
      mockFetch.mockResolvedValue(createMockResponse(204, null, true));

      const result = await apiCall('https://api.example.com/delete', {
        method: 'DELETE',
      });

      expect(result.status).toBe(204);
    });

    it('preserves custom headers', async () => {
      mockFetch.mockResolvedValue(createMockResponse(200, {}));

      await apiCall('https://api.example.com/test', {
        headers: {
          'Custom-Header': 'custom-value',
          'Content-Type': 'text/plain',
        },
      });

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', {
        credentials: 'include',
        headers: {
          'Content-Type': 'text/plain', // Custom content type should override
          'Custom-Header': 'custom-value',
        },
      });
    });
  });

  describe('CSRF token handling', () => {
    it('adds CSRF token to non-GET requests when token exists', async () => {
      setCookie('csrf_token', 'test-csrf-token');
      mockFetch.mockResolvedValue(createMockResponse(200, {}));

      await apiCall('https://api.example.com/create', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
      });

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/create', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'test-csrf-token',
        },
      });
    });

    it('omits CSRF token with GET methods', async () => {
      setCookie('csrf_token', 'test-token');
      mockFetch.mockResolvedValue(createMockResponse(200, {}));

      await apiCall('https://api.example.com/test', { method: 'GET' });

      // Check that CSRF token is not included in headers
      const calledOptions = mockFetch.mock.calls?.[0]?.[1] as RequestInit;
      expect(calledOptions['headers']).not.toHaveProperty('X-CSRF-Token');
    });

    it('handles URL-encoded CSRF tokens', async () => {
      const encodedToken = 'token%20with%20spaces';
      setCookie('csrf_token', encodedToken);
      mockFetch.mockResolvedValue(createMockResponse(200, {}));

      await apiCall('https://api.example.com/create', {
        method: 'POST',
      });

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/create', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': encodedToken, // We shouldn't expect it to be decoded since our api.ts is not decoding it
        },
      });
    });

    it('handles missing CSRF token gracefully', async () => {
      // No CSRF token in cookies
      mockFetch.mockResolvedValue(createMockResponse(200, {}));

      await apiCall('https://api.example.com/create', {
        method: 'POST',
      });

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/create', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          // No X-CSRF-Token header
        },
      });
    });

    it('handles multiple cookies and extracts CSRF token correctly', async () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value:
          'session_id=abc123; csrf_token=my-csrf-token; other_cookie=value',
        configurable: true,
      });
      mockFetch.mockResolvedValue(createMockResponse(200, {}));

      await apiCall('https://api.example.com/create', {
        method: 'POST',
      });

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/create', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'my-csrf-token',
        },
      });
    });

    it('handles empty CSRF token value', async () => {
      setCookie('csrf_token', '');
      mockFetch.mockResolvedValue(createMockResponse(200, {}));

      await apiCall('https://api.example.com/create', {
        method: 'POST',
      });

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/create', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          // No X-CSRF-Token header when token is empty
        },
      });
    });
  });

  describe('error handling', () => {
    it('throws error for non-2xx status codes', async () => {
      const errorResponse = { message: 'Bad Request' };
      mockFetch.mockResolvedValue(
        createMockResponse(400, errorResponse, false)
      );

      await expect(apiCall('https://api.example.com/error')).rejects.toThrow(
        'Bad Request'
      );
    });

    it('throws generic error when no error message in response', async () => {
      mockFetch.mockResolvedValue(createMockResponse(500, {}, false));

      await expect(apiCall('https://api.example.com/error')).rejects.toThrow(
        'HTTP error! status: 500'
      );
    });

    it('handles malformed JSON error responses', async () => {
      const mockResponse = {
        status: 400,
        ok: false,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      await expect(apiCall('https://api.example.com/error')).rejects.toThrow(
        'Invalid JSON'
      );
    });

    it('handles network errors', async () => {
      const networkError = new Error('Network error');
      mockFetch.mockRejectedValue(networkError);

      await expect(apiCall('https://api.example.com/error')).rejects.toThrow(
        'Network error'
      );
    });

    it('handles timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      mockFetch.mockRejectedValue(timeoutError);

      await expect(apiCall('https://api.example.com/slow')).rejects.toThrow(
        'Request timeout'
      );
    });
  });

  describe('authentication and token refresh', () => {
    it('handles 401 response by attempting token refresh and retrying', async () => {
      const successResponse = createMockResponse(200, { data: 'success' });

      mockFetch
        .mockResolvedValueOnce(createMockResponse(401, {}, false)) // First call fails with 401
        .mockResolvedValueOnce(successResponse); // Retry succeeds

      mockRefreshToken.mockResolvedValue(true);

      const result = await apiCall('https://api.example.com/protected');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockRefreshToken).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(200);
    });

    it('throws error when token refresh fails', async () => {
      mockFetch.mockResolvedValue(createMockResponse(401, {}, false));
      mockRefreshToken.mockResolvedValue(false);

      await expect(
        apiCall('https://api.example.com/protected')
      ).rejects.toThrow('Authentication failed');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockRefreshToken).toHaveBeenCalledTimes(1);
    });

    it('does not attempt refresh for auth/refresh endpoint', async () => {
      mockFetch.mockResolvedValue(createMockResponse(401, {}, false));

      await expect(
        apiCall('https://api.example.com/auth/refresh')
      ).rejects.toThrow('Authentication failed');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockRefreshToken).not.toHaveBeenCalled();
    });

    it('handles successful token refresh but failed retry', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse(401, {}, false)) // First call fails
        .mockResolvedValueOnce(
          createMockResponse(403, { message: 'Forbidden' }, false)
        ); // Retry fails with different error

      mockRefreshToken.mockResolvedValue(true);

      await expect(
        apiCall('https://api.example.com/protected')
      ).rejects.toThrow('Forbidden');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockRefreshToken).toHaveBeenCalledTimes(1);
    });

    it('handles token refresh throwing an error', async () => {
      mockFetch.mockResolvedValue(createMockResponse(401, {}, false));
      mockRefreshToken.mockRejectedValue(new Error('Refresh failed'));

      await expect(
        apiCall('https://api.example.com/protected')
      ).rejects.toThrow('Refresh failed'); // The test should match the actual error from the mock

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockRefreshToken).toHaveBeenCalledTimes(1);
    });

    it('preserves original request options in retry', async () => {
      const requestBody = { data: 'test' };
      const customHeaders = { 'Custom-Header': 'value' };

      mockFetch
        .mockResolvedValueOnce(createMockResponse(401, {}, false))
        .mockResolvedValueOnce(createMockResponse(200, { success: true }));

      mockRefreshToken.mockResolvedValue(true);

      await apiCall('https://api.example.com/protected', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: customHeaders,
      });

      // Check that both calls had the same options
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://api.example.com/protected',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Custom-Header': 'value',
          },
        }
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://api.example.com/protected',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Custom-Header': 'value',
          },
        }
      );
    });
  });

  describe('console logging', () => {
    it('logs debug information for requests and responses', async () => {
      const consoleSpy = vi
        .spyOn(console, 'debug')
        .mockImplementation(() => {});
      mockFetch.mockResolvedValue(createMockResponse(200, {}));

      await apiCall('https://api.example.com/test');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Making API call to: https://api.example.com/test'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        'Response status: 200 for URL: https://api.example.com/test'
      );

      consoleSpy.mockRestore();
    });

    it('logs errors when API calls fail', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const networkError = new Error('Network failure');
      mockFetch.mockRejectedValue(networkError);

      await expect(apiCall('https://api.example.com/error')).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'API call failed: Network failure'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('request options handling', () => {
    it('merges provided options with defaults', async () => {
      mockFetch.mockResolvedValue(createMockResponse(200, {}));

      await apiCall('https://api.example.com/test', {
        method: 'PUT',
        cache: 'no-cache' as RequestCache,
        redirect: 'follow' as RequestRedirect,
      });

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', {
        method: 'PUT',
        cache: 'no-cache',
        redirect: 'follow',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('handles undefined options parameter', async () => {
      mockFetch.mockResolvedValue(createMockResponse(200, {}));

      await apiCall('https://api.example.com/test');

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('handles empty options object', async () => {
      mockFetch.mockResolvedValue(createMockResponse(200, {}));

      await apiCall('https://api.example.com/test', {});

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });

  describe('HTTP methods', () => {
    it('handles different HTTP methods correctly', async () => {
      setCookie('csrf_token', 'test-token');
      mockFetch.mockResolvedValue(createMockResponse(200, {}));

      const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];

      for (const method of methods) {
        mockFetch.mockClear();

        await apiCall('https://api.example.com/test', { method });

        expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', {
          method,
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': 'test-token',
          },
        });
      }
    });

    it('defaults to GET method when method is omitted', async () => {
      setCookie('csrf_token', 'test-token');
      mockFetch.mockResolvedValue(createMockResponse(200, {}));

      await apiCall('https://api.example.com/test', {});

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', {
        method: undefined,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          // No CSRF token for undefined (GET) method
        },
      });
    });
  });

  describe('edge cases', () => {
    it('handles very long URLs', async () => {
      const longUrl = 'https://api.example.com/' + 'a'.repeat(2000);
      mockFetch.mockResolvedValue(createMockResponse(200, {}));

      await apiCall(longUrl);

      expect(mockFetch).toHaveBeenCalledWith(longUrl, expect.any(Object));
    });

    it('handles special characters in URL', async () => {
      const urlWithSpecialChars =
        'https://api.example.com/test?param=value&other=test%20value';
      mockFetch.mockResolvedValue(createMockResponse(200, {}));

      await apiCall(urlWithSpecialChars);

      expect(mockFetch).toHaveBeenCalledWith(
        urlWithSpecialChars,
        expect.any(Object)
      );
    });

    it('handles null response body', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue(null),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      const result = await apiCall('https://api.example.com/test');

      expect(result.status).toBe(200);
    });

    it('handles empty string response body', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue(''),
      } as unknown as Response;
      mockFetch.mockResolvedValue(mockResponse);

      const result = await apiCall('https://api.example.com/test');

      expect(result.status).toBe(200);
    });
  });
});
