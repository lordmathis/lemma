import { Theme } from './theme';

export interface WorkspaceSettings {
  theme: Theme;
  autoSave: boolean;
  gitEnabled: boolean;
  gitUrl: string;
  gitUser: string;
  gitToken: string;
  gitAutoCommit: boolean;
  gitCommitMsgTemplate: string;
}

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  theme: Theme.Light,
  autoSave: false,
  gitEnabled: false,
  gitUrl: '',
  gitUser: '',
  gitToken: '',
  gitAutoCommit: false,
  gitCommitMsgTemplate: '${action} ${filename}',
};

export interface Workspace extends WorkspaceSettings {
  name: string;
}

export const DEFAULT_WORKSPACE: Workspace = {
  name: '',
  ...DEFAULT_WORKSPACE_SETTINGS,
};
