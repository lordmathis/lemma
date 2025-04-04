import { visit } from 'unist-util-visit';
import { lookupFileByName, getFileUrl } from '../services/api';
import { MARKDOWN_REGEX } from '../types/markdown';
import { Node } from 'unist';
import { Parent } from 'unist';
import { Text } from 'mdast';

/**
 * Represents a wiki link match from the regex
 */
interface WikiLinkMatch {
  fullMatch: string;
  isImage: string;
  fileName: string;
  displayText: string;
  heading?: string;
  index: number;
}

/**
 * Node replacement information for processing
 */
interface ReplacementInfo {
  matches: WikiLinkMatch[];
  parent: Parent;
  index: number;
}

/**
 * Properties for link nodes
 */
interface LinkNodeProps {
  style?: {
    color?: string;
    textDecoration?: string;
  };
}

/**
 * Link node with data properties
 */
interface LinkNode extends Node {
  type: 'link';
  url: string;
  children: Node[];
  data?: {
    hProperties?: LinkNodeProps;
  };
}

/**
 * Image node
 */
interface ImageNode extends Node {
  type: 'image';
  url: string;
  alt?: string;
  title?: string;
}

/**
 * Text node
 */
interface TextNode extends Node {
  type: 'text';
  value: string;
}

/**
 * Creates a text node with the given value
 */
function createTextNode(value: string): TextNode {
  return {
    type: 'text',
    value,
  };
}

/**
 * Creates a link node for files that don't exist
 */
function createNotFoundLink(
  fileName: string,
  displayText: string,
  baseUrl: string
): LinkNode {
  return {
    type: 'link',
    url: `${baseUrl}/notfound/${encodeURIComponent(fileName)}`,
    children: [createTextNode(displayText)],
    data: {
      hProperties: { style: { color: 'red', textDecoration: 'underline' } },
    },
  };
}

/**
 * Creates a link node for existing files
 */
function createFileLink(
  filePath: string,
  displayText: string,
  heading: string | undefined,
  baseUrl: string
): LinkNode {
  const url = heading
    ? `${baseUrl}/internal/${encodeURIComponent(filePath)}#${encodeURIComponent(
        heading
      )}`
    : `${baseUrl}/internal/${encodeURIComponent(filePath)}`;

  return {
    type: 'link',
    url,
    children: [createTextNode(displayText)],
  };
}

/**
 * Creates an image node
 */
function createImageNode(
  workspaceName: string,
  filePath: string,
  displayText: string
): ImageNode {
  return {
    type: 'image',
    url: getFileUrl(workspaceName, filePath),
    alt: displayText,
    title: displayText,
  };
}

/**
 * Adds markdown extension to a filename if it doesn't have one
 */
function addMarkdownExtension(fileName: string): string {
  if (fileName.includes('.')) {
    return fileName;
  }
  return `${fileName}.md`;
}

/**
 * Determines if a node type can contain inline content
 */
function canContainInline(type: string): boolean {
  return [
    'paragraph',
    'listItem',
    'tableCell',
    'blockquote',
    'heading',
    'emphasis',
    'strong',
    'delete',
  ].includes(type);
}

/**
 * Plugin for processing wiki-style links in markdown
 */
export function remarkWikiLinks(workspaceName: string) {
  return async function transformer(tree: Node): Promise<void> {
    if (!workspaceName) {
      console.warn('No workspace ID provided to remarkWikiLinks plugin');
      return;
    }

    const baseUrl: string = window.API_BASE_URL;
    const replacements = new Map<Text, ReplacementInfo>();

    // Find all wiki links
    visit(tree, 'text', function (node: Text, index: number, parent: Parent) {
      const regex = MARKDOWN_REGEX.WIKILINK;
      let match: RegExpExecArray | null;
      const matches: WikiLinkMatch[] = [];

      while ((match = regex.exec(node.value)) !== null) {
        const [fullMatch, isImage, innerContent] = match;
        let fileName: string;
        let displayText: string;
        let heading: string | undefined;

        const pipeIndex: number = innerContent.indexOf('|');
        const hashIndex: number = innerContent.indexOf('#');

        if (pipeIndex !== -1) {
          displayText = innerContent.slice(pipeIndex + 1).trim();
          fileName = innerContent.slice(0, pipeIndex).trim();
        } else {
          displayText = innerContent;
          fileName = innerContent;
        }

        if (hashIndex !== -1 && (pipeIndex === -1 || hashIndex < pipeIndex)) {
          heading = fileName.slice(hashIndex + 1).trim();
          fileName = fileName.slice(0, hashIndex).trim();
        }

        matches.push({
          fullMatch,
          isImage,
          fileName,
          displayText,
          heading,
          index: match.index,
        });
      }

      if (matches.length > 0) {
        replacements.set(node, { matches, parent, index });
      }
    });

    // Process all matches
    for (const [node, { matches, parent }] of replacements) {
      const newNodes: (LinkNode | ImageNode | TextNode)[] = [];
      let lastIndex: number = 0;

      for (const match of matches) {
        // Add text before the match
        if (match.index > lastIndex) {
          newNodes.push({
            type: 'text',
            value: node.value.slice(lastIndex, match.index),
          });
        }

        try {
          const lookupFileName: string = match.isImage
            ? match.fileName
            : addMarkdownExtension(match.fileName);

          const paths: string[] = await lookupFileByName(
            workspaceName,
            lookupFileName
          );

          if (paths && paths.length > 0) {
            const filePath: string = paths[0];
            if (match.isImage) {
              newNodes.push(
                createImageNode(workspaceName, filePath, match.displayText)
              );
            } else {
              newNodes.push(
                createFileLink(
                  filePath,
                  match.displayText,
                  match.heading,
                  baseUrl
                )
              );
            }
          } else {
            newNodes.push(
              createNotFoundLink(match.fileName, match.displayText, baseUrl)
            );
          }
        } catch (error) {
          console.debug('File lookup failed:', match.fileName, error);
          newNodes.push(
            createNotFoundLink(match.fileName, match.displayText, baseUrl)
          );
        }

        lastIndex = match.index + match.fullMatch.length;
      }

      // Add any remaining text
      if (lastIndex < node.value.length) {
        newNodes.push({
          type: 'text',
          value: node.value.slice(lastIndex),
        });
      }

      // Replace nodes in parent
      if (parent && canContainInline(parent.type)) {
        const nodeIndex: number = parent.children.indexOf(node);
        if (nodeIndex !== -1) {
          parent.children.splice(nodeIndex, 1, ...newNodes);
        }
      } else {
        // Wrap in paragraph for other types
        const paragraph: Parent = {
          type: 'paragraph',
          children: newNodes,
        };
        const nodeIndex: number = parent.children.indexOf(node);
        if (nodeIndex !== -1) {
          parent.children.splice(nodeIndex, 1, paragraph);
        }
      }
    }
  };
}
