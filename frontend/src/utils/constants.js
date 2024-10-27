export const API_BASE_URL = window.API_BASE_URL;

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
};

export const FILE_ACTIONS = {
  CREATE: 'create',
  DELETE: 'delete',
  RENAME: 'rename',
};

export const MODAL_TYPES = {
  NEW_FILE: 'newFile',
  DELETE_FILE: 'deleteFile',
  COMMIT_MESSAGE: 'commitMessage',
};

export const IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
];

// Renamed from DEFAULT_SETTINGS to be more specific
export const DEFAULT_WORKSPACE_SETTINGS = {
  theme: THEMES.LIGHT,
  autoSave: false,
  gitEnabled: false,
  gitUrl: '',
  gitUser: '',
  gitToken: '',
  gitAutoCommit: false,
  gitCommitMsgTemplate: '${action} ${filename}',
};

// Template for creating new workspaces
export const DEFAULT_WORKSPACE = {
  name: '',
  ...DEFAULT_WORKSPACE_SETTINGS,
};

export const DEFAULT_FILE = {
  name: 'New File.md',
  path: 'New File.md',
  content: '# Welcome to NovaMD\n\nStart editing here!',
};

export const MARKDOWN_REGEX = {
  WIKILINK: /(!?)\[\[(.*?)\]\]/g,
};
