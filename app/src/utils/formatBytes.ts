/**
 * Units for file size display.
 */
type ByteUnit = 'B' | 'KB' | 'MB' | 'GB';

/**
 * An array of size units in ascending order.
 */
const UNITS: readonly ByteUnit[] = ['B', 'KB', 'MB', 'GB'] as const;

/**
 * Formats a number of bytes into a human-readable string.
 * @param bytes - The number of bytes to format.
 * @returns A string representing the formatted file size.
 */
export const formatBytes = (bytes: number): string => {
  let size: number = bytes;
  let unitIndex: number = 0;
  if (size < 0) {
    throw new Error('Byte size cannot be negative');
  }
  while (size >= 1024 && unitIndex < UNITS.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${UNITS[unitIndex]}`;
};
