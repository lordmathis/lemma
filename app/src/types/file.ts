export enum FileAction {
  Create = 'create',
  Delete = 'delete',
  Rename = 'rename',
}

export enum FileExtension {
  Markdown = '.md',
  JPG = '.jpg',
  JPEG = '.jpeg',
  PNG = '.png',
  GIF = '.gif',
  WebP = '.webp',
  SVG = '.svg',
}

export const IMAGE_EXTENSIONS = [
  FileExtension.JPG,
  FileExtension.JPEG,
  FileExtension.PNG,
  FileExtension.GIF,
  FileExtension.WebP,
  FileExtension.SVG,
];

export interface DefaultFile {
  name: string;
  path: string;
  content: string;
}

export const DEFAULT_FILE: DefaultFile = {
  name: 'New File.md',
  path: 'New File.md',
  content: '# Welcome to NovaMD\n\nStart editing here!',
};
