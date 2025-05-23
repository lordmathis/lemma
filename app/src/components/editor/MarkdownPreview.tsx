import React, { useState, useEffect, useMemo, type ReactNode } from 'react';
import { unified, type Preset } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeMathjax from 'rehype-mathjax';
import rehypeReact, { type Options } from 'rehype-react';
import rehypePrism from 'rehype-prism';
import * as prod from 'react/jsx-runtime';
import { notifications } from '@mantine/notifications';
import { remarkWikiLinks } from '../../utils/remarkWikiLinks';
import { useWorkspace } from '../../contexts/WorkspaceContext';

interface MarkdownPreviewProps {
  content: string;
  handleFileSelect: (filePath: string | null) => Promise<void>;
}

interface MarkdownImageProps {
  src: string;
  alt?: string;
  [key: string]: unknown;
}

interface MarkdownLinkProps {
  href: string;
  children: ReactNode;
  [key: string]: unknown;
}

interface MarkdownCodeProps {
  children: ReactNode;
  className?: string;
  [key: string]: unknown;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  handleFileSelect,
}) => {
  const [processedContent, setProcessedContent] = useState<ReactNode | null>(
    null
  );
  const baseUrl = window.API_BASE_URL;
  const { currentWorkspace } = useWorkspace();

  const processor = useMemo(() => {
    const handleLinkClick = (
      e: React.MouseEvent<HTMLAnchorElement>,
      href: string
    ): void => {
      e.preventDefault();

      if (href.startsWith(`${baseUrl}/internal/`)) {
        // For existing files, extract the path and directly select it
        const [filePath] = decodeURIComponent(
          href.replace(`${baseUrl}/internal/`, '')
        ).split('#');
        if (filePath) {
          void handleFileSelect(filePath);
        }
      } else if (href.startsWith(`${baseUrl}/notfound/`)) {
        // For non-existent files, show a notification
        const fileName = decodeURIComponent(
          href.replace(`${baseUrl}/notfound/`, '')
        );
        notifications.show({
          title: 'File Not Found',
          message: `The file "${fileName}" does not exist.`,
          color: 'red',
        });
      }
    };
    // Only create the processor if we have a workspace name
    if (!currentWorkspace?.name) {
      return unified();
    }

    return unified()
      .use(remarkParse)
      .use(remarkWikiLinks, currentWorkspace.name)
      .use(remarkMath)
      .use(remarkRehype)
      .use(rehypeMathjax)
      .use(rehypePrism as Preset)
      .use(rehypeReact, {
        jsx: prod.jsx,
        jsxs: prod.jsxs,
        Fragment: prod.Fragment,
        development: false,
        elementAttributeNameCase: 'react',
        stylePropertyNameCase: 'dom',
        components: {
          img: ({ src, alt, ...props }: MarkdownImageProps) => (
            <img
              src={src}
              alt={alt || ''}
              onError={(event) => {
                console.error('Failed to load image:', event.currentTarget.src);
                event.currentTarget.alt = 'Failed to load image';
              }}
              {...props}
            />
          ),
          a: ({ href, children, ...props }: MarkdownLinkProps) => (
            <a href={href} onClick={(e) => handleLinkClick(e, href)} {...props}>
              {children}
            </a>
          ),
          code: ({ children, className, ...props }: MarkdownCodeProps) => {
            return (
              <pre className={className}>
                <code {...props}>{children}</code>
              </pre>
            );
          },
        },
      } as Options);
  }, [currentWorkspace?.name, baseUrl, handleFileSelect]);

  useEffect(() => {
    const processContent = async (): Promise<void> => {
      if (!currentWorkspace) {
        return;
      }

      try {
        const result = await processor.process(content);
        setProcessedContent(result.result as ReactNode);
      } catch (error) {
        console.error('Error processing markdown:', error);
      }
    };

    void processContent();
  }, [content, processor, currentWorkspace]);

  return <div className="markdown-preview">{processedContent}</div>;
};

export default MarkdownPreview;
