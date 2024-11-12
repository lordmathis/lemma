import { visit } from 'unist-util-visit';
import { lookupFileByName, getFileUrl } from '../services/api';
import { INLINE_CONTAINER_TYPES, MARKDOWN_REGEX } from './constants';

function createNotFoundLink(fileName, displayText, baseUrl) {
  return {
    type: 'link',
    url: `${baseUrl}/notfound/${encodeURIComponent(fileName)}`,
    children: [{ type: 'text', value: displayText }],
    data: {
      hProperties: { style: { color: 'red', textDecoration: 'underline' } },
    },
  };
}

function createFileLink(filePath, displayText, heading, baseUrl) {
  const url = heading
    ? `${baseUrl}/internal/${encodeURIComponent(filePath)}#${encodeURIComponent(
        heading
      )}`
    : `${baseUrl}/internal/${encodeURIComponent(filePath)}`;

  return {
    type: 'link',
    url,
    children: [{ type: 'text', value: displayText }],
  };
}

function createImageNode(workspaceName, filePath, displayText) {
  return {
    type: 'image',
    url: getFileUrl(workspaceName, filePath),
    alt: displayText,
    title: displayText,
  };
}

function addMarkdownExtension(fileName) {
  if (fileName.includes('.')) {
    return fileName;
  }
  return `${fileName}.md`;
}

export function remarkWikiLinks(workspaceName) {
  return async function transformer(tree) {
    if (!workspaceName) {
      console.warn('No workspace ID provided to remarkWikiLinks plugin');
      return;
    }

    const baseUrl = window.API_BASE_URL;
    const replacements = new Map();

    // Find all wiki links
    visit(tree, 'text', function (node, index, parent) {
      const regex = MARKDOWN_REGEX.WIKILINK;
      let match;
      const matches = [];

      while ((match = regex.exec(node.value)) !== null) {
        const [fullMatch, isImage, innerContent] = match;
        let fileName, displayText, heading;

        const pipeIndex = innerContent.indexOf('|');
        const hashIndex = innerContent.indexOf('#');

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
      const newNodes = [];
      let lastIndex = 0;

      for (const match of matches) {
        // Add text before the match
        if (match.index > lastIndex) {
          newNodes.push({
            type: 'text',
            value: node.value.slice(lastIndex, match.index),
          });
        }

        try {
          const lookupFileName = match.isImage
            ? match.fileName
            : addMarkdownExtension(match.fileName);

          const paths = await lookupFileByName(workspaceName, lookupFileName);

          if (paths && paths.length > 0) {
            const filePath = paths[0];
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

      // If the parent is a container that can have inline content,
      // replace the text node directly with the new nodes
      if (parent && INLINE_CONTAINER_TYPES.has(parent.type)) {
        const nodeIndex = parent.children.indexOf(node);
        if (nodeIndex !== -1) {
          parent.children.splice(nodeIndex, 1, ...newNodes);
        }
      } else {
        // For other types of parents, wrap the nodes in a paragraph
        const paragraph = {
          type: 'paragraph',
          children: newNodes,
        };
        const nodeIndex = parent.children.indexOf(node);
        if (nodeIndex !== -1) {
          parent.children.splice(nodeIndex, 1, paragraph);
        }
      }
    }
  };
}
