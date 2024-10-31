import React, { useState, useEffect, useMemo } from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeReact from 'rehype-react';
import rehypePrism from 'rehype-prism';
import * as prod from 'react/jsx-runtime';
import { notifications } from '@mantine/notifications';
import 'katex/dist/katex.min.css';
import { remarkWikiLinks } from '../utils/remarkWikiLinks';
import { useWorkspace } from '../contexts/WorkspaceContext';

const MarkdownPreview = ({ content, handleFileSelect }) => {
  const [processedContent, setProcessedContent] = useState(null);
  const baseUrl = window.API_BASE_URL;
  const { currentWorkspace } = useWorkspace();

  const handleLinkClick = (e, href) => {
    e.preventDefault();

    if (href.startsWith(`${baseUrl}/internal/`)) {
      // For existing files, extract the path and directly select it
      const [filePath, heading] = decodeURIComponent(
        href.replace(`${baseUrl}/internal/`, '')
      ).split('#');
      handleFileSelect(filePath);

      // TODO: Handle heading navigation if needed
      if (heading) {
        console.debug('Heading navigation not implemented:', heading);
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

  const processor = useMemo(
    () =>
      unified()
        .use(remarkParse)
        .use(remarkWikiLinks, currentWorkspace?.id)
        .use(remarkMath)
        .use(remarkRehype)
        .use(rehypeKatex)
        .use(rehypePrism)
        .use(rehypeReact, {
          production: true,
          jsx: prod.jsx,
          jsxs: prod.jsxs,
          Fragment: prod.Fragment,
          components: {
            img: ({ src, alt, ...props }) => (
              <img
                src={src}
                alt={alt}
                onError={(event) => {
                  console.error('Failed to load image:', event.target.src);
                  event.target.alt = 'Failed to load image';
                }}
                {...props}
              />
            ),
            a: ({ href, children, ...props }) => (
              <a
                href={href}
                onClick={(e) => handleLinkClick(e, href)}
                {...props}
              >
                {children}
              </a>
            ),
            code: ({ children, className, ...props }) => {
              const language = className
                ? className.replace('language-', '')
                : null;
              return (
                <pre className={className}>
                  <code {...props}>{children}</code>
                </pre>
              );
            },
          },
        }),
    [baseUrl, handleFileSelect, currentWorkspace?.id]
  );

  useEffect(() => {
    const processContent = async () => {
      if (!currentWorkspace) {
        return;
      }

      try {
        const result = await processor.process(content);
        setProcessedContent(result.result);
      } catch (error) {
        console.error('Error processing markdown:', error);
      }
    };

    processContent();
  }, [content, processor, currentWorkspace]);

  return <div className="markdown-preview">{processedContent}</div>;
};

export default MarkdownPreview;
