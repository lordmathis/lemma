import type { FileNode } from '@/types/models';

/**
 * Recursively filter tree to only include folders
 * @param nodes - Array of FileNode objects
 * @returns New tree structure with only folder nodes
 */
export const filterToFolders = (nodes: FileNode[]): FileNode[] => {
  return nodes
    .filter((node) => node.children !== undefined)
    .map((node) => {
      const filtered: FileNode = {
        id: node.id,
        name: node.name,
        path: node.path,
      };
      if (node.children) {
        filtered.children = filterToFolders(node.children);
      }
      return filtered;
    });
};

/**
 * Find a specific folder node by its path
 * @param nodes - Array of FileNode objects
 * @param path - Path to search for
 * @returns The found FileNode or null
 */
export const findFolderByPath = (
  nodes: FileNode[],
  path: string
): FileNode | null => {
  for (const node of nodes) {
    if (node.path === path && node.children !== undefined) {
      return node;
    }
    if (node.children) {
      const found = findFolderByPath(node.children, path);
      if (found) return found;
    }
  }
  return null;
};
