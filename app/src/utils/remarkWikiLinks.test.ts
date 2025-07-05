import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { remarkWikiLinks } from './remarkWikiLinks';
import * as fileApi from '@/api/file';

// Mock the file API
vi.mock('@/api/file');

// Mock window.API_BASE_URL
const mockApiBaseUrl = 'http://localhost:8080/api/v1';

describe('remarkWikiLinks', () => {
  beforeEach(() => {
    window.API_BASE_URL = mockApiBaseUrl;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createProcessor = (workspaceName: string) => {
    return unified()
      .use(remarkParse)
      .use(remarkWikiLinks, workspaceName)
      .use(remarkStringify);
  };

  describe('basic wiki link processing', () => {
    it('converts existing file links correctly', async () => {
      const mockLookupFileByName = vi.mocked(fileApi.lookupFileByName);
      mockLookupFileByName.mockResolvedValue(['docs/test.md']);

      const processor = createProcessor('test-workspace');
      const markdown = 'Check out [[test]] for more info.';

      const result = await processor.process(markdown);

      expect(mockLookupFileByName).toHaveBeenCalledWith(
        'test-workspace',
        'test.md'
      );
      expect(result.toString()).toContain('test');
    });

    it('handles non-existent files with not found links', async () => {
      const mockLookupFileByName = vi.mocked(fileApi.lookupFileByName);
      mockLookupFileByName.mockResolvedValue([]);

      const processor = createProcessor('test-workspace');
      const markdown = 'This [[nonexistent]] file does not exist.';

      const result = await processor.process(markdown);

      expect(mockLookupFileByName).toHaveBeenCalledWith(
        'test-workspace',
        'nonexistent.md'
      );
      expect(result.toString()).toContain('nonexistent');
    });

    it('handles API errors gracefully', async () => {
      const mockLookupFileByName = vi.mocked(fileApi.lookupFileByName);
      mockLookupFileByName.mockRejectedValue(new Error('API Error'));

      const processor = createProcessor('test-workspace');
      const markdown = 'This [[error-file]] causes an error.';

      // Should not throw
      const result = await processor.process(markdown);

      expect(mockLookupFileByName).toHaveBeenCalledWith(
        'test-workspace',
        'error-file.md'
      );
      expect(result.toString()).toContain('error-file');
    });
  });

  describe('wiki link syntax variations', () => {
    it('handles basic wiki links', async () => {
      const mockLookupFileByName = vi.mocked(fileApi.lookupFileByName);
      mockLookupFileByName.mockResolvedValue(['basic.md']);

      const processor = createProcessor('workspace');
      const markdown = '[[basic]]';

      await processor.process(markdown);

      expect(mockLookupFileByName).toHaveBeenCalledWith(
        'workspace',
        'basic.md'
      );
    });

    it('handles wiki links with display text', async () => {
      const mockLookupFileByName = vi.mocked(fileApi.lookupFileByName);
      mockLookupFileByName.mockResolvedValue(['file.md']);

      const processor = createProcessor('workspace');
      const markdown = '[[file|Display Text]]';

      await processor.process(markdown);

      expect(mockLookupFileByName).toHaveBeenCalledWith('workspace', 'file.md');
    });

    it('handles wiki links with headings', async () => {
      const mockLookupFileByName = vi.mocked(fileApi.lookupFileByName);
      mockLookupFileByName.mockResolvedValue(['file.md']);

      const processor = createProcessor('workspace');
      const markdown = '[[file#section]]';

      await processor.process(markdown);

      expect(mockLookupFileByName).toHaveBeenCalledWith('workspace', 'file.md');
    });

    it('handles wiki links with both headings and display text', async () => {
      const mockLookupFileByName = vi.mocked(fileApi.lookupFileByName);
      mockLookupFileByName.mockResolvedValue(['file.md']);

      const processor = createProcessor('workspace');
      const markdown = '[[file#section|Custom Display]]';

      await processor.process(markdown);

      expect(mockLookupFileByName).toHaveBeenCalledWith('workspace', 'file.md');
    });

    it('handles image wiki links', async () => {
      const mockLookupFileByName = vi.mocked(fileApi.lookupFileByName);
      mockLookupFileByName.mockResolvedValue(['image.png']);

      const processor = createProcessor('workspace');
      const markdown = '![[image.png]]';

      await processor.process(markdown);

      expect(mockLookupFileByName).toHaveBeenCalledWith(
        'workspace',
        'image.png'
      );
    });

    it('handles image wiki links with alt text', async () => {
      const mockLookupFileByName = vi.mocked(fileApi.lookupFileByName);
      mockLookupFileByName.mockResolvedValue(['photo.jpg']);

      const processor = createProcessor('workspace');
      const markdown = '![[photo.jpg|Alt text for photo]]';

      await processor.process(markdown);

      expect(mockLookupFileByName).toHaveBeenCalledWith(
        'workspace',
        'photo.jpg'
      );
    });
  });

  describe('file extension handling', () => {
    it('adds .md extension to files without extensions', async () => {
      const mockLookupFileByName = vi.mocked(fileApi.lookupFileByName);
      mockLookupFileByName.mockResolvedValue(['notes.md']);

      const processor = createProcessor('workspace');
      const markdown = '[[notes]]';

      await processor.process(markdown);

      expect(mockLookupFileByName).toHaveBeenCalledWith(
        'workspace',
        'notes.md'
      );
    });

    it('preserves existing file extensions', async () => {
      const mockLookupFileByName = vi.mocked(fileApi.lookupFileByName);
      mockLookupFileByName.mockResolvedValue(['document.txt']);

      const processor = createProcessor('workspace');
      const markdown = '[[document.txt]]';

      await processor.process(markdown);

      expect(mockLookupFileByName).toHaveBeenCalledWith(
        'workspace',
        'document.txt'
      );
    });

    it('handles image files without adding .md extension', async () => {
      const mockLookupFileByName = vi.mocked(fileApi.lookupFileByName);
      mockLookupFileByName.mockResolvedValue(['screenshot.png']);

      const processor = createProcessor('workspace');
      const markdown = '![[screenshot.png]]';

      await processor.process(markdown);

      expect(mockLookupFileByName).toHaveBeenCalledWith(
        'workspace',
        'screenshot.png'
      );
    });
  });

  describe('multiple wiki links', () => {
    it('processes multiple wiki links in the same text', async () => {
      const mockLookupFileByName = vi.mocked(fileApi.lookupFileByName);
      mockLookupFileByName
        .mockResolvedValueOnce(['first.md'])
        .mockResolvedValueOnce(['second.md']);

      const processor = createProcessor('workspace');
      const markdown = 'See [[first]] and [[second]] for details.';

      await processor.process(markdown);

      expect(mockLookupFileByName).toHaveBeenCalledTimes(2);
      expect(mockLookupFileByName).toHaveBeenNthCalledWith(
        1,
        'workspace',
        'first.md'
      );
      expect(mockLookupFileByName).toHaveBeenNthCalledWith(
        2,
        'workspace',
        'second.md'
      );
    });

    it('handles mix of existing and non-existing files', async () => {
      const mockLookupFileByName = vi.mocked(fileApi.lookupFileByName);
      mockLookupFileByName
        .mockResolvedValueOnce(['exists.md'])
        .mockResolvedValueOnce([]);

      const processor = createProcessor('workspace');
      const markdown = 'Check [[exists]] but not [[missing]].';

      await processor.process(markdown);

      expect(mockLookupFileByName).toHaveBeenCalledTimes(2);
      expect(mockLookupFileByName).toHaveBeenNthCalledWith(
        1,
        'workspace',
        'exists.md'
      );
      expect(mockLookupFileByName).toHaveBeenNthCalledWith(
        2,
        'workspace',
        'missing.md'
      );
    });
  });

  describe('edge cases', () => {
    it('handles text without wiki links', async () => {
      const processor = createProcessor('workspace');
      const markdown = 'Just regular text with no wiki links.';

      const result = await processor.process(markdown);

      expect(result.toString()).toBe('Just regular text with no wiki links.\n');
      expect(fileApi.lookupFileByName).not.toHaveBeenCalled();
    });

    it('handles wiki links with only spaces', async () => {
      const processor = createProcessor('workspace');
      const markdown = 'Spaces [[   ]] link.';

      const result = await processor.process(markdown);

      expect(result.toString()).toContain('Spaces');
      // Should not call API for empty/whitespace-only links
      expect(fileApi.lookupFileByName).not.toHaveBeenCalled();
    });

    it('handles nested brackets', async () => {
      const mockLookupFileByName = vi.mocked(fileApi.lookupFileByName);
      mockLookupFileByName.mockResolvedValue(['test.md']);

      const processor = createProcessor('workspace');
      const markdown = '[[test]] and some [regular](link) text.';

      await processor.process(markdown);

      expect(mockLookupFileByName).toHaveBeenCalledWith('workspace', 'test.md');
    });

    it('handles special characters in file names', async () => {
      const mockLookupFileByName = vi.mocked(fileApi.lookupFileByName);
      mockLookupFileByName.mockResolvedValue(['file with spaces & symbols.md']);

      const processor = createProcessor('workspace');
      const markdown = '[[file with spaces & symbols]]';

      await processor.process(markdown);

      expect(mockLookupFileByName).toHaveBeenCalledWith(
        'workspace',
        'file with spaces & symbols.md'
      );
    });
  });

  describe('workspace handling', () => {
    it('handles empty workspace name gracefully', async () => {
      const processor = createProcessor('');
      const markdown = '[[test]]';

      const result = await processor.process(markdown);

      expect(result.toString()).toContain('test');
      // Should not call API when workspace is empty
      expect(fileApi.lookupFileByName).not.toHaveBeenCalled();
    });
  });
});
