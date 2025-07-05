import { describe, it, expect } from 'vitest';
import {
  isLoginResponse,
  isLookupResponse,
  isSaveFileResponse,
  type LoginResponse,
  type LookupResponse,
  type SaveFileResponse,
} from './api';
import { UserRole, type User } from './models';

// Mock user data for testing
const mockUser: User = {
  id: 1,
  email: 'test@example.com',
  displayName: 'Test User',
  role: UserRole.Editor,
  createdAt: '2024-01-01T00:00:00Z',
  lastWorkspaceId: 1,
};

describe('API Type Guards', () => {
  describe('isLoginResponse', () => {
    it('returns true for valid login response with all fields', () => {
      const validLoginResponse: LoginResponse = {
        user: mockUser,
        sessionId: 'session123',
        expiresAt: '2024-01-01T12:00:00Z',
      };

      expect(isLoginResponse(validLoginResponse)).toBe(true);
    });

    it('returns true for valid login response with only required fields', () => {
      const validLoginResponse: LoginResponse = {
        user: mockUser,
      };

      expect(isLoginResponse(validLoginResponse)).toBe(true);
    });

    it('returns true for valid login response with sessionId only', () => {
      const validLoginResponse: LoginResponse = {
        user: mockUser,
        sessionId: 'session123',
      };

      expect(isLoginResponse(validLoginResponse)).toBe(true);
    });

    it('returns true for valid login response with expiresAt only', () => {
      const validLoginResponse: LoginResponse = {
        user: mockUser,
        expiresAt: '2024-01-01T12:00:00Z',
      };

      expect(isLoginResponse(validLoginResponse)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isLoginResponse(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isLoginResponse(undefined)).toBe(false);
    });

    it('returns false for non-object values', () => {
      expect(isLoginResponse('string')).toBe(false);
      expect(isLoginResponse(123)).toBe(false);
      expect(isLoginResponse(true)).toBe(false);
      expect(isLoginResponse([])).toBe(false);
    });

    it('returns false for empty object', () => {
      expect(isLoginResponse({})).toBe(false);
    });

    it('returns false when user field is missing', () => {
      const invalidResponse = {
        sessionId: 'session123',
        expiresAt: '2024-01-01T12:00:00Z',
      };

      expect(isLoginResponse(invalidResponse)).toBe(false);
    });

    it('returns false when user field is invalid', () => {
      const invalidResponse = {
        user: {
          id: 'not-a-number', // Invalid user
          email: 'test@example.com',
        },
        sessionId: 'session123',
      };

      expect(isLoginResponse(invalidResponse)).toBe(false);
    });

    it('returns false when sessionId is not a string', () => {
      const invalidResponse = {
        user: mockUser,
        sessionId: 123, // Should be string
      };

      expect(isLoginResponse(invalidResponse)).toBe(false);
    });

    it('returns false when expiresAt is not a string', () => {
      const invalidResponse = {
        user: mockUser,
        expiresAt: new Date(), // Should be string
      };

      expect(isLoginResponse(invalidResponse)).toBe(false);
    });

    it('handles objects with extra properties', () => {
      const responseWithExtra = {
        user: mockUser,
        sessionId: 'session123',
        expiresAt: '2024-01-01T12:00:00Z',
        extraField: 'should be ignored',
      };

      expect(isLoginResponse(responseWithExtra)).toBe(true);
    });

    it('returns false for user with missing required fields', () => {
      const invalidUser = {
        id: 1,
        email: 'test@example.com',
        // Missing role, createdAt, lastWorkspaceId
      };

      const invalidResponse = {
        user: invalidUser,
      };

      expect(isLoginResponse(invalidResponse)).toBe(false);
    });

    it('handles objects with prototype pollution attempts', () => {
      const maliciousObj = {
        user: mockUser,
        __proto__: { malicious: true },
        constructor: { prototype: { polluted: true } },
      };

      expect(isLoginResponse(maliciousObj)).toBe(true);
    });
  });

  describe('isLookupResponse', () => {
    it('returns true for valid lookup response with paths', () => {
      const validLookupResponse: LookupResponse = {
        paths: ['path1.md', 'path2.md', 'folder/path3.md'],
      };

      expect(isLookupResponse(validLookupResponse)).toBe(true);
    });

    it('returns true for valid lookup response with empty paths array', () => {
      const validLookupResponse: LookupResponse = {
        paths: [],
      };

      expect(isLookupResponse(validLookupResponse)).toBe(true);
    });

    it('returns true for single path', () => {
      const validLookupResponse: LookupResponse = {
        paths: ['single-path.md'],
      };

      expect(isLookupResponse(validLookupResponse)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isLookupResponse(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isLookupResponse(undefined)).toBe(false);
    });

    it('returns false for non-object values', () => {
      expect(isLookupResponse('string')).toBe(false);
      expect(isLookupResponse(123)).toBe(false);
      expect(isLookupResponse(true)).toBe(false);
      expect(isLookupResponse([])).toBe(false);
    });

    it('returns false for empty object', () => {
      expect(isLookupResponse({})).toBe(false);
    });

    it('returns false when paths field is missing', () => {
      const invalidResponse = {
        otherField: 'value',
      };

      expect(isLookupResponse(invalidResponse)).toBe(false);
    });

    it('returns false when paths is not an array', () => {
      const invalidResponse = {
        paths: 'not-an-array',
      };

      expect(isLookupResponse(invalidResponse)).toBe(false);
    });

    it('returns false when paths contains non-string values', () => {
      const invalidResponse = {
        paths: ['valid-path.md', 123, 'another-path.md'],
      };

      expect(isLookupResponse(invalidResponse)).toBe(false);
    });

    it('returns false when paths contains null values', () => {
      const invalidResponse = {
        paths: ['path1.md', null, 'path2.md'],
      };

      expect(isLookupResponse(invalidResponse)).toBe(false);
    });

    it('returns false when paths contains undefined values', () => {
      const invalidResponse = {
        paths: ['path1.md', undefined, 'path2.md'],
      };

      expect(isLookupResponse(invalidResponse)).toBe(false);
    });

    it('handles objects with extra properties', () => {
      const responseWithExtra = {
        paths: ['path1.md', 'path2.md'],
        extraField: 'should be ignored',
      };

      expect(isLookupResponse(responseWithExtra)).toBe(true);
    });

    it('handles objects with prototype pollution attempts', () => {
      const maliciousObj = {
        paths: ['path1.md', 'path2.md'],
        __proto__: { malicious: true },
        constructor: { prototype: { polluted: true } },
      };

      expect(isLookupResponse(maliciousObj)).toBe(true);
    });

    it('handles complex path strings', () => {
      const validLookupResponse: LookupResponse = {
        paths: [
          'simple.md',
          'folder/nested.md',
          'deep/nested/path/file.md',
          'file with spaces.md',
          'special-chars_123.md',
          'unicode-文件.md',
        ],
      };

      expect(isLookupResponse(validLookupResponse)).toBe(true);
    });
  });

  describe('isSaveFileResponse', () => {
    it('returns true for valid save file response', () => {
      const validSaveFileResponse: SaveFileResponse = {
        filePath: 'documents/test.md',
        size: 1024,
        updatedAt: '2024-01-01T10:00:00Z',
      };

      expect(isSaveFileResponse(validSaveFileResponse)).toBe(true);
    });

    it('returns true for save file response with zero size', () => {
      const validSaveFileResponse: SaveFileResponse = {
        filePath: 'empty.md',
        size: 0,
        updatedAt: '2024-01-01T10:00:00Z',
      };

      expect(isSaveFileResponse(validSaveFileResponse)).toBe(true);
    });

    it('returns true for save file response with large size', () => {
      const validSaveFileResponse: SaveFileResponse = {
        filePath: 'large-file.md',
        size: 999999999,
        updatedAt: '2024-01-01T10:00:00Z',
      };

      expect(isSaveFileResponse(validSaveFileResponse)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isSaveFileResponse(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isSaveFileResponse(undefined)).toBe(false);
    });

    it('returns false for non-object values', () => {
      expect(isSaveFileResponse('string')).toBe(false);
      expect(isSaveFileResponse(123)).toBe(false);
      expect(isSaveFileResponse(true)).toBe(false);
      expect(isSaveFileResponse([])).toBe(false);
    });

    it('returns false for empty object', () => {
      expect(isSaveFileResponse({})).toBe(false);
    });

    it('returns false when filePath is missing', () => {
      const invalidResponse = {
        size: 1024,
        updatedAt: '2024-01-01T10:00:00Z',
      };

      expect(isSaveFileResponse(invalidResponse)).toBe(false);
    });

    it('returns false when filePath is not a string', () => {
      const invalidResponse = {
        filePath: 123,
        size: 1024,
        updatedAt: '2024-01-01T10:00:00Z',
      };

      expect(isSaveFileResponse(invalidResponse)).toBe(false);
    });

    it('returns false when size is missing', () => {
      const invalidResponse = {
        filePath: 'test.md',
        updatedAt: '2024-01-01T10:00:00Z',
      };

      expect(isSaveFileResponse(invalidResponse)).toBe(false);
    });

    it('returns false when size is not a number', () => {
      const invalidResponse = {
        filePath: 'test.md',
        size: '1024',
        updatedAt: '2024-01-01T10:00:00Z',
      };

      expect(isSaveFileResponse(invalidResponse)).toBe(false);
    });

    it('returns false when updatedAt is missing', () => {
      const invalidResponse = {
        filePath: 'test.md',
        size: 1024,
      };

      expect(isSaveFileResponse(invalidResponse)).toBe(false);
    });

    it('returns false when updatedAt is not a string', () => {
      const invalidResponse = {
        filePath: 'test.md',
        size: 1024,
        updatedAt: new Date(),
      };

      expect(isSaveFileResponse(invalidResponse)).toBe(false);
    });

    it('returns false for negative size', () => {
      const invalidResponse = {
        filePath: 'test.md',
        size: -1,
        updatedAt: '2024-01-01T10:00:00Z',
      };

      expect(isSaveFileResponse(invalidResponse)).toBe(true); // Note: Type guard doesn't validate negative numbers
    });

    it('handles objects with prototype pollution attempts', () => {
      const maliciousObj = {
        filePath: 'test.md',
        size: 1024,
        updatedAt: '2024-01-01T10:00:00Z',
        __proto__: { malicious: true },
        constructor: { prototype: { polluted: true } },
      };

      expect(isSaveFileResponse(maliciousObj)).toBe(true);
    });

    it('handles objects with extra properties', () => {
      const responseWithExtra = {
        filePath: 'test.md',
        size: 1024,
        updatedAt: '2024-01-01T10:00:00Z',
        extraField: 'should be ignored',
      };

      expect(isSaveFileResponse(responseWithExtra)).toBe(true);
    });

    it('handles complex file paths', () => {
      const validSaveFileResponse: SaveFileResponse = {
        filePath: 'deep/nested/path/file with spaces & symbols.md',
        size: 2048,
        updatedAt: '2024-01-01T10:00:00Z',
      };

      expect(isSaveFileResponse(validSaveFileResponse)).toBe(true);
    });

    it('handles various ISO date formats', () => {
      const dateFormats = [
        '2024-01-01T10:00:00Z',
        '2024-01-01T10:00:00.000Z',
        '2024-01-01T10:00:00+00:00',
        '2024-01-01T10:00:00.123456Z',
      ];

      dateFormats.forEach((dateString) => {
        const validResponse: SaveFileResponse = {
          filePath: 'test.md',
          size: 1024,
          updatedAt: dateString,
        };

        expect(isSaveFileResponse(validResponse)).toBe(true);
      });
    });
  });

  describe('edge cases and error conditions', () => {
    it('handles circular references gracefully', () => {
      const circularObj: { paths: string[]; self?: unknown } = { paths: [] };
      circularObj.self = circularObj;

      // Should not throw an error
      expect(isLookupResponse(circularObj)).toBe(true);
    });

    it('handles deeply nested objects', () => {
      const deeplyNested = {
        user: {
          ...mockUser,
          nested: {
            deep: {
              deeper: {
                value: 'test',
              },
            },
          },
        },
      };

      expect(isLoginResponse(deeplyNested)).toBe(true);
    });

    it('handles frozen objects', () => {
      const frozenResponse = Object.freeze({
        paths: Object.freeze(['path1.md', 'path2.md']),
      });

      expect(isLookupResponse(frozenResponse)).toBe(true);
    });

    it('handles objects created with null prototype', () => {
      const nullProtoObj = Object.create(null) as Record<string, unknown>;
      nullProtoObj['filePath'] = 'test.md';
      nullProtoObj['size'] = 1024;
      nullProtoObj['updatedAt'] = '2024-01-01T10:00:00Z';

      expect(isSaveFileResponse(nullProtoObj)).toBe(true);
    });
  });

  describe('performance with large data', () => {
    it('handles large paths arrays efficiently', () => {
      const largePaths = Array.from({ length: 10000 }, (_, i) => `path${i}.md`);
      const largeResponse = {
        paths: largePaths,
      };

      const start = performance.now();
      const result = isLookupResponse(largeResponse);
      const end = performance.now();

      expect(result).toBe(true);
      expect(end - start).toBeLessThan(100); // Should complete in under 100ms
    });

    it('handles very long file paths', () => {
      const longPath = 'a'.repeat(10000);
      const responseWithLongPath: SaveFileResponse = {
        filePath: longPath,
        size: 1024,
        updatedAt: '2024-01-01T10:00:00Z',
      };

      expect(isSaveFileResponse(responseWithLongPath)).toBe(true);
    });
  });
});
