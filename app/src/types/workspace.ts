import { Theme } from './theme';

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
  name: string;
  createdAt: number;
}

export const DEFAULT_WORKSPACE: Workspace = {
  name: '',
  createdAt: Date.now(),
  ...DEFAULT_WORKSPACE_SETTINGS,
};

export function isWorkspace(obj: unknown): obj is Workspace {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    typeof (obj as Workspace).name === 'string' &&
    'theme' in obj &&
    typeof (obj as Workspace).theme === 'string' &&
    'autoSave' in obj &&
    typeof (obj as Workspace).autoSave === 'boolean' &&
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
    typeof (obj as Workspace).gitCommitMsgTemplate === 'string'
  );
}
