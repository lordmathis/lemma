import type { UserRole } from './authApi';

// CreateUserRequest holds the request fields for creating a new user
export interface CreateUserRequest {
  email: string;
  displayName: string;
  password: string;
  role: UserRole;
}

// UpdateUserRequest holds the request fields for updating a user
export interface UpdateUserRequest {
  email?: string;
  displayName?: string;
  password?: string;
  role?: UserRole;
}

// WorkspaceStats holds workspace statistics
export interface WorkspaceStats {
  userID: number;
  userEmail: string;
  workspaceID: number;
  workspaceName: string;
  workspaceCreatedAt: string; // Using ISO string format for time.Time
  fileCountStats?: FileCountStats;
}

// Define FileCountStats based on the Go struct definition of storage.FileCountStats
export interface FileCountStats {
  totalFiles: number;
  totalSize: number;
}

export interface UserStats {
  totalUsers: number;
  totalWorkspaces: number;
  activeUsers: number; // Users with activity in last 30 days
}

// SystemStats holds system-wide statistics
export interface SystemStats extends FileCountStats, UserStats {}

// isSystemStats checks if the given object is a valid SystemStats object
export function isSystemStats(obj: unknown): obj is SystemStats {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'totalUsers' in obj &&
    typeof (obj as SystemStats).totalUsers === 'number' &&
    'totalWorkspaces' in obj &&
    typeof (obj as SystemStats).totalWorkspaces === 'number' &&
    'activeUsers' in obj &&
    typeof (obj as SystemStats).activeUsers === 'number' &&
    'totalFiles' in obj &&
    typeof (obj as SystemStats).totalFiles === 'number' &&
    'totalSize' in obj &&
    typeof (obj as SystemStats).totalSize === 'number'
  );
}
