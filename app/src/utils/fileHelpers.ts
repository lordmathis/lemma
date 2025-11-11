import { API_BASE_URL } from '@/types/api';
import { IMAGE_EXTENSIONS, type FileNode } from '@/types/models';

/**
 * Represents a flattened file for searching and autocompletion
 */
export interface FlatFile {
  name: string; // "meeting-notes.md"
  path: string; // "work/2024/meeting-notes.md"
  displayPath: string; // "work/2024/meeting-notes"
  nameWithoutExt: string; // "meeting-notes"
  parentFolder: string; // "work/2024"
  isImage: boolean;
}

/**
 * Checks if the given file path has an image extension.
 * @param filePath - The file path to check.
 * @returns True if the file path has an image extension, false otherwise.
 */
export const isImageFile = (filePath: string): boolean => {
  return IMAGE_EXTENSIONS.some((ext) => filePath.toLowerCase().endsWith(ext));
};

export const getFileUrl = (workspaceName: string, filePath: string) => {
  return `${API_BASE_URL}/workspaces/${encodeURIComponent(
    workspaceName
  )}/files/content?file_path=${encodeURIComponent(filePath)}`;
};

/**
 * Recursively flattens FileNode tree into searchable array
 * Precomputes display strings and metadata for performance
 *
 * @param nodes - Array of FileNode from the file tree
 * @param showHiddenFiles - Whether to include hidden files (files/folders starting with .)
 * @returns Array of FlatFile objects ready for searching
 */
export function flattenFileTree(nodes: FileNode[], showHiddenFiles = false): FlatFile[] {
  const result: FlatFile[] = [];

  function traverse(node: FileNode) {
    // Skip hidden files and folders if showHiddenFiles is false
    // Hidden files/folders are those that start with a dot (.)
    if (!showHiddenFiles && node.name.startsWith('.')) {
      return;
    }

    // Only process files, not folders (folders have children)
    if (!node.children) {
      const name = node.name;
      const path = node.path;
      const isImage = isImageFile(path);

      // Remove extension for display (except for images)
      let nameWithoutExt = name;
      let displayPath = path;

      if (name.endsWith('.md')) {
        nameWithoutExt = name.slice(0, -3);
        displayPath = path.slice(0, -3);
      }

      // Get parent folder path
      const lastSlashIndex = path.lastIndexOf('/');
      const parentFolder = lastSlashIndex > 0 ? path.slice(0, lastSlashIndex) : '';

      result.push({
        name,
        path,
        displayPath,
        nameWithoutExt,
        parentFolder,
        isImage,
      });
    }

    // Recursively process children
    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  for (const node of nodes) {
    traverse(node);
  }

  return result;
}
