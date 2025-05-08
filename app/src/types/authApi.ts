declare global {
  interface Window {
    API_BASE_URL: string;
  }
}

export const API_BASE_URL = window.API_BASE_URL;

/**
 * User role in the system
 */
export enum UserRole {
  Admin = 'admin',
  Editor = 'editor',
  Viewer = 'viewer',
}

/**
 * Type guard to check if a value is a valid UserRole
 */
export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && value in UserRole;
}

/**
 * User model from the API
 */
export interface User {
  id: number;
  email: string;
  displayName?: string;
  role: UserRole;
  createdAt: string;
  lastWorkspaceId: number;
}

/**
 * Type guard to check if a value is a valid User
 */
export function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof (value as User).id === 'number' &&
    'email' in value &&
    typeof (value as User).email === 'string' &&
    ('displayName' in value
      ? typeof (value as User).displayName === 'string'
      : true) &&
    'role' in value &&
    isUserRole((value as User).role) &&
    'createdAt' in value &&
    typeof (value as User).createdAt === 'string' &&
    'lastWorkspaceId' in value &&
    typeof (value as User).lastWorkspaceId === 'number'
  );
}

/**
 * Error response from the API
 */
export interface ErrorResponse {
  message: string;
}

/**
 * Login request parameters
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * API call options extending the standard RequestInit
 */
export interface ApiCallOptions extends RequestInit {
  headers?: HeadersInit;
}
