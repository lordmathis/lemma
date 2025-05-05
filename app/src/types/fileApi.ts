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

export interface LastOpenedFileResponse {
  lastOpenedFilePath: string;
}

export function isLastOpenedFileResponse(
  obj: unknown
): obj is LastOpenedFileResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'lastOpenedFilePath' in obj &&
    typeof (obj as LastOpenedFileResponse).lastOpenedFilePath === 'string'
  );
}

export interface UpdateLastOpenedFileRequest {
  filePath: string;
}

export interface FileNode {
  id: string;
  name: string;
  path: string;
  children: FileNode[];
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
    'children' in obj &&
    Array.isArray((obj as FileNode).children)
  );
}
