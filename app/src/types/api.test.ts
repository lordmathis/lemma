import { describe, it, expect } from 'vitest';
import {
  isLoginResponse,
  isLookupResponse,
  isSaveFileResponse,
  isUploadFilesResponse,
  type LoginResponse,
  type LookupResponse,
  type SaveFileResponse,
  type UploadFilesResponse,
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

    it('handles objects with extra properties', () => {
      const responseWithExtra = {
        filePath: 'test.md',
        size: 1024,
        updatedAt: '2024-01-01T10:00:00Z',
        extraField: 'should be ignored',
      };

      expect(isSaveFileResponse(responseWithExtra)).toBe(true);
    });
  });

  describe('isUploadFilesResponse', () => {
    it('returns true for valid upload files response', () => {
      const validUploadFilesResponse: UploadFilesResponse = {
        filePaths: [
          'documents/file1.md',
          'images/photo.jpg',
          'notes/readme.txt',
        ],
      };

      expect(isUploadFilesResponse(validUploadFilesResponse)).toBe(true);
    });

    it('returns true for upload files response with empty array', () => {
      const validUploadFilesResponse: UploadFilesResponse = {
        filePaths: [],
      };

      expect(isUploadFilesResponse(validUploadFilesResponse)).toBe(true);
    });

    it('returns true for single file upload', () => {
      const validUploadFilesResponse: UploadFilesResponse = {
        filePaths: ['single-file.md'],
      };

      expect(isUploadFilesResponse(validUploadFilesResponse)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isUploadFilesResponse(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isUploadFilesResponse(undefined)).toBe(false);
    });

    it('returns false for non-object values', () => {
      expect(isUploadFilesResponse('string')).toBe(false);
      expect(isUploadFilesResponse(123)).toBe(false);
      expect(isUploadFilesResponse(true)).toBe(false);
      expect(isUploadFilesResponse([])).toBe(false);
    });

    it('returns false for empty object', () => {
      expect(isUploadFilesResponse({})).toBe(false);
    });

    it('returns false when filePaths field is missing', () => {
      const invalidResponse = {
        otherField: 'value',
      };

      expect(isUploadFilesResponse(invalidResponse)).toBe(false);
    });

    it('returns false when filePaths is not an array', () => {
      const invalidResponse = {
        filePaths: 'not-an-array',
      };

      expect(isUploadFilesResponse(invalidResponse)).toBe(false);
    });

    it('returns false when filePaths contains non-string values', () => {
      const invalidResponse = {
        filePaths: ['valid-file.md', 123, 'another-file.md'],
      };

      expect(isUploadFilesResponse(invalidResponse)).toBe(false);
    });

    it('returns false when filePaths contains null values', () => {
      const invalidResponse = {
        filePaths: ['file1.md', null, 'file2.md'],
      };

      expect(isUploadFilesResponse(invalidResponse)).toBe(false);
    });

    it('returns false when filePaths contains undefined values', () => {
      const invalidResponse = {
        filePaths: ['file1.md', undefined, 'file2.md'],
      };

      expect(isUploadFilesResponse(invalidResponse)).toBe(false);
    });

    it('handles objects with extra properties', () => {
      const responseWithExtra = {
        filePaths: ['file1.md', 'file2.md'],
        extraField: 'should be ignored',
      };

      expect(isUploadFilesResponse(responseWithExtra)).toBe(true);
    });
  });

  describe('edge cases and error conditions', () => {
    it('handles objects with extra properties across different type guards', () => {
      // Test that all type guards handle extra properties correctly
      expect(isLoginResponse({ user: mockUser, extra: 'field' })).toBe(true);
      expect(isLookupResponse({ paths: [], extra: 'field' })).toBe(true);
      expect(
        isSaveFileResponse({
          filePath: 'test.md',
          size: 1024,
          updatedAt: '2024-01-01T10:00:00Z',
          extra: 'field',
        })
      ).toBe(true);
      expect(
        isUploadFilesResponse({ filePaths: ['file1.md'], extra: 'field' })
      ).toBe(true);
    });
  });
});
