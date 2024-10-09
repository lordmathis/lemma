import React from 'react';
import { Tree } from 'react-arborist';
import { Group, Text } from '@mantine/core';
import { IconFile, IconFolder, IconFolderOpen } from '@tabler/icons-react';
import { isImageFile } from '../utils/fileHelpers';

const FileIcon = ({ isFolder, isOpen }) => {
  if (isFolder) {
    return isOpen ? (
      <IconFolderOpen size={16} color="var(--mantine-color-yellow-filled)" />
    ) : (
      <IconFolder size={16} color="var(--mantine-color-yellow-filled)" />
    );
  }
  return <IconFile size={16} />;
};

const Node = ({ node, style, dragHandle }) => {
  const isFolder = Array.isArray(node.data.children);

  return (
    <Group
      ref={dragHandle}
      style={style}
      pl={node.level * 20}
      py={4}
      onClick={() => node.toggle()}
      sx={(theme) => ({
        cursor: 'pointer',
        '&:hover': {
          backgroundColor:
            theme.colorScheme === 'dark'
              ? theme.colors.dark[6]
              : theme.colors.gray[0],
        },
      })}
    >
      <FileIcon isFolder={isFolder} isOpen={node.isOpen} />
      <Text size="sm">{node.data.name}</Text>
    </Group>
  );
};

const FileTree = ({ files, handleFileSelect }) => {
  const handleNodeClick = (node) => {
    if (!node.isInternal) {
      handleFileSelect(node.data.path);
    }
  };

  return (
    <Tree
      data={files}
      openByDefault={false}
      width="100%"
      height={400} // Adjust this value as needed
      indent={24}
      rowHeight={28}
      onActivate={handleNodeClick}
    >
      {Node}
    </Tree>
  );
};

export default FileTree;
