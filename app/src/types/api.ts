import { isUser, type User, type UserRole } from './models';

declare global {
  interface Window {
    API_BASE_URL: string;
  }
}

export const API_BASE_URL = window.API_BASE_URL;

/**
 * Error response from the API
 */
export interface ErrorResponse {
  message: string;
}

/**
 * API call options extending the standard RequestInit
 */
export interface ApiCallOptions extends RequestInit {
  headers?: HeadersInit;
}

/**
 * Login request parameters
 */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  sessionId?: string;
  expiresAt?: string; // ISO 8601 string representation of the date
}

export function isLoginResponse(obj: unknown): obj is LoginResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'user' in obj &&
    isUser(obj.user) &&
    (!('sessionId' in obj) ||
      typeof (obj as LoginResponse).sessionId === 'string') &&
    (!('expiresAt' in obj) ||
      typeof (obj as LoginResponse).expiresAt === 'string')
  );
}

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

export interface LookupResponse {
  paths: string[];
}

export function isLookupResponse(obj: unknown): obj is LookupResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'paths' in obj &&
    Array.isArray((obj as LookupResponse).paths) &&
    (obj as LookupResponse).paths.every((path) => typeof path === 'string')
  );
}

export interface SaveFileResponse {
  filePath: string;
  size: number;
  updatedAt: string; // ISO 8601 string representation of the date
}

export function isSaveFileResponse(obj: unknown): obj is SaveFileResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'filePath' in obj &&
    typeof (obj as SaveFileResponse).filePath === 'string' &&
    'size' in obj &&
    typeof (obj as SaveFileResponse).size === 'number' &&
    'updatedAt' in obj &&
    typeof (obj as SaveFileResponse).updatedAt === 'string'
  );
}

export interface UpdateLastOpenedFileRequest {
  filePath: string;
}

// UpdateProfileRequest represents a user profile update request
export interface UpdateProfileRequest {
  displayName?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

// DeleteAccountRequest represents a user account deletion request
export interface DeleteAccountRequest {
  password: string;
}
