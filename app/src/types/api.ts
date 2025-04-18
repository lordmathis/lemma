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
  Viewer = 'viewer'
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
 * Login response from the API
 */
export interface LoginResponse {
  user: User;
  sessionId: string;
  expiresAt: string;
}

/**
 * API call options extending the standard RequestInit
 */
export interface ApiCallOptions extends RequestInit {
  headers?: HeadersInit;
}