import { IMAGE_EXTENSIONS } from './constants';

export const isImageFile = (filePath) => {
  return IMAGE_EXTENSIONS.some((ext) => filePath.toLowerCase().endsWith(ext));
};
