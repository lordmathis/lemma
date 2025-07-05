import { describe, it, expect, beforeEach } from 'vitest';
import { isImageFile, getFileUrl } from './fileHelpers';

describe('fileHelpers', () => {
  beforeEach(() => {
    // Ensure API_BASE_URL is set for tests
    window.API_BASE_URL = 'http://localhost:8080/api/v1';
  });

  describe('isImageFile', () => {
    it('returns true for supported image file extensions', () => {
      expect(isImageFile('image.jpg')).toBe(true);
      expect(isImageFile('image.jpeg')).toBe(true);
      expect(isImageFile('image.png')).toBe(true);
      expect(isImageFile('image.gif')).toBe(true);
      expect(isImageFile('image.webp')).toBe(true);
      expect(isImageFile('image.svg')).toBe(true);
    });

    it('returns true for uppercase image file extensions', () => {
      expect(isImageFile('image.JPG')).toBe(true);
      expect(isImageFile('image.JPEG')).toBe(true);
      expect(isImageFile('image.PNG')).toBe(true);
      expect(isImageFile('image.GIF')).toBe(true);
      expect(isImageFile('image.WEBP')).toBe(true);
      expect(isImageFile('image.SVG')).toBe(true);
    });

    it('returns true for mixed case image file extensions', () => {
      expect(isImageFile('image.JpG')).toBe(true);
      expect(isImageFile('image.JpEg')).toBe(true);
      expect(isImageFile('image.PnG')).toBe(true);
      expect(isImageFile('screenshot.WeBp')).toBe(true);
    });

    it('returns false for non-image file extensions', () => {
      expect(isImageFile('document.md')).toBe(false);
      expect(isImageFile('document.txt')).toBe(false);
      expect(isImageFile('document.pdf')).toBe(false);
      expect(isImageFile('document.docx')).toBe(false);
      expect(isImageFile('script.js')).toBe(false);
      expect(isImageFile('style.css')).toBe(false);
      expect(isImageFile('data.json')).toBe(false);
      expect(isImageFile('archive.zip')).toBe(false);
    });

    it('returns false for files without extensions', () => {
      expect(isImageFile('README')).toBe(false);
      expect(isImageFile('Dockerfile')).toBe(false);
      expect(isImageFile('LICENSE')).toBe(false);
      expect(isImageFile('Makefile')).toBe(false);
    });

    it('handles complex file paths correctly', () => {
      expect(isImageFile('path/to/image.jpg')).toBe(true);
      expect(isImageFile('./relative/path/image.png')).toBe(true);
      expect(isImageFile('/absolute/path/image.gif')).toBe(true);
      expect(isImageFile('../../parent/image.svg')).toBe(true);
      expect(isImageFile('path/to/document.md')).toBe(false);
      expect(isImageFile('./config/settings.json')).toBe(false);
    });

    it('handles files with multiple dots in filename', () => {
      expect(isImageFile('my.image.file.jpg')).toBe(true);
      expect(isImageFile('config.backup.json')).toBe(false);
      expect(isImageFile('version.1.2.png')).toBe(true);
      expect(isImageFile('app.config.local.js')).toBe(false);
      expect(isImageFile('test.component.spec.ts')).toBe(false);
    });

    it('handles edge cases', () => {
      expect(isImageFile('')).toBe(false);
      expect(isImageFile('.')).toBe(false);
      expect(isImageFile('.jpg')).toBe(true);
      expect(isImageFile('.hidden.png')).toBe(true);
      expect(isImageFile('file.')).toBe(false);
    });
  });

  describe('getFileUrl', () => {
    it('constructs correct file URL with simple parameters', () => {
      const workspaceName = 'my-workspace';
      const filePath = 'folder/file.md';

      const expectedUrl =
        'http://localhost:8080/api/v1/workspaces/my-workspace/files/folder%2Ffile.md';
      const actualUrl = getFileUrl(workspaceName, filePath);

      expect(actualUrl).toBe(expectedUrl);
    });

    it('properly encodes workspace name with special characters', () => {
      const workspaceName = 'my workspace with spaces';
      const filePath = 'file.md';

      const expectedUrl =
        'http://localhost:8080/api/v1/workspaces/my%20workspace%20with%20spaces/files/file.md';
      const actualUrl = getFileUrl(workspaceName, filePath);

      expect(actualUrl).toBe(expectedUrl);
    });

    it('properly encodes file path with special characters', () => {
      const workspaceName = 'workspace';
      const filePath = 'folder with spaces/file with spaces.md';

      const expectedUrl =
        'http://localhost:8080/api/v1/workspaces/workspace/files/folder%20with%20spaces%2Ffile%20with%20spaces.md';
      const actualUrl = getFileUrl(workspaceName, filePath);

      expect(actualUrl).toBe(expectedUrl);
    });

    it('handles special URL characters that need encoding', () => {
      const workspaceName = 'test&workspace';
      const filePath = 'file?name=test.md';

      const expectedUrl =
        'http://localhost:8080/api/v1/workspaces/test%26workspace/files/file%3Fname%3Dtest.md';
      const actualUrl = getFileUrl(workspaceName, filePath);

      expect(actualUrl).toBe(expectedUrl);
    });

    it('handles Unicode characters', () => {
      const workspaceName = 'プロジェクト';
      const filePath = 'ファイル.md';

      const expectedUrl =
        'http://localhost:8080/api/v1/workspaces/%E3%83%97%E3%83%AD%E3%82%B8%E3%82%A7%E3%82%AF%E3%83%88/files/%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB.md';
      const actualUrl = getFileUrl(workspaceName, filePath);

      expect(actualUrl).toBe(expectedUrl);
    });

    it('handles nested folder structures', () => {
      const workspaceName = 'docs';
      const filePath = 'projects/2024/q1/report.md';

      const expectedUrl =
        'http://localhost:8080/api/v1/workspaces/docs/files/projects%2F2024%2Fq1%2Freport.md';
      const actualUrl = getFileUrl(workspaceName, filePath);

      expect(actualUrl).toBe(expectedUrl);
    });

    it('handles edge cases with empty strings', () => {
      expect(getFileUrl('', '')).toBe(
        'http://localhost:8080/api/v1/workspaces//files/'
      );
      expect(getFileUrl('workspace', '')).toBe(
        'http://localhost:8080/api/v1/workspaces/workspace/files/'
      );
      expect(getFileUrl('', 'file.md')).toBe(
        'http://localhost:8080/api/v1/workspaces//files/file.md'
      );
    });

    it('uses the API base URL correctly', () => {
      const url = getFileUrl('test', 'file.md');
      expect(url).toBe(
        'http://localhost:8080/api/v1/workspaces/test/files/file.md'
      );
      expect(url).toContain(window.API_BASE_URL);
    });
  });
});
