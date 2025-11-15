import React, { useRef, useState } from 'react';
import { Box } from '@mantine/core';
import { Tree, type NodeApi } from 'react-arborist';
import {
  IconFolder,
  IconFolderOpen,
  IconChevronRight,
} from '@tabler/icons-react';
import useResizeObserver from '@react-hook/resize-observer';
import { filterToFolders } from '../../utils/fileTreeUtils';
import type { FileNode } from '@/types/models';

interface FolderSelectorProps {
  files: FileNode[];
  selectedPath: string;
  onSelect: (path: string) => void;
}

interface Size {
  width: number;
  height: number;
}

const useSize = (
  target: React.RefObject<HTMLElement | null>
): Size | undefined => {
  const [size, setSize] = useState<Size>();

  useResizeObserver(target, (entry) => setSize(entry.contentRect));
  return size;
};

// Node component for rendering folders
function FolderNode({
  node,
  style,
  selectedPath,
  onSelect,
}: {
  node: NodeApi<FileNode>;
  style: React.CSSProperties;
  selectedPath: string;
  onSelect: (path: string) => void;
}) {
  const isSelected = node.data.path === selectedPath;
  const hasChildren = node.children && node.children.length > 0;

  const handleClick = () => {
    onSelect(node.data.path);
  };

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    node.toggle();
  };

  return (
    <div
      style={{
        ...style,
        paddingLeft: `${node.level * 16 + 8}px`,
        paddingRight: '8px',
        paddingTop: '4px',
        paddingBottom: '4px',
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        backgroundColor: isSelected
          ? 'var(--mantine-color-blue-filled)'
          : 'transparent',
        color: isSelected ? 'var(--mantine-color-white)' : 'inherit',
        borderRadius: '4px',
        transition: 'background-color 0.1s ease, color 0.1s ease',
      }}
      onClick={handleClick}
      title={node.data.name}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor =
            'var(--mantine-color-default-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      {/* Chevron for folders with children */}
      {hasChildren && (
        <IconChevronRight
          size={14}
          onClick={handleChevronClick}
          style={{
            marginRight: '4px',
            transform: node.isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            flexShrink: 0,
          }}
        />
      )}
      {/* Spacer for items without chevron */}
      {!hasChildren && <div style={{ width: '18px', flexShrink: 0 }} />}

      {/* Folder icon */}
      {node.isOpen ? (
        <IconFolderOpen
          size={16}
          color={
            isSelected
              ? 'var(--mantine-color-white)'
              : 'var(--mantine-color-yellow-filled)'
          }
          style={{ flexShrink: 0 }}
        />
      ) : (
        <IconFolder
          size={16}
          color={
            isSelected
              ? 'var(--mantine-color-white)'
              : 'var(--mantine-color-yellow-filled)'
          }
          style={{ flexShrink: 0 }}
        />
      )}

      {/* Name */}
      <span
        style={{
          marginLeft: '8px',
          fontSize: '14px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flexGrow: 1,
        }}
      >
        {node.data.name}
      </span>
    </div>
  );
}

// Root node component
function RootNode({
  isSelected,
  onSelect,
}: {
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      style={{
        paddingLeft: '8px',
        paddingRight: '8px',
        paddingTop: '4px',
        paddingBottom: '4px',
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        backgroundColor: isSelected
          ? 'var(--mantine-color-blue-filled)'
          : 'transparent',
        color: isSelected ? 'var(--mantine-color-white)' : 'inherit',
        borderRadius: '4px',
        transition: 'background-color 0.1s ease, color 0.1s ease',
        marginBottom: '4px',
      }}
      onClick={onSelect}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor =
            'var(--mantine-color-default-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      <div style={{ width: '18px', flexShrink: 0 }} />
      <IconFolder
        size={16}
        color={
          isSelected
            ? 'var(--mantine-color-white)'
            : 'var(--mantine-color-yellow-filled)'
        }
        style={{ flexShrink: 0 }}
      />
      <span
        style={{
          marginLeft: '8px',
          fontSize: '14px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flexGrow: 1,
        }}
      >
        / (root)
      </span>
    </div>
  );
}

export const FolderSelector: React.FC<FolderSelectorProps> = ({
  files,
  selectedPath,
  onSelect,
}) => {
  const target = useRef<HTMLDivElement>(null);
  const size = useSize(target);

  // Filter to only folders
  const folders = filterToFolders(files);

  // Calculate tree height: root node (32px) + folders
  const rootNodeHeight = 32;
  const treeHeight = size ? size.height - rootNodeHeight : 0;

  return (
    <Box
      ref={target}
      style={{
        maxHeight: '300px',
        height: '300px',
        overflowY: 'auto',
        padding: '8px',
      }}
    >
      {/* Root option */}
      <RootNode
        isSelected={selectedPath === ''}
        onSelect={() => onSelect('')}
      />

      {/* Folder tree */}
      {size && folders.length > 0 && (
        <Tree
          data={folders}
          openByDefault={false}
          width={size.width - 16}
          height={treeHeight}
          indent={24}
          rowHeight={28}
          idAccessor="id"
          disableDrag={() => true}
          disableDrop={() => true}
        >
          {(props) => (
            <FolderNode
              {...props}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          )}
        </Tree>
      )}
    </Box>
  );
};

export default FolderSelector;
