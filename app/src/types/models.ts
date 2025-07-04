import type { Parent } from 'unist';

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
  return (
    typeof value === 'string' &&
    Object.values(UserRole).includes(value as UserRole)
  );
}

export enum Theme {
  Light = 'light',
  Dark = 'dark',
}

export interface WorkspaceSettings {
  theme: Theme;
  autoSave: boolean;
  showHiddenFiles: boolean;
  gitEnabled: boolean;
  gitUrl: string;
  gitUser: string;
  gitToken: string;
  gitAutoCommit: boolean;
  gitCommitMsgTemplate: string;
  gitCommitName: string;
  gitCommitEmail: string;
}

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
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

export interface Workspace extends WorkspaceSettings {
  id?: number;
  userId?: number;
  name: string;
  createdAt: number | string;
  lastOpenedFilePath?: string;
}

export const DEFAULT_WORKSPACE: Workspace = {
  name: '',
  createdAt: Date.now(),
  lastOpenedFilePath: '',
  ...DEFAULT_WORKSPACE_SETTINGS,
};

export function isWorkspace(obj: unknown): obj is Workspace {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    typeof (obj as Workspace).name === 'string' &&
    'createdAt' in obj &&
    (typeof (obj as Workspace).createdAt === 'number' ||
      typeof (obj as Workspace).createdAt === 'string') &&
    'theme' in obj &&
    typeof (obj as Workspace).theme === 'string' &&
    'autoSave' in obj &&
    typeof (obj as Workspace).autoSave === 'boolean' &&
    'showHiddenFiles' in obj &&
    typeof (obj as Workspace).showHiddenFiles === 'boolean' &&
    'gitEnabled' in obj &&
    typeof (obj as Workspace).gitEnabled === 'boolean' &&
    'gitUrl' in obj &&
    typeof (obj as Workspace).gitUrl === 'string' &&
    'gitUser' in obj &&
    typeof (obj as Workspace).gitUser === 'string' &&
    'gitToken' in obj &&
    typeof (obj as Workspace).gitToken === 'string' &&
    'gitAutoCommit' in obj &&
    typeof (obj as Workspace).gitAutoCommit === 'boolean' &&
    'gitCommitMsgTemplate' in obj &&
    typeof (obj as Workspace).gitCommitMsgTemplate === 'string' &&
    'gitCommitName' in obj &&
    typeof (obj as Workspace).gitCommitName === 'string' &&
    'gitCommitEmail' in obj &&
    typeof (obj as Workspace).gitCommitEmail === 'string'
  );
}

export enum FileAction {
  Create = 'create',
  Update = 'update',
  Delete = 'delete',
  Rename = 'rename',
}

export enum FileExtension {
  Markdown = '.md',
  JPG = '.jpg',
  JPEG = '.jpeg',
  PNG = '.png',
  GIF = '.gif',
  WebP = '.webp',
  SVG = '.svg',
}

export const IMAGE_EXTENSIONS = [
  FileExtension.JPG,
  FileExtension.JPEG,
  FileExtension.PNG,
  FileExtension.GIF,
  FileExtension.WebP,
  FileExtension.SVG,
];

export interface DefaultFile {
  name: string;
  path: string;
  content: string;
}

export const DEFAULT_FILE: DefaultFile = {
  name: 'New File.md',
  path: 'New File.md',
  content: '# Welcome to NovaMD\n\nStart editing here!',
};

export interface FileNode {
  id: string;
  name: string;
  path: string;
  children?: FileNode[];
}

export function isFileNode(obj: unknown): obj is FileNode {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    typeof (obj as FileNode).id === 'string' &&
    'name' in obj &&
    typeof (obj as FileNode).name === 'string' &&
    'path' in obj &&
    typeof (obj as FileNode).path === 'string' &&
    (!('children' in obj) ||
      (obj as FileNode).children === undefined ||
      (obj as FileNode).children === null ||
      Array.isArray((obj as FileNode).children))
  );
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

// isWorkspaceStats checks if the given object is a valid WorkspaceStats object
export function isWorkspaceStats(obj: unknown): obj is WorkspaceStats {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'userID' in obj &&
    typeof (obj as WorkspaceStats).userID === 'number' &&
    'userEmail' in obj &&
    typeof (obj as WorkspaceStats).userEmail === 'string' &&
    'workspaceID' in obj &&
    typeof (obj as WorkspaceStats).workspaceID === 'number' &&
    'workspaceName' in obj &&
    typeof (obj as WorkspaceStats).workspaceName === 'string' &&
    'workspaceCreatedAt' in obj &&
    typeof (obj as WorkspaceStats).workspaceCreatedAt === 'string' &&
    (!('fileCountStats' in obj) ||
      (obj as WorkspaceStats).fileCountStats === undefined ||
      (obj as WorkspaceStats).fileCountStats === null ||
      isFileCountStats((obj as WorkspaceStats).fileCountStats))
  );
}

// Define FileCountStats based on the Go struct definition of storage.FileCountStats
export interface FileCountStats {
  totalFiles: number;
  totalSize: number;
}

// isFileCountStats checks if the given object is a valid FileCountStats object
export function isFileCountStats(obj: unknown): obj is FileCountStats {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'totalFiles' in obj &&
    typeof (obj as FileCountStats).totalFiles === 'number' &&
    'totalSize' in obj &&
    typeof (obj as FileCountStats).totalSize === 'number'
  );
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

export type CommitHash = string;

export enum InlineContainerType {
  Paragraph = 'paragraph',
  ListItem = 'listItem',
  TableCell = 'tableCell',
  Blockquote = 'blockquote',
  Heading = 'heading',
  Emphasis = 'emphasis',
  Strong = 'strong',
  Delete = 'delete',
}

export const MARKDOWN_REGEX = {
  WIKILINK: /(!?)\[\[(.*?)\]\]/g,
} as const;

export enum ModalType {
  NewFile = 'newFile',
  DeleteFile = 'deleteFile',
  CommitMessage = 'commitMessage',
}

export enum SettingsActionType {
  INIT_SETTINGS = 'INIT_SETTINGS',
  UPDATE_LOCAL_SETTINGS = 'UPDATE_LOCAL_SETTINGS',
  MARK_SAVED = 'MARK_SAVED',
}

export interface UserProfileSettings {
  displayName?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface ProfileSettingsState {
  localSettings: UserProfileSettings;
  initialSettings: UserProfileSettings;
  hasUnsavedChanges: boolean;
}

export interface SettingsAction<T> {
  type: SettingsActionType;
  payload?: T;
}

// WikiLinks

/**
 * Represents a wiki link match from the regex
 */
export interface WikiLinkMatch {
  fullMatch: string;
  isImage: boolean; // Changed from string to boolean
  fileName: string;
  displayText: string;
  heading?: string | undefined;
  index: number;
}

/**
 * Node replacement information for processing
 */
export interface ReplacementInfo {
  matches: WikiLinkMatch[];
  parent: Parent;
  index: number;
}

/**
 * Properties for link nodes
 */
export interface LinkNodeProps {
  style?: {
    color?: string;
    textDecoration?: string;
  };
}

/**
 * Link node with data properties
 */
export interface LinkNode extends Node {
  type: 'link';
  url: string;
  children: Node[];
  data?: {
    hProperties?: LinkNodeProps;
  };
}

/**
 * Image node
 */
export interface ImageNode extends Node {
  type: 'image';
  url: string;
  alt?: string;
  title?: string;
}

/**
 * Text node
 */
export interface TextNode extends Node {
  type: 'text';
  value: string;
}
