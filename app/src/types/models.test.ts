import { describe, it, expect } from 'vitest';
import {
  isUser,
  isUserRole,
  isWorkspace,
  isFileNode,
  isSystemStats,
  UserRole,
  Theme,
  type User,
  type Workspace,
  type FileNode,
  type SystemStats,
} from './models';

describe('Models Type Guards', () => {
  describe('isUserRole', () => {
    it('returns true for valid admin role', () => {
      expect(isUserRole(UserRole.Admin)).toBe(true);
      expect(isUserRole('admin')).toBe(true);
    });

    it('returns true for valid editor role', () => {
      expect(isUserRole(UserRole.Editor)).toBe(true);
      expect(isUserRole('editor')).toBe(true);
    });

    it('returns true for valid viewer role', () => {
      expect(isUserRole(UserRole.Viewer)).toBe(true);
      expect(isUserRole('viewer')).toBe(true);
    });

    it('returns false for invalid role strings', () => {
      expect(isUserRole('invalid')).toBe(false);
      expect(isUserRole('Administrator')).toBe(false);
      expect(isUserRole('ADMIN')).toBe(false);
      expect(isUserRole('')).toBe(false);
    });

    it('returns false for non-string values', () => {
      expect(isUserRole(123)).toBe(false);
      expect(isUserRole(null)).toBe(false);
      expect(isUserRole(undefined)).toBe(false);
      expect(isUserRole({})).toBe(false);
      expect(isUserRole([])).toBe(false);
      expect(isUserRole(true)).toBe(false);
    });

    it('handles objects with prototype pollution attempts', () => {
      const maliciousRole = 'editor';
      Object.setPrototypeOf(maliciousRole, {
        toString: () => 'malicious',
        valueOf: () => 'malicious',
      });

      expect(isUserRole(maliciousRole)).toBe(true);
    });
  });

  describe('isUser', () => {
    const validUser: User = {
      id: 1,
      email: 'test@example.com',
      displayName: 'Test User',
      role: UserRole.Editor,
      theme: Theme.Dark,
      createdAt: '2024-01-01T00:00:00Z',
      lastWorkspaceId: 1,
    };

    it('returns true for valid user with all fields', () => {
      expect(isUser(validUser)).toBe(true);
    });

    it('returns true for valid user without optional displayName', () => {
      const userWithoutDisplayName: User = {
        id: 1,
        email: 'test@example.com',
        role: UserRole.Editor,
        theme: Theme.Dark,
        createdAt: '2024-01-01T00:00:00Z',
        lastWorkspaceId: 1,
      };

      expect(isUser(userWithoutDisplayName)).toBe(true);
    });

    it('returns true for valid user with empty displayName', () => {
      const userWithEmptyDisplayName = {
        ...validUser,
        displayName: '',
      };

      expect(isUser(userWithEmptyDisplayName)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isUser(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isUser(undefined)).toBe(false);
    });

    it('returns false for non-object values', () => {
      expect(isUser('string')).toBe(false);
      expect(isUser(123)).toBe(false);
      expect(isUser(true)).toBe(false);
      expect(isUser([])).toBe(false);
    });

    it('returns false for empty object', () => {
      expect(isUser({})).toBe(false);
    });

    it('returns false when id is missing', () => {
      const { id: _id, ...userWithoutId } = validUser;
      expect(isUser(userWithoutId)).toBe(false);
    });

    it('returns false when id is not a number', () => {
      const userWithInvalidId = { ...validUser, id: '1' };
      expect(isUser(userWithInvalidId)).toBe(false);
    });

    it('returns false when email is missing', () => {
      const { email: _email, ...userWithoutEmail } = validUser;
      expect(isUser(userWithoutEmail)).toBe(false);
    });

    it('returns false when email is not a string', () => {
      const userWithInvalidEmail = { ...validUser, email: 123 };
      expect(isUser(userWithInvalidEmail)).toBe(false);
    });

    it('returns false when displayName is not a string', () => {
      const userWithInvalidDisplayName = { ...validUser, displayName: 123 };
      expect(isUser(userWithInvalidDisplayName)).toBe(false);
    });

    it('returns false when role is missing', () => {
      const { role: _role, ...userWithoutRole } = validUser;
      expect(isUser(userWithoutRole)).toBe(false);
    });

    it('returns false when role is invalid', () => {
      const userWithInvalidRole = { ...validUser, role: 'invalid' };
      expect(isUser(userWithInvalidRole)).toBe(false);
    });

    it('returns false when createdAt is missing', () => {
      const { createdAt: _createdAt, ...userWithoutCreatedAt } = validUser;
      expect(isUser(userWithoutCreatedAt)).toBe(false);
    });

    it('returns false when createdAt is not a string', () => {
      const userWithInvalidCreatedAt = { ...validUser, createdAt: new Date() };
      expect(isUser(userWithInvalidCreatedAt)).toBe(false);
    });

    it('returns false when lastWorkspaceId is missing', () => {
      const {
        lastWorkspaceId: _lastWorkspaceId,
        ...userWithoutLastWorkspaceId
      } = validUser;
      expect(isUser(userWithoutLastWorkspaceId)).toBe(false);
    });

    it('returns false when lastWorkspaceId is not a number', () => {
      const userWithInvalidLastWorkspaceId = {
        ...validUser,
        lastWorkspaceId: '1',
      };
      expect(isUser(userWithInvalidLastWorkspaceId)).toBe(false);
    });

    it('handles objects with extra properties', () => {
      const userWithExtra = {
        ...validUser,
        extraField: 'should be ignored',
      };

      expect(isUser(userWithExtra)).toBe(true);
    });

    it('handles objects with prototype pollution attempts', () => {
      const maliciousUser = {
        id: 1,
        email: 'test@example.com',
        role: UserRole.Editor,
        theme: Theme.Dark,
        createdAt: '2024-01-01T00:00:00Z',
        lastWorkspaceId: 1,
        __proto__: { malicious: true },
        constructor: { prototype: { polluted: true } },
      };

      expect(isUser(maliciousUser)).toBe(true);
    });

    it('handles different user roles', () => {
      expect(isUser({ ...validUser, role: UserRole.Admin })).toBe(true);
      expect(isUser({ ...validUser, role: UserRole.Editor })).toBe(true);
      expect(isUser({ ...validUser, role: UserRole.Viewer })).toBe(true);
    });

    it('handles various email formats', () => {
      const emailFormats = [
        'simple@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user123@example-domain.com',
        'very.long.email.address@very.long.domain.name.com',
      ];

      emailFormats.forEach((email) => {
        expect(isUser({ ...validUser, email })).toBe(true);
      });
    });
  });

  describe('isWorkspace', () => {
    const validWorkspace: Workspace = {
      id: 1,
      userId: 1,
      name: 'test-workspace',
      createdAt: '2024-01-01T00:00:00Z',
      theme: Theme.Light,
      autoSave: false,
      showHiddenFiles: false,
      gitEnabled: false,
      gitUrl: '',
      gitUser: '',
      gitToken: '',
      gitAutoCommit: false,
      gitCommitMsgTemplate: '${action} ${filename}',
      gitCommitName: '',
      gitCommitEmail: '',
    };

    it('returns true for valid workspace with all fields', () => {
      expect(isWorkspace(validWorkspace)).toBe(true);
    });

    it('returns true for workspace without optional id and userId', () => {
      const {
        id: _id,
        userId: _userId,
        ...workspaceWithoutIds
      } = validWorkspace;
      expect(isWorkspace(workspaceWithoutIds)).toBe(true);
    });

    it('returns true for workspace with numeric createdAt', () => {
      const workspaceWithNumericCreatedAt = {
        ...validWorkspace,
        createdAt: Date.now(),
      };

      expect(isWorkspace(workspaceWithNumericCreatedAt)).toBe(true);
    });

    it('returns true for workspace with dark theme', () => {
      const darkWorkspace = {
        ...validWorkspace,
        theme: Theme.Dark,
      };

      expect(isWorkspace(darkWorkspace)).toBe(true);
    });

    it('returns true for workspace with git enabled', () => {
      const gitWorkspace = {
        ...validWorkspace,
        gitEnabled: true,
        gitUrl: 'https://github.com/user/repo.git',
        gitUser: 'username',
        gitToken: 'token123',
        gitAutoCommit: true,
        gitCommitMsgTemplate: 'auto: ${action} ${filename}',
        gitCommitName: 'Git User',
        gitCommitEmail: 'git@example.com',
      };

      expect(isWorkspace(gitWorkspace)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isWorkspace(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isWorkspace(undefined)).toBe(false);
    });

    it('returns false for non-object values', () => {
      expect(isWorkspace('string')).toBe(false);
      expect(isWorkspace(123)).toBe(false);
      expect(isWorkspace(true)).toBe(false);
      expect(isWorkspace([])).toBe(false);
    });

    it('returns false for empty object', () => {
      expect(isWorkspace({})).toBe(false);
    });

    it('returns false when name is missing', () => {
      const { name: _name, ...workspaceWithoutName } = validWorkspace;
      expect(isWorkspace(workspaceWithoutName)).toBe(false);
    });

    it('returns false when name is not a string', () => {
      const workspaceWithInvalidName = { ...validWorkspace, name: 123 };
      expect(isWorkspace(workspaceWithInvalidName)).toBe(false);
    });

    it('returns false when createdAt is missing', () => {
      const { createdAt: _createdAt, ...workspaceWithoutCreatedAt } =
        validWorkspace;
      expect(isWorkspace(workspaceWithoutCreatedAt)).toBe(false);
    });

    it('returns false when createdAt is neither string nor number', () => {
      const workspaceWithInvalidCreatedAt = {
        ...validWorkspace,
        createdAt: new Date(),
      };
      expect(isWorkspace(workspaceWithInvalidCreatedAt)).toBe(false);
    });

    it('returns false when theme is missing', () => {
      const { theme: _theme, ...workspaceWithoutTheme } = validWorkspace;
      expect(isWorkspace(workspaceWithoutTheme)).toBe(false);
    });

    it('returns false when theme is not a string', () => {
      const workspaceWithInvalidTheme = { ...validWorkspace, theme: 123 };
      expect(isWorkspace(workspaceWithInvalidTheme)).toBe(false);
    });

    it('returns false when boolean fields are not boolean', () => {
      const booleanFields = [
        'autoSave',
        'showHiddenFiles',
        'gitEnabled',
        'gitAutoCommit',
      ];

      booleanFields.forEach((field) => {
        const workspaceWithInvalidBoolean = {
          ...validWorkspace,
          [field]: 'true',
        };
        expect(isWorkspace(workspaceWithInvalidBoolean)).toBe(false);
      });
    });

    it('returns false when string fields are not strings', () => {
      const stringFields = [
        'gitUrl',
        'gitUser',
        'gitToken',
        'gitCommitMsgTemplate',
        'gitCommitName',
        'gitCommitEmail',
      ];

      stringFields.forEach((field) => {
        const workspaceWithInvalidString = { ...validWorkspace, [field]: 123 };
        expect(isWorkspace(workspaceWithInvalidString)).toBe(false);
      });
    });

    it('handles objects with extra properties', () => {
      const workspaceWithExtra = {
        ...validWorkspace,
        extraField: 'should be ignored',
      };

      expect(isWorkspace(workspaceWithExtra)).toBe(true);
    });

    it('handles objects with prototype pollution attempts', () => {
      const maliciousWorkspace = {
        ...validWorkspace,
        __proto__: { malicious: true },
        constructor: { prototype: { polluted: true } },
      };

      expect(isWorkspace(maliciousWorkspace)).toBe(true);
    });

    it('handles various workspace names', () => {
      const workspaceNames = [
        'simple',
        'workspace-with-dashes',
        'workspace_with_underscores',
        'workspace with spaces',
        'workspace123',
        'very-long-workspace-name-with-many-characters',
        'unicode-工作区',
      ];

      workspaceNames.forEach((name) => {
        expect(isWorkspace({ ...validWorkspace, name })).toBe(true);
      });
    });
  });

  describe('isFileNode', () => {
    const validFileNode: FileNode = {
      id: '1',
      name: 'test.md',
      path: 'documents/test.md',
    };

    const validFolderNode: FileNode = {
      id: '2',
      name: 'documents',
      path: 'documents',
      children: [
        {
          id: '3',
          name: 'nested.md',
          path: 'documents/nested.md',
        },
      ],
    };

    it('returns true for valid file node without children', () => {
      expect(isFileNode(validFileNode)).toBe(true);
    });

    it('returns true for valid folder node with children', () => {
      expect(isFileNode(validFolderNode)).toBe(true);
    });

    it('returns true for node with empty children array', () => {
      const nodeWithEmptyChildren = {
        ...validFileNode,
        children: [],
      };

      expect(isFileNode(nodeWithEmptyChildren)).toBe(true);
    });

    it('returns true for node with null children', () => {
      const nodeWithNullChildren = {
        ...validFileNode,
        children: null,
      };

      expect(isFileNode(nodeWithNullChildren)).toBe(true);
    });

    it('returns true for node with undefined children', () => {
      const nodeWithUndefinedChildren = {
        ...validFileNode,
        children: undefined,
      };

      expect(isFileNode(nodeWithUndefinedChildren)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isFileNode(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isFileNode(undefined)).toBe(false);
    });

    it('returns false for non-object values', () => {
      expect(isFileNode('string')).toBe(false);
      expect(isFileNode(123)).toBe(false);
      expect(isFileNode(true)).toBe(false);
      expect(isFileNode([])).toBe(false);
    });

    it('returns false for empty object', () => {
      expect(isFileNode({})).toBe(false);
    });

    it('returns false when id is missing', () => {
      const { id: _id, ...nodeWithoutId } = validFileNode;
      expect(isFileNode(nodeWithoutId)).toBe(false);
    });

    it('returns false when id is not a string', () => {
      const nodeWithInvalidId = { ...validFileNode, id: 123 };
      expect(isFileNode(nodeWithInvalidId)).toBe(false);
    });

    it('returns false when name is missing', () => {
      const { name: _name, ...nodeWithoutName } = validFileNode;
      expect(isFileNode(nodeWithoutName)).toBe(false);
    });

    it('returns false when name is not a string', () => {
      const nodeWithInvalidName = { ...validFileNode, name: 123 };
      expect(isFileNode(nodeWithInvalidName)).toBe(false);
    });

    it('returns false when path is missing', () => {
      const { path: _path, ...nodeWithoutPath } = validFileNode;
      expect(isFileNode(nodeWithoutPath)).toBe(false);
    });

    it('returns false when path is not a string', () => {
      const nodeWithInvalidPath = { ...validFileNode, path: 123 };
      expect(isFileNode(nodeWithInvalidPath)).toBe(false);
    });

    it('returns false when children is not an array', () => {
      const nodeWithInvalidChildren = {
        ...validFileNode,
        children: 'not-an-array',
      };

      expect(isFileNode(nodeWithInvalidChildren)).toBe(false);
    });

    it('handles nested file structures', () => {
      const deeplyNestedNode: FileNode = {
        id: '1',
        name: 'root',
        path: 'root',
        children: [
          {
            id: '2',
            name: 'level1',
            path: 'root/level1',
            children: [
              {
                id: '3',
                name: 'level2',
                path: 'root/level1/level2',
                children: [
                  {
                    id: '4',
                    name: 'deep-file.md',
                    path: 'root/level1/level2/deep-file.md',
                  },
                ],
              },
            ],
          },
        ],
      };

      expect(isFileNode(deeplyNestedNode)).toBe(true);
    });

    it('handles various file and folder names', () => {
      const names = [
        'simple.md',
        'file-with-dashes.md',
        'file_with_underscores.md',
        'file with spaces.md',
        'file.with.dots.md',
        'UPPERCASE.MD',
        'MixedCase.Md',
        'unicode-文件.md',
        'no-extension',
        '.hidden-file',
        'folder',
      ];

      names.forEach((name) => {
        const node = {
          id: '1',
          name,
          path: name,
        };
        expect(isFileNode(node)).toBe(true);
      });
    });

    it('handles objects with extra properties', () => {
      const nodeWithExtra = {
        ...validFileNode,
        extraField: 'should be ignored',
      };

      expect(isFileNode(nodeWithExtra)).toBe(true);
    });

    it('handles objects with prototype pollution attempts', () => {
      const maliciousNode = {
        ...validFileNode,
        __proto__: { malicious: true },
        constructor: { prototype: { polluted: true } },
      };

      expect(isFileNode(maliciousNode)).toBe(true);
    });
  });

  describe('isSystemStats', () => {
    const validSystemStats: SystemStats = {
      totalUsers: 10,
      totalWorkspaces: 5,
      activeUsers: 8,
      totalFiles: 100,
      totalSize: 1024000,
    };

    it('returns true for valid system stats', () => {
      expect(isSystemStats(validSystemStats)).toBe(true);
    });

    it('returns true for stats with zero values', () => {
      const statsWithZeros = {
        totalUsers: 0,
        totalWorkspaces: 0,
        activeUsers: 0,
        totalFiles: 0,
        totalSize: 0,
      };

      expect(isSystemStats(statsWithZeros)).toBe(true);
    });

    it('returns true for stats with large numbers', () => {
      const statsWithLargeNumbers = {
        totalUsers: 999999,
        totalWorkspaces: 888888,
        activeUsers: 777777,
        totalFiles: 666666,
        totalSize: 555555555555,
      };

      expect(isSystemStats(statsWithLargeNumbers)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isSystemStats(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isSystemStats(undefined)).toBe(false);
    });

    it('returns false for non-object values', () => {
      expect(isSystemStats('string')).toBe(false);
      expect(isSystemStats(123)).toBe(false);
      expect(isSystemStats(true)).toBe(false);
      expect(isSystemStats([])).toBe(false);
    });

    it('returns false for empty object', () => {
      expect(isSystemStats({})).toBe(false);
    });

    it('returns false when totalUsers is missing', () => {
      const { totalUsers: _totalUsers, ...statsWithoutTotalUsers } =
        validSystemStats;
      expect(isSystemStats(statsWithoutTotalUsers)).toBe(false);
    });

    it('returns false when totalUsers is not a number', () => {
      const statsWithInvalidTotalUsers = {
        ...validSystemStats,
        totalUsers: '10',
      };
      expect(isSystemStats(statsWithInvalidTotalUsers)).toBe(false);
    });

    it('returns false when totalWorkspaces is missing', () => {
      const {
        totalWorkspaces: _totalWorkspaces,
        ...statsWithoutTotalWorkspaces
      } = validSystemStats;
      expect(isSystemStats(statsWithoutTotalWorkspaces)).toBe(false);
    });

    it('returns false when totalWorkspaces is not a number', () => {
      const statsWithInvalidTotalWorkspaces = {
        ...validSystemStats,
        totalWorkspaces: '5',
      };
      expect(isSystemStats(statsWithInvalidTotalWorkspaces)).toBe(false);
    });

    it('returns false when activeUsers is missing', () => {
      const { activeUsers: _activeUsers, ...statsWithoutActiveUsers } =
        validSystemStats;
      expect(isSystemStats(statsWithoutActiveUsers)).toBe(false);
    });

    it('returns false when activeUsers is not a number', () => {
      const statsWithInvalidActiveUsers = {
        ...validSystemStats,
        activeUsers: '8',
      };
      expect(isSystemStats(statsWithInvalidActiveUsers)).toBe(false);
    });

    it('returns false when totalFiles is missing', () => {
      const { totalFiles: _totalFiles, ...statsWithoutTotalFiles } =
        validSystemStats;
      expect(isSystemStats(statsWithoutTotalFiles)).toBe(false);
    });

    it('returns false when totalFiles is not a number', () => {
      const statsWithInvalidTotalFiles = {
        ...validSystemStats,
        totalFiles: '100',
      };
      expect(isSystemStats(statsWithInvalidTotalFiles)).toBe(false);
    });

    it('returns false when totalSize is missing', () => {
      const { totalSize: _totalSize, ...statsWithoutTotalSize } =
        validSystemStats;
      expect(isSystemStats(statsWithoutTotalSize)).toBe(false);
    });

    it('returns false when totalSize is not a number', () => {
      const statsWithInvalidTotalSize = {
        ...validSystemStats,
        totalSize: '1024000',
      };
      expect(isSystemStats(statsWithInvalidTotalSize)).toBe(false);
    });

    it('handles objects with extra properties', () => {
      const statsWithExtra = {
        ...validSystemStats,
        extraField: 'should be ignored',
      };

      expect(isSystemStats(statsWithExtra)).toBe(true);
    });

    it('handles objects with prototype pollution attempts', () => {
      const maliciousStats = {
        ...validSystemStats,
        __proto__: { malicious: true },
        constructor: { prototype: { polluted: true } },
      };

      expect(isSystemStats(maliciousStats)).toBe(true);
    });

    it('handles floating point numbers', () => {
      const statsWithFloats = {
        totalUsers: 10.5,
        totalWorkspaces: 5.7,
        activeUsers: 8.2,
        totalFiles: 100.9,
        totalSize: 1024000.123,
      };

      expect(isSystemStats(statsWithFloats)).toBe(true);
    });

    it('handles negative numbers', () => {
      const statsWithNegatives = {
        totalUsers: -10,
        totalWorkspaces: -5,
        activeUsers: -8,
        totalFiles: -100,
        totalSize: -1024000,
      };

      expect(isSystemStats(statsWithNegatives)).toBe(true); // Type guard doesn't validate ranges
    });
  });

  describe('edge cases and error conditions', () => {
    it('handles circular references gracefully', () => {
      const circularUser: Record<string, unknown> = {
        id: 1,
        email: 'test@example.com',
        role: UserRole.Editor,
        theme: Theme.Dark,
        createdAt: '2024-01-01T00:00:00Z',
        lastWorkspaceId: 1,
      };
      circularUser['self'] = circularUser;

      expect(isUser(circularUser)).toBe(true);
    });

    it('handles deeply nested file structures', () => {
      let deepNode: FileNode = {
        id: '1',
        name: 'root',
        path: 'root',
      };

      // Create a deeply nested structure
      for (let i = 2; i <= 100; i++) {
        deepNode = {
          id: i.toString(),
          name: `level${i}`,
          path: `root/level${i}`,
          children: [deepNode],
        };
      }

      expect(isFileNode(deepNode)).toBe(true);
    });

    it('handles frozen objects', () => {
      const frozenUser = Object.freeze({
        id: 1,
        email: 'test@example.com',
        role: UserRole.Editor,
        theme: Theme.Dark,
        createdAt: '2024-01-01T00:00:00Z',
        lastWorkspaceId: 1,
      });

      expect(isUser(frozenUser)).toBe(true);
    });

    it('handles objects created with null prototype', () => {
      const nullProtoStats = Object.create(null) as Record<string, unknown>;
      nullProtoStats['totalUsers'] = 10;
      nullProtoStats['totalWorkspaces'] = 5;
      nullProtoStats['activeUsers'] = 8;
      nullProtoStats['totalFiles'] = 100;
      nullProtoStats['totalSize'] = 1024000;

      expect(isSystemStats(nullProtoStats)).toBe(true);
    });
  });

  describe('performance with large data', () => {
    it('handles large file trees efficiently', () => {
      const largeChildren = Array.from({ length: 1000 }, (_, i) => ({
        id: i.toString(),
        name: `file${i}.md`,
        path: `folder/file${i}.md`,
      }));

      const largeFileTree: FileNode = {
        id: 'root',
        name: 'folder',
        path: 'folder',
        children: largeChildren,
      };

      const start = performance.now();
      const result = isFileNode(largeFileTree);
      const end = performance.now();

      expect(result).toBe(true);
      expect(end - start).toBeLessThan(100); // Should complete in under 100ms
    });

    it('handles very long strings efficiently', () => {
      const longString = 'a'.repeat(100000);
      const userWithLongEmail = {
        id: 1,
        email: longString,
        role: UserRole.Editor,
        theme: Theme.Dark,
        createdAt: '2024-01-01T00:00:00Z',
        lastWorkspaceId: 1,
      };

      const start = performance.now();
      const result = isUser(userWithLongEmail);
      const end = performance.now();

      expect(result).toBe(true);
      expect(end - start).toBeLessThan(10); // Should be very fast
    });
  });
});
