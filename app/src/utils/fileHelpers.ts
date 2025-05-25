import { API_BASE_URL } from '@/types/api';
import { IMAGE_EXTENSIONS } from '@/types/models';

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
  )}/files/${encodeURIComponent(filePath)}`;
};
