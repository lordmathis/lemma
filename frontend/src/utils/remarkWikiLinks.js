import { visit } from 'unist-util-visit';
import { lookupFileByName, getFileUrl } from '../services/api';

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

function createImageNode(workspaceId, filePath, displayText) {
  return {
    type: 'image',
    url: getFileUrl(workspaceId, filePath),
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

export function remarkWikiLinks(workspaceId) {
  return async function transformer(tree) {
    if (!workspaceId) {
      console.warn('No workspace ID provided to remarkWikiLinks plugin');
      return;
    }

    const baseUrl = window.API_BASE_URL;
    const replacements = new Map();

    // Find all wiki links
    visit(tree, 'text', function (node) {
      const regex = /(!?)\[\[(.*?)\]\]/g;
      let match;
      const matches = [];

      while ((match = regex.exec(node.value)) !== null) {
        const [fullMatch, isImage, innerContent] = match;
        let fileName, displayText, heading;

        // Parse the inner content
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
        replacements.set(node, matches);
      }
    });

    // Process all matches
    for (const [node, matches] of replacements) {
      const children = [];
      let lastIndex = 0;

      for (const match of matches) {
        // Add text before the match
        if (match.index > lastIndex) {
          children.push({
            type: 'text',
            value: node.value.slice(lastIndex, match.index),
          });
        }

        try {
          // Add .md extension for non-image files if they don't have an extension
          const lookupFileName = match.isImage
            ? match.fileName
            : addMarkdownExtension(match.fileName);

          const paths = await lookupFileByName(workspaceId, lookupFileName);

          if (paths && paths.length > 0) {
            const filePath = paths[0];
            if (match.isImage) {
              children.push(
                createImageNode(workspaceId, filePath, match.displayText)
              );
            } else {
              children.push(
                createFileLink(
                  filePath,
                  match.displayText,
                  match.heading,
                  baseUrl
                )
              );
            }
          } else {
            children.push(
              createNotFoundLink(match.fileName, match.displayText, baseUrl)
            );
          }
        } catch (error) {
          // Handle both 404s and other errors by creating a "not found" link
          console.debug('File lookup failed:', match.fileName, error);
          children.push(
            createNotFoundLink(match.fileName, match.displayText, baseUrl)
          );
        }

        lastIndex = match.index + match.fullMatch.length;
      }

      // Add any remaining text
      if (lastIndex < node.value.length) {
        children.push({
          type: 'text',
          value: node.value.slice(lastIndex),
        });
      }

      // Replace the node with new children
      node.type = 'paragraph';
      node.children = children;
      delete node.value;
    }
  };
}
