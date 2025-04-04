import { IMAGE_EXTENSIONS } from '../types/file';

/**
 * Checks if the given file path has an image extension.
 * @param filePath - The file path to check.
 * @returns True if the file path has an image extension, false otherwise.
 */
export const isImageFile = (filePath: string): boolean => {
  return IMAGE_EXTENSIONS.some((ext) => filePath.toLowerCase().endsWith(ext));
};
